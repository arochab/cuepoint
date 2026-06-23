# Deploy CuePoint to Vercel

CuePoint is a Vite SPA. It deploys cleanly to Vercel, and Supabase auth (Google + email link) works once you mirror your live origin into Supabase's redirect allow-list. The whole analyzer runs in the browser, so the live link is usable the moment the build is green — even before auth is configured.

---

## Prerequisites (10 sec)

This repo **already ships a correct `vercel.json` at the repo root** (verified: `framework: vite`, `outputDirectory: dist`, `buildCommand: npm run build`, an SPA rewrite of `/(.*)` → `/index.html`, and immutable `/assets` cache headers). Vercel honours it automatically, so the dashboard build settings below are mostly auto-filled.

Keep the SPA rewrite as-is. This app routes purely in memory (`let route = $state('home')` in `App.svelte`) and never writes paths to the URL, and its auth `redirectTo` is the bare origin — so the rewrite is just a harmless safety net for a manual hard-refresh, which always lands on `/`. Don't delete it.

---

## Step by step

1. **Push your latest commit** to `github.com/arochab/kapman-toolkit-2` (branch `main`). Vercel deploys whatever is on the branch you import. Confirm `vercel.json`, `package.json` and `vite.config.ts` are committed, and that `.env` / `.env.local` are **not** committed (they're gitignored).
2. Go to <https://vercel.com/new> and sign in with GitHub. Click **Import** next to the `arochab/kapman-toolkit-2` repository (use **Adjust GitHub App Permissions** if the repo isn't listed, then grant Vercel access).
3. On **Configure Project**, confirm: Framework Preset = **Vite** (auto-detected), Build Command = `npm run build`, Output Directory = `dist`, Install Command = `npm install`, Root Directory = `./`. Set Node version to **20.x** under Project Settings if it doesn't default there.
4. Expand **Environment Variables** and add two:
   - `VITE_SUPABASE_URL` = your `https://<ref>.supabase.co` value
   - `VITE_SUPABASE_KEY` = your Supabase **publishable** key (`sb_publishable_...`)

   Apply both to **Production, Preview and Development**. They're `VITE_`-prefixed, so they're baked into the browser bundle at build time — public-safe, because access is gated by RLS.
5. Click **Deploy**. Wait ~1–2 min. When it finishes you get a public URL — e.g. `https://<your-vercel-project>.vercel.app`. The app is fully usable here immediately — drop a track → get a verdict — even before auth is configured, because all DSP is local and an account is optional.
6. **Copy the exact production origin** (e.g. `https://<your-vercel-project>.vercel.app`, **no trailing slash**). You'll paste it into Supabase next so sign-in works. If you skip this, analysis still works for everyone, but Google/email login will fail on the live site.
7. **Put the live URL in the README.** Replace the `{{LIVE_URL}}` placeholder in `README.md` with your real production origin so the "Open the live app" link works.
8. Do the Supabase redirect config (below). Then hard-refresh the live site and run the verify checklist.

---

## Environment variables

| Variable | Value | Where to find it |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` | Supabase Dashboard → Project Settings → Data API → Project URL |
| `VITE_SUPABASE_KEY` | `sb_publishable_xxxxxxxx` | Supabase Dashboard → Project Settings → API Keys → Publishable |

- The client (`src/lib/supabase/client.ts`) reads `VITE_SUPABASE_KEY` first and falls back to the legacy `VITE_SUPABASE_ANON_KEY`. Prefer `VITE_SUPABASE_KEY` to match `.env.example`.
- These are **build-time** vars (Vite inlines `VITE_*` at build). After adding or changing them in Vercel you **must** trigger a fresh deploy (Deployments → … → Redeploy); editing them does not hot-update an existing build.
- **Never** put the Supabase `service_role` / secret key in a `VITE_` var — that would ship a full-access key to every browser.

---

## Supabase redirect config

1. Open Supabase Dashboard → your project → **Authentication → URL Configuration**.
2. Set **Site URL** to your exact Vercel production origin, **no trailing slash, no path** — e.g. `https://<your-vercel-project>.vercel.app`.
3. Under **Redirect URLs**, click **Add URL** and add the exact production origin. The app calls `signInWithOAuth` / `signInWithOtp` with `redirectTo = window.location.origin` (the **bare origin**), so the bare origin **must** be in the allow-list.
4. Add a wildcard so Vercel **preview** deployments work too: `https://<your-vercel-project>-*.vercel.app` (and optionally the broader `https://*.vercel.app`). Without this, sign-in works on production but breaks on preview URLs.
5. If you later attach a custom domain in Vercel, add that origin under Redirect URLs too.
6. **Google sign-in specifically:** in Google Cloud Console → APIs & Services → Credentials → your OAuth 2.0 Client, the only **Authorized redirect URI** that matters is Supabase's callback: `https://<ref>.supabase.co/auth/v1/callback` (**not** the Vercel domain). The Vercel origin belongs **only** in Supabase's Redirect URLs list. People mix these two up — keep them separate.
7. Click **Save**. Supabase URL changes apply immediately; no app redeploy needed for them.

---

## Gotchas

- **`vercel.json` already exists and is correct** — don't add a second one or remove it.
- **`VITE_*` vars are inlined at build time**, not read at runtime. Setting/changing them after a deploy does nothing until you **redeploy**.
- **Trailing-slash trap.** The app uses `window.location.origin` (no slash). Supabase matches redirect URLs strictly — register the **bare** origin. A trailing-slash mismatch is the #1 cause of "sign-in succeeds then dumps you on a blank/error page".
- **Google callback URI ≠ Vercel redirect URL.** Google Console wants `https://<ref>.supabase.co/auth/v1/callback`; Supabase wants your Vercel origin. Cross-wiring them silently breaks Google login.
- **Use the publishable key** (`sb_publishable_...`) as `VITE_SUPABASE_KEY`. Service keys must never be `VITE_`-prefixed.
- **Auth is optional by design.** If env vars are missing or Supabase URLs aren't configured yet, the app still loads and analyzes tracks locally — only login is affected. Don't block sharing the link on auth being perfect.

---

## Verify checklist

- [ ] **Build is green** — Vercel Deployments tab shows **Ready** for the latest commit.
- [ ] **Public link loads** — open the production URL in a fresh/incognito window. You should see the dark "Silence" single-column room and the breathing Cue droplet animating — no blank page, no console errors about missing Supabase env.
- [ ] **Core loop works without auth** — drop an audio file → analysis runs in-browser → Cue returns **one priority fix in the active UI language** + a recipe. This must work with **no sign-in**.
- [ ] **SPA routing / refresh** — hard-refresh (Ctrl/Cmd-Shift-R); the page reloads instead of 404'ing.
- [ ] **Google sign-in** — Continue with Google → consent → you land back on the live URL signed in. If it errors with `redirect_uri` / "requested path is invalid", re-check the Supabase Redirect URLs (bare origin, no trailing slash) and the Google callback URI.
- [ ] **Email-link sign-in** — enter your email → receive the link → clicking it returns you signed in.
- [ ] **Preview deploy (optional)** — open a Vercel preview URL and confirm sign-in works there too.
