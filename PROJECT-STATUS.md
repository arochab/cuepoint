# PROJECT STATUS

## Current state
Platform baseline complete. Core product flywheel is live.

## "Silence" total redesign (2026-06-23) — creator → tester → hard-judge workflow
User rejected the whole UI ("rien ne va", "je déteste les cartes"). A workflow produced 4
radical zero-card directions, stress-tested them, and a hard judge picked **Silence** (88/100)
— a dark, breathing single-column room, one object on screen, ZERO cards anywhere.
(svelte-check: 0 errors; 1 pre-existing Cue.svelte bind warning.)

- **Tokens re-founded** (app.css @theme): Slate `#16181D` ground, Mist `#E7E4DC` text, ONE
  accent Tide `#36C9D6`. Fraunces (spoken words) + Inter Tight (body) + JetBrains Mono
  (params only). radius=0, shadow=0. `--ease-calm` one curve. Fonts swapped in index.html.
- **Card vocabulary flattened/deleted**: `.surface*/.card*/.recipe-*/.cp-card/.cp-route/.pill/
  .topbar` collapse to transparent/no-border/no-radius; `RecipeList`+`RecipeCard` already gone.
- **Column primitive** (`Column.svelte` + `.column` in app.css) with a `:where(*)` reset that
  makes a stray card impossible inside it; the only decorative element is a 1px `.horizon`.
- **Droplet reshaped** (cueScene.ts): `scene.background=null` (floats on Slate), rot halved,
  bloom ×0.6. Keeps lime/magenta cores so the droplet is the ONLY place colour lives. Deleted
  homeScene.ts. Cue.svelte honours prefers-reduced-motion (static tinted dot).
- **Home** = the door = the dropzone: one Fraunces invitation + whisper, 180px idle droplet,
  whole-screen drop, always-visible Tide door-hint + "je sais déjà" + plain nav. No auth wall.
- **Analyzer** = one breath in a Column: upload → listening (REAL 4-stage stepper, honest
  progress — `analyzeAudio(file, onStage)` yields between DSP phases) → verdict (Mist Fraunces
  WORD with the verdict colour only in the final period + one FR sentence + flush-right honesty
  receipt + guide-moi/les chiffres). Fix = scannable worklist (no card). express + reduced-motion.
- **Cold entry** = typeset contents page of the 5 needs (number gutter, dot-leaders, flush-right
  tag); rows 1-4 → inline recipe worklist via needRoutes, row 5 (ready?) → upload.
- **Projects** = typographic memory timeline from local history (works signed-out), inline
  keep-it sign-in, CRUD demoted to a quiet "+ nouveau". **RecipeDetail** = Column worklist.
- **Nav** = plain always-visible text links (no topbar/pill/brand chip), mobile bottom row.
- **All copy FR** (user decision "tout, tout de suite"): verdict summaries (`issueText.ts`) +
  all 20 recipe goals/notes/native-alts translated; chain params stay in studio English.
- New files: `Column.svelte`, `i18n/index.svelte.ts`, `reco/needRoutes.ts`, `reco/issueText.ts`.

Deferred (flat via token-flattening, not yet bespoke): Admin.svelte, ProjectDetail.svelte,
ShareCard.svelte de-card polish; verdict-word colour intensity; whether the standalone library
ever returns (it should not).

## UX-jury redesign (2026-06-23) — "less is more", App-of-the-Year pass
A ruthless Jobs/Ive/Musk-grade jury audited the REAL running app (avg 52.8/100). The single
gap was a missing *deletion*, not a feature. Verdict executed (svelte-check: 0 errors, 0 warnings):

- **i18n spine built from scratch** (`src/lib/i18n/index.svelte.ts`) — none existed despite an
  earlier claim. FR default (hard-default for the French producer), EN toggle in Nav. Real key
  count, authored for the redesigned screens (need-chips, cold question, verdict, moves, nav,
  home, auth, genres). Svelte 5 rules: exported `$state` object mutated in place, never reassigned.
- **`recipe.need` model** (`RecipeNeed` in types; `needRoutes.ts`) — every recipe tagged with one
  of low-end | phase | top-end | loudness | character. Deterministic need→route matching replaces
  brittle tag-overlap scoring, so Cue cannot bluff a route the DSP can't support. headroom+loudness
  IssueTypes merge into the single 'loudness' need at the routing layer.
- **THE DELETION** — Recipes is no longer a destination. Removed from Nav + Route union + App route;
  `RecipeList.svelte` + `RecipeCard.svelte` deleted (killed the 65-button / 368-div density).
  `RecipeDetail` survives, reached from a verdict or the cold question; Back returns to origin.
- **Path A — The Continuation**: the fix is the next sentence after a verdict ("WALK ME THROUGH THE
  FIX" → STEP 04, one plain-language move line, ONE read-only route card that expands inline, a
  "N more routes" ghost reveal, a character footer link). Cue stays in its verdict mood.
