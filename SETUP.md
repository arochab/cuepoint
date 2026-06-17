# CuePoint — backend setup

The app runs **fully free without any of this** (upload + first-level analysis + instant rules
coach are 100% client-side). This guide turns on **accounts + the paid AI coach** (1€/track via
credit packs). Everything below is wired in code; you just supply your accounts + keys.

> Security model in one line: the browser never holds a secret. Auth, payment, and the LLM key all
> live behind Supabase Edge Functions. Only a signature-verified Stripe webhook can grant credits.

---

## 1. Supabase (accounts + database)

1. Create a project at supabase.com. Copy the **Project URL** and **anon key** into a local `.env`
   (these are the only public values — `VITE_`-prefixed is fine):
   ```
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key>
   ```
2. **Run the schema:** open Supabase → SQL Editor → paste all of `schema.sql` → Run. It's
   idempotent (safe to re-run). This creates the `analyses`, `entitlements`, `llm_usage` tables,
   the credit columns, and the RPCs (`grant_credits`, `spend_credit`, `consume_coach_run`).
3. **Google sign-in:** Supabase → Auth → Providers → Google → enable. In Google Cloud, create an
   OAuth Web client; set the authorized redirect URI to
   `https://<ref>.supabase.co/auth/v1/callback`. Paste the Google Client ID + Secret into Supabase
   (the secret stays in Supabase, never in the app). In Auth → URL Configuration, add your app
   origin(s) to the redirect allow-list.

## 2. Edge Functions (the server boundary)

Install the Supabase CLI, then from the repo root:
```
supabase functions deploy coach
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook --no-verify-jwt
```
(`stripe-webhook` uses `--no-verify-jwt` because Stripe doesn't send a Supabase JWT — it's secured
by Stripe signature verification instead.)

Set the function secrets (NEVER `VITE_`-prefixed — these are server-only):
```
supabase secrets set \
  SERVICE_ROLE_KEY=<supabase service_role key> \
  LLM_API_KEY=<your Anthropic API key> \
  LLM_MODEL=claude-haiku-4-5-20251001 \
  STRIPE_SECRET_KEY=sk_test_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  ALLOWED_ORIGIN=http://localhost:5173 \
  APP_URL=http://localhost:5173 \
  DAILY_EUR_CEILING=5
```
`SUPABASE_URL` and `SUPABASE_ANON_KEY` are provided to functions automatically by Supabase.

## 3. Stripe (test mode — no real money)

1. Stripe dashboard in **test mode**. Copy the test **secret key** → `STRIPE_SECRET_KEY` above.
2. Webhook: either `stripe listen --forward-to https://<ref>.functions.supabase.co/stripe-webhook`
   (local dev) or add the endpoint in the Stripe test dashboard. Copy that signing secret
   (`whsec_...`) → `STRIPE_WEBHOOK_SECRET`. **The CLI secret and dashboard secret differ — use the
   one matching how you're testing.**
3. Test card: `4242 4242 4242 4242`, any future date, any CVC.

## 4. Cost guardrails (already enforced in code)

- `max_tokens` is bounded server-side (200) — the client can't override it.
- Each purchase has a hard `coach_runs_limit` (cost fuse); runs are consumed atomically.
- `DAILY_EUR_CEILING` stops all coaching once today's logged spend hits the cap ("Cue resting").
- **Also set a hard spend limit in your Anthropic dashboard** — defense in depth.
- The free first-level analysis is DSP-only (zero LLM cost), so free users never cost you money.

## 5. Go live later

Swap test Stripe keys for live keys, set `ALLOWED_ORIGIN`/`APP_URL` to your real domain, redeploy
the functions. Nothing in the client code changes.

---

## What you must provide (checklist)
- [ ] Supabase project (URL + anon key in `.env`, service_role key in secrets)
- [ ] `schema.sql` run in SQL Editor
- [ ] Google OAuth client (ID + secret in Supabase)
- [ ] Anthropic API key (in secrets)
- [ ] Stripe test keys (secret + webhook signing secret in secrets)
