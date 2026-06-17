// Edge Function: create-checkout
// Server-side Stripe Checkout for credit packs. The client may INITIATE payment but never
// grants entitlement - only the webhook does (see stripe-webhook). Verifies the user from JWT.
//
// Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, STRIPE_SECRET_KEY (test), APP_URL.

import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@16";
import { json, corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const APP_URL = Deno.env.get("APP_URL") ?? "http://localhost:5173";

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

// Credit packs (price in cents EUR, credits granted). Keep the "1€/track" story.
const PACKS: Record<string, { cents: number; credits: number; label: string }> = {
  single: { cents: 100, credits: 1, label: "1 track" },
  five:   { cents: 400, credits: 5, label: "5 tracks" },
  twelve: { cents: 800, credits: 12, label: "12 tracks" },
};

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (req.method !== "POST") return json(405, { error: "method" }, origin);

  const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!jwt) return json(401, { error: "no-auth" }, origin);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json(401, { error: "bad-token" }, origin);

  let body: { pack?: string };
  try { body = await req.json(); } catch { return json(400, { error: "bad-json" }, origin); }
  const pack = PACKS[body.pack ?? "single"];
  if (!pack) return json(400, { error: "bad-pack" }, origin);

  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [{
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: pack.cents,
            product_data: { name: `CuePoint - ${pack.label}` },
          },
        }],
        // The webhook reads these to grant credits to the right user.
        metadata: { user_id: user.id, credits: String(pack.credits) },
        success_url: `${APP_URL}/?paid=1`,
        cancel_url: `${APP_URL}/?canceled=1`,
      },
      { idempotencyKey: `${user.id}:${body.pack}:${Math.floor(Date.now() / 60000)}` },
    );
    return json(200, { url: session.url }, origin);
  } catch {
    return json(502, { error: "stripe-failed" }, origin);
  }
});
