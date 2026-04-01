# PROJECT STATUS

## Current state
Platform baseline complete. Core product flywheel is live.

## Stack
- Svelte 5 (Runes: `$state`, `$derived`, `$effect`)
- Vite 6 + `@sveltejs/vite-plugin-svelte` v6
- Tailwind CSS v4 (theme in `src/app.css @theme`, no config file)
- TypeScript 5 (`moduleResolution: bundler`, `skipLibCheck: true`)
- Supabase (`@supabase/supabase-js` v2, email OTP auth)

## Features implemented
- Recipe library (20 recipes, search + filters by category/tag/favorites)
- Audio analyzer (FFT: peak, RMS, LUFS, true-peak, phase, 64-band spectrum)
- Mix diagnostics (5 issue types with severity, beginner + expert guidance)
- **Analyzer → recipe bridge** (tag-overlap scoring surfaces top 3 recipes per diagnosis)
- User favorites and notes (Supabase-persisted, atomic upsert)
- Projects CRUD + checklist + comments + member invites
- Email OTP authentication

## Audit findings (2026-04-01)
Top 7 issues identified, first 3 addressed:
1. [x] Analyzer → recipes gap — implemented tag-overlap suggestion engine
2. [x] Missing `.hero-actions` CSS class — home page CTA buttons now flex-row
3. [x] RecipeCard category pill only activated on "mixing" — all categories now styled

Remaining backlog (ranked):
4. [ ] No save-analysis-to-project — analyzer results are ephemeral
5. [ ] No user-visible error states — silent Supabase failures
6. [ ] No post-auth first-step guidance — user lands on home after login with no next step
7. [ ] Recipes hardcoded — can't grow library without a code deploy

## Build setup
- `package.json` — Svelte 5 + Vite 6 + Tailwind v4 + Supabase
- `vite.config.ts` — Tailwind plugin before Svelte plugin
- `tsconfig.json` — strict, bundler resolution, skipLibCheck
- `svelte.config.js` — vitePreprocess
- `index.html` — Vite entry point
- `.env.example` — VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY

## To run
```bash
npm install
cp .env.example .env   # fill in Supabase credentials
npm run dev
```

## Type check / build
```bash
npm run check   # svelte-check: 161 files, 0 errors
npm run build   # vite build: 311 kB JS, 1.3s
```
