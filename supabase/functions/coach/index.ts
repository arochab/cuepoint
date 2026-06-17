// Edge Function: coach
// The ONLY place the LLM API key lives. Flow (never trusts the client):
//   1. Identify the user from the JWT (auth.getUser), not from the body.
//   2. Verify a PAID entitlement for this analysis (service-role read).
//   3. Enforce a global daily spend ceiling (bankruptcy fuse).
//   4. Call the LLM with a bounded prompt + max_tokens.
//   5. Atomically consume one coach run; log usage. Return the coaching text.
//
// Secrets (Supabase function secrets, NEVER VITE_): SUPABASE_URL, SUPABASE_ANON_KEY,
// SERVICE_ROLE_KEY, LLM_API_KEY, LLM_MODEL, LLM_BASE_URL, DAILY_EUR_CEILING.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { json, corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;
const LLM_API_KEY = Deno.env.get("LLM_API_KEY")!;
const LLM_MODEL = Deno.env.get("LLM_MODEL") ?? "claude-haiku-4-5-20251001";
const LLM_BASE_URL = Deno.env.get("LLM_BASE_URL") ?? "https://api.anthropic.com/v1/messages";
const DAILY_EUR_CEILING = Number(Deno.env.get("DAILY_EUR_CEILING") ?? "5");

// Per-million-token prices (USD) for the model. Defaults are Haiku-class small-model
// rates; override via secrets if you switch models. Cost is computed from the real
// response.usage token counts, never estimated from text length.
const PRICE_IN_PER_MTOK = Number(Deno.env.get("LLM_PRICE_IN") ?? "1.0");
const PRICE_OUT_PER_MTOK = Number(Deno.env.get("LLM_PRICE_OUT") ?? "5.0");
const USD_PER_EUR = Number(Deno.env.get("USD_PER_EUR") ?? "1.08");

const SYSTEM = [
  "You are Cue, a friendly, sharp mixing coach inside the CuePoint app.",
  "You are given a mix diagnosis that was already measured precisely - never invent or change numbers.",
  "Explain it in 2-3 short sentences, warm and encouraging, plain language a beginner gets.",
  "Name the single most important fix and one concrete next step. No jargon dumps, no lists, no preamble.",
  "Never claim to have listened with ears; you read the measurements.",
].join(" ");

function userPrompt(i: Record<string, unknown>): string {
  const a = (i.analysis ?? {}) as Record<string, number>;
  const issues = (i.issues ?? []) as { title: string; severity: string; summary: string }[];
  const lines = [
    `File: ${i.fileName}`,
    `Verdict: ${i.verdict} (${i.safeForDemo ? "safe for a rough share" : "not yet"})`,
    `LUFS ${a.lufsEstimate}, true peak ${a.truePeakEstimate} dBTP, phase ${a.phaseCorrelation}.`,
    `Low ${a.lowEnergy} dB / mid ${a.midEnergy} dB / high ${a.highEnergy} dB.`,
    "Issues:",
    ...issues.map((x) => `- ${x.title} (${x.severity}): ${x.summary}`),
  ];
  if (i.topRecipe) lines.push(`Suggested recipe to point them to: ${i.topRecipe}.`);
  lines.push("Now coach the producer.");
  return lines.join("\n");
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (req.method !== "POST") return json(405, { error: "method" }, origin);

  const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!jwt) return json(401, { error: "no-auth" }, origin);

  // 1) Identify the caller from the verified JWT.
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json(401, { error: "bad-token" }, origin);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json(400, { error: "bad-json" }, origin); }
  // analysisId is no longer required: authorization is by credit balance, not per-analysis
  // entitlement. (Kept in the body for logging/future use, but coaching works without it.)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // 2) Authorization = the user's credit balance, NOT a per-analysis entitlement.
  //    profiles.credits: -1 = unlimited (the 3 admin accounts), >0 = paid packs, 0 = none.
  //    (The old per-analysis entitlement gate never matched - analysis_id was always NULL
  //    on webhook-created rows - so every paying user got 402. Credits are the real ledger:
  //    the Stripe webhook tops them up, admins are seeded at -1.)
  const { data: prof } = await admin
    .from("profiles").select("credits, banned").eq("id", user.id).maybeSingle();
  if (!prof) return json(402, { error: "payment-required" }, origin);
  if (prof.banned) return json(403, { error: "banned" }, origin);           // banned never reach the model
  const unlimited = prof.credits === -1;
  if (!unlimited && prof.credits <= 0) return json(402, { error: "payment-required" }, origin);

  // 3) Daily spend ceiling (sum today's logged cost). The fuse against a key leak.
  //    (app_limits + record_spend is the authoritative atomic gate; this is a cheap pre-check.)
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data: spendRows } = await admin
    .from("llm_usage").select("cost_eur").gte("created_at", since);
  const spentToday = (spendRows ?? []).reduce((s, r) => s + Number(r.cost_eur ?? 0), 0);
  if (spentToday >= DAILY_EUR_CEILING) return json(503, { error: "coach-resting" }, origin);

  // 4) Call the LLM (bounded). Anthropic Messages API shape.
  let coaching = "";
  let tokensIn = 0, tokensOut = 0;
  let requestId: string | null = null;
  try {
    const r = await fetch(LLM_BASE_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": LLM_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        max_tokens: 200,
        system: SYSTEM,
        messages: [{ role: "user", content: userPrompt(body) }],
      }),
    });
    if (!r.ok) return json(502, { error: "llm-failed" }, origin);
    requestId = r.headers.get("request-id");
    const data = await r.json();
    coaching = (data.content?.[0]?.text ?? "").trim();
    tokensIn = data.usage?.input_tokens ?? 0;
    tokensOut = data.usage?.output_tokens ?? 0;
  } catch {
    return json(502, { error: "llm-error" }, origin);
  }

  // Real cost from the actual token usage (never estimated from text length).
  const costUsd = (tokensIn / 1_000_000) * PRICE_IN_PER_MTOK + (tokensOut / 1_000_000) * PRICE_OUT_PER_MTOK;
  const costEur = costUsd / USD_PER_EUR;

  // 5) Spend exactly one credit, server-side and atomically. spend_credit treats -1 as
  //    unlimited (admins never decrement) and only succeeds when a credit was available
  //    (credits > 0 OR -1). This is the single source of truth - the client no longer
  //    decrements anything, so a failed/closed coach can never overcharge the user.
  const { data: charged } = await admin.rpc("spend_credit", { p_user: user.id });
  if (!charged && !unlimited) return json(402, { error: "payment-required" }, origin);

  // Log usage to both ledgers and advance the global daily-spend fuse.
  await admin.from("llm_usage").insert({
    user_id: user.id, tokens_in: tokensIn, tokens_out: tokensOut, cost_eur: costEur,
  });
  await admin.from("usage_events").insert({
    user_id: user.id, model: LLM_MODEL, prompt_tokens: tokensIn, completion_tokens: tokensOut,
    cost_usd: costUsd, request_id: requestId,
  });
  await admin.rpc("record_spend", { p_cost_usd: costUsd }); // advances app_limits.daily_spend_usd

  return json(200, { coaching }, origin);
});