- **Path B — The Question** (cold entry): 5 producer-voice need chips, no search/grid/tags/counter.
  Reached from a quiet "Tu sais déjà ce qui cloche ?" link on the upload screen.
- **Verdict subtracted to ONE thing**: killed the MIX SCORE NN/100 hero, the 3 default stat tiles,
  the euro packs + "FIRST TRACK FREE" CTA suffix. Score/stats/evidence fold into a single quiet
  "More" (score survives only as a whisper there). Paid coach wiring PARKED (returns as later opt-in).
- **Honesty fixes**: removed `Math.random()` live meter and the 520 ms fake-completion delay + 92%
  ceiling. The progress bar reaches 100 only when the DSP result is actually ready.
- **Home front door**: deleted the signed-out sign-up wall (free, no account before the first fix),
  the duplicate eyebrow, and the numbered 00/01/02/03 manifesto (collapsed to one quiet line).
- **De-jargon**: "magic link" wording removed; genre chips + auth localized; "Not sure" → "Pas sûr".

Still open (taste calls deferred): mix-score-whisper vs cut entirely; "ALMOST/PRESQUE" verdict word;
one-route-only vs the reveal; whether the character lane earns its place long-term.

## Stack
- Svelte 5 (Runes: `$state`, `$derived`, `$effect`)
- Vite 6 + `@sveltejs/vite-plugin-svelte` v6
- Tailwind CSS v4 (theme in `src/app.css @theme`, no config file)
- TypeScript 5 (`moduleResolution: bundler`, `skipLibCheck: true`)
- Supabase (`@supabase/supabase-js` v2, email OTP auth)

## Features implemented
- 20 recipes (no standalone library screen — reached via need→route, see UX-jury section)
- Audio analyzer (FFT: peak, RMS, LUFS, true-peak, phase, 64-band spectrum)
- Mix diagnostics (5 issue types with severity, beginner + expert guidance)
- **need→route bridge** (deterministic `recipe.need` matching; replaced tag-overlap scoring)
- Bilingual FR/EN i18n (FR default, EN toggle)
- User favorites and notes (Supabase-persisted, atomic upsert)
- Projects CRUD + checklist + comments + member invites
- Google + email-link authentication (reached via Projects/Workspace, not a Home wall)

## Audit findings (2026-04-01)
Top 7 issues identified, first 3 addressed:
1. [x] Analyzer → recipes gap — implemented tag-overlap suggestion engine
2. [x] Missing `.hero-actions` CSS class — home page CTA buttons now flex-row
3. [x] RecipeCard category pill only activated on "mixing" — all categories now styled

Remaining backlog (ranked):
4. [x] Save-analysis-to-project — snapshot posted as a project comment (verdict, metrics, issues, recipes)
5. [x] No user-visible error states — global toast system added (toast.svelte.ts + Toast.svelte), all silent catch blocks now surface errors; note save + add-to-project also show success confirmation
6. [ ] No post-auth first-step guidance — user lands on home after login with no next step
7. [ ] Recipes hardcoded — can't grow library without a code deploy

## Build setup
- `package.json` — Svelte 5 + Vite 6 + Tailwind v4 + Supabase
- `vite.config.ts` — Tailwind plugin before Svelte plugin
- `tsconfig.json` — strict, bundler resolution, skipLibCheck
- `svelte.config.js` — vitePreprocess
- `index.html` — Vite entry point
- `.env.example` — VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY

## Shipping log
- 2026-04-02: feat/toast-errors closed. Global toast system added. All silent Supabase failures now surface to the user. Build: 317kB JS, 1.38s. check: 0 errors.
- 2026-04-02: feat/save-analysis closed. Analyzer now saves snapshots to project comments. Build: 314kB JS, 1.82s. check: 0 errors.
- 2026-04-01: feat/bootstrap-v2 merged to main, pushed to origin. Build: 311kB JS, 1.29s. check: 0 errors. Deployment config missing — see next step below.

## Deployment status
**BLOCKED**: No Cloudflare Pages project is connected to this repo yet. No wrangler.toml, no GitHub Actions workflow, no Pages integration found. Manual setup required (see below).

## Next phase audit (top 5)
1. **No production deploy path** — CF Pages not connected; site is not live yet.
2. ~~No save-analysis-to-project~~ — DONE (2026-04-02)
3. **Silent failure states** — Supabase errors fail invisibly; user sees nothing.
4. **No post-auth onboarding** — user lands on home after login with zero next-step guidance.
5. **Recipes hardcoded** — library can only grow via code deploy; no CMS or admin layer.

**Highest-leverage next improvement**: Connect Cloudflare Pages → deploy → then tackle save-analysis-to-project (closes the product flywheel: diagnose → recipe → save to project).

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
