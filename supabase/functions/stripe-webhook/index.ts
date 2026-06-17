// Edge Function: stripe-webhook
// The ONLY component that grants paid credits. It verifies the Stripe signature (raw body),
// is idempotent on the event id, and writes via service-role (RLS gives clients no write).
// A forged "payment succeeded" POST is rejected at signature verification.
//
// Secrets: SUPABASE_URL, SERVICE_ROLE_KEY, STRIPE_SECRET_KEY (test), STRIPE_WEBHOOK_SECRET (test).
// NOTE: this endpoint must be deployed with JWT verification DISABLED (Stripe has no Supabase JWT):
//   supabase functions deploy stripe-webhook --no-verify-jwt

import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@16";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("no signature", { status: 400 });

  const raw = await req.text(); // RAW body required for signature verification
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, WEBHOOK_SECRET);
  } catch {
    return new Response("bad signature", { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return new Response("ignored", { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const userId = session.metadata?.user_id;
  const credits = Number(session.metadata?.credits ?? "0");
  if (!userId || credits <= 0) return new Response("no metadata", { status: 200 });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Idempotency: record the event id; if it already exists, do nothing.
  const { error: dupeErr } = await admin
    .from("entitlements")
    .insert({
      user_id: userId,
      status: "paid",
      source: "stripe",
      stripe_event_id: event.id,
      coach_runs_limit: credits * 20, // each track-credit = a bounded coaching budget
    });
  // Unique violation on stripe_event_id => already processed; safe to ack.
  if (dupeErr && !String(dupeErr.message).includes("duplicate")) {
    return new Response("db error", { status: 500 });
  }

  // Grant credits on the profile (idempotent guard: only if this event is the new one).
  if (!dupeErr) {
    await admin.rpc("grant_credits", { p_user: userId, p_credits: credits }).catch(async () => {
      // Fallback if RPC absent: best-effort increment.
      const { data: prof } = await admin.from("profiles").select("credits").eq("id", userId).maybeSingle();
      await admin.from("profiles").update({ credits: (prof?.credits ?? 0) + credits }).eq("id", userId);
    });
  }

  return new Response("ok", { status: 200 });
});
