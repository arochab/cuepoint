<h1 align="center">CuePoint</h1>

<p align="center">
  <b>The track is <i>almost</i> there. Something's off — and you can't name it.</b><br>
  Drop it here instead of opening ten tabs. Get back <i>one</i> honest fix, then the exact plugin chain.
</p>

<p align="center">
  A real DSP listens to your bounce <b>entirely in the browser</b> — LUFS, true peak, phase, spectrum — and Cue<br>
  names the single priority move in plain producer French. Your audio never leaves your machine. No bluffing.
</p>
<p align="center">
  <sub>The analyzer, the verdict and the rule-based coaching are <b>free and 100% local</b>. An optional AI coach (deeper, LLM-written) is a paid cloud add-on — see <a href="#monetization--architecture">Monetization</a>.</sub>
</p>

<p align="center">
  <a href="https://cuepoint-mu.vercel.app"><img alt="Live demo" src="https://img.shields.io/badge/▶_live_demo-cuepoint--mu.vercel.app-36C9D6?style=for-the-badge"></a>
</p>

<p align="center">
  <a href="https://github.com/arochab/cuepoint/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/arochab/cuepoint/actions/workflows/ci.yml/badge.svg"></a>
  <img alt="License" src="https://img.shields.io/badge/license-MIT-D4A27F">
  <img alt="Built with Claude Code" src="https://img.shields.io/badge/built%20with-Claude%20Code-CC785C">
</p>

<p align="center">
  <a href="https://cuepoint-mu.vercel.app"><b>→ Open the live app</b></a> ·
  <a href="https://github.com/arochab/cuepoint">Source</a>
</p>

<p align="center">
  <img src="assets/demo.gif" alt="Cue — the living, audio-reactive liquid-glass droplet listening to a track" width="440">
</p>

<p align="center">
  <sub>Built solo by <a href="https://github.com/arochab"><b>Adam Chabbi</b></a> (@arochab) — product engineer working at the edge of agentic dev and audio DSP.</sub>
</p>

---

## A from-scratch DSP, in the browser

CuePoint runs a real signal-analysis pass on your track — **no upload, no server, no Web Audio shortcuts.** A hand-written radix-2 FFT, ITU-R BS.1770-4 gated LUFS, a 4×-oversampled true peak, phase correlation and a bandwidth-normalized 1/3-octave spectrum, all in an `OfflineAudioContext`. Then it does the hard part: it says the **one** thing to fix first, in the voice of a producer who's been there, and hands you the plugin chain.

**The rule baked into all of it: Cue can't bluff.** Six measured things map to five producer needs, and a fix is offered *only* when a measurement supports it — the routing is structural, not a vibe. Under every verdict sits an **honesty receipt** with the raw numbers Cue heard. Every claim in the table below is a clickable source file, and the DSP is **validated by a golden-value test suite** (`npm test`).

| Cue hears | The real measurement | Source |
|---|---|---|
| **Loudness** | ITU-R **BS.1770-4** integrated LUFS — K-weighting, 400 ms blocks @ 100 ms hop, two-stage gating | [`audio.ts`](src/lib/utils/audio.ts) |
| **Headroom** | **4×-oversampled** Lanczos true peak (dBTP) — inter-sample, not sample peak* | [`audio.ts`](src/lib/utils/audio.ts) |
| **Spectrum** | **Welch-averaged 1/3-octave** spectrum (Hann), **bandwidth-normalized**, on a hand-written **radix-2 FFT** | [`audio.ts`](src/lib/utils/audio.ts) |
| **Balance** | **regression-fit** spectral tilt (white ≈ 0, pink ≈ −3 dB/oct, asserted in tests) | [`audio.ts`](src/lib/utils/audio.ts) |
| **Phase** | whole-file **Pearson** correlation + a worst-400 ms-window scan (catches a section that collapses in mono) — the exact `computePhaseCorrelation()` the tests assert | [`audio.ts`](src/lib/utils/audio.ts) |
| **No bluff** | 6 issue types → 5 needs; recipes route off an explicit `recipe.need` field, no overlap scoring | [`needRoutes.ts`](src/lib/reco/needRoutes.ts) |

<sub>* True peak uses 4× windowed-sinc oversampling — a practical approximation of BS.1770-4 Annex 2. It is sine-exact in tests and tuned not to false-clip hard-edged masters; it may read slightly under a spec-grade 8×/FIR meter on the very hottest material.</sub>

<p align="center">
  <img src="assets/shot-verdict-presque.png" alt="Verdict PRESQUE — one fix and the honesty receipt" width="46%">
  &nbsp;
  <img src="assets/shot-verdict-pasencore.png" alt="Verdict PAS ENCORE — true peak over the ceiling" width="46%">
</p>
<p align="center"><sub><b>PRESQUE</b> — almost there, here's the one move &nbsp;·&nbsp; <b>PAS ENCORE</b> — not yet, here's why</sub></p>

## How it works

```
  your .wav/.mp3  ──►  OfflineAudioContext (decode, in-browser)
        │
        ▼  src/lib/utils/audio.ts   (100% client-side · nothing uploaded)
  ┌──────────────────────────────────────────────────────────┐
  │ BS.1770-4 LUFS · 4× true peak · windowed phase            │
  │ Welch 1/3-oct FFT · spectral tilt · RMS envelope          │
  └──────────────────────────────────────────────────────────┘
        │  metrics → one priority need   (score.ts · genre-aware)
        ▼
   needRoutes.ts  ──►  the matching plugin-chain recipe
   (low-end · phase · top-end · loudness · ready?)   (deterministic · no bluff)
```

1. **The browser is the only machine.** `analyzeAudio()` decodes into an `OfflineAudioContext` and runs the full DSP locally, yielding a stage callback that drives an *honest* 4-step progress bar (decode → loudness → true peak → spectrum) — it reaches 100% only when the result is actually ready.
2. **Metrics become needs, not guesses.** Numbers are read **genre-aware** into a verdict and a single priority issue — so "too loud" or "low end's too heavy" means *for this style*, and a verdict and its fix card can never contradict each other.
3. **Needs route to recipes structurally.** `suggestionsForIssues()` filters the **20 recipes** by their explicit `need`, returning only routes the DSP can back. Each is a real chain (e.g. FabFilter Pro-Q 3 → Pro-C 2 → D16 Devastor 2 → Pro-L 2) with an Ableton-native alternative.

Tuned for the music it serves — deep house, minimal, techno, dub techno, electro, acid, UK garage and ambient — each with its own target zones.

## Built with Claude Code, used adversarially

This was built with Claude Code using multi-agent workflows pointed at my *own* work — not to generate code unchecked, but to stress-test it. Two stories:

- **An agent hallucinated a scene architecture that did not exist in the codebase** (a `worldScene.ts` / `sceneState` that were never there). It was caught by diffing the claim against the real file tree, and its output was discarded — which is exactly why it leaves no commit. The takeaway that shaped everything after: agent output is verified against real code, never trusted blindly. The whole final-jury loop below exists because of this.
- **Honesty became an engineering invariant.** A `Math.random()` "live meter" and a faked 95%-then-snap progress bar were found and deleted — the bar now reaches 100% only when the DSP result is ready. The no-bluff `recipe.need` routing and the genre-aware verdict exist *because* a review pass proved the old code could promise a fix the measurement couldn't back. The DSP audit even cleared a suspected LUFS bug by reproducing the math, rather than "fixing" correct code.

Part of the same body of work: [claude-eats-tokens](https://github.com/arochab/claude-eats-tokens) · [kapman-news](https://github.com/arochab/kapman-news) · [prism](https://github.com/arochab/prism) · [brandpulse-app](https://github.com/arochab/brandpulse-app).

## Monetization & architecture

CuePoint is **free where it counts and paid only where it costs me money.** Two coaching tiers, one honest line between them:

- **Free, 100% local** — the DSP, the verdict, the honesty receipt, the plugin-chain recipes, and a **rule-based coach** ([`rulesProvider.ts`](src/lib/coach/rulesProvider.ts)) that turns the measured numbers into guidance with zero network calls. Your audio is decoded in an `OfflineAudioContext` and **never leaves your machine** — there is no upload, ever.
- **Optional paid AI coach** — a deeper, LLM-written coach behind a tiny **Stripe** credit system (EUR packs, 1 credit ≈ 1 track). It's a thin server because it has to be: a Supabase Edge Function ([`coach`](supabase/functions/coach/index.ts)) proxies the model, meters token cost, enforces a **daily spend ceiling**, and returns `402 payment-required` when you're out of credits ([`serverProvider.ts`](src/lib/coach/serverProvider.ts) surfaces the paywall). Checkout and entitlement live in [`create-checkout`](supabase/functions/create-checkout/index.ts) + [`stripe-webhook`](supabase/functions/stripe-webhook/index.ts), and an [`Admin`](src/lib/components/Admin.svelte) dashboard tracks spend-vs-cap with a coaching kill-switch.

So: **the analyzer is free and serverless; only the AI coach is a paid cloud add-on.** Nothing about your audio is sent anywhere in either tier — the paid path sends the *derived numbers*, never the file.

## Design — "Silence"

Not a theme on top of an app; the app *is* the design.

- **One room, zero cards.** A dark single-column space — Slate `#16181D` ground, Mist text — with one accent: Tide cyan `#36C9D6`. `radius: 0`, `shadow: 0`, one easing curve. A `:where(...)` reset strips background, border, shadow, radius and padding off every legacy card class, so cards can't creep back in.
- **Type as voice.** Fraunces serif speaks the verdicts; Inter Tight runs the UI; JetBrains Mono is reserved strictly for plugin/param strings.
- **Colour means something.** It lives in exactly one place — the droplet — so a verdict hue carries weight: cyan = one fix, lime = ship it, magenta = needs work. "Cue" is a real Three.js liquid-glass object: a GLSL simplex-noise **vertex-displacement** shader + Fresnel rim + bloom, pulsing to your track's **real RMS envelope** (never `Math.random()`). `prefers-reduced-motion` skips WebGL for a static, on-brand fallback.

## Tech stack

**Svelte 5** runes (module state in `.svelte.ts`, exported `$state` mutated in place) · **Vite 6** · **Tailwind v4** (`@theme`, no config file) · **TypeScript 5** strict — `svelte-check`: 0 errors · **Vitest** golden-value DSP tests · **Three.js** custom shader via `onBeforeCompile`, lazy-loaded chunk so first paint stays light · **Supabase** Google + email-link auth, RLS-gated track *memory* (derived numbers only, never audio) + **Edge Functions** (Deno) for the paid coach · **Stripe** Checkout + webhook for the credit system · **Vercel** static SPA · **i18n** FR default + EN (built for a French producer first — the bilingual layer is real, not a stub).

## Run it locally

```bash
# Node 22+ (svelte-check 4.4+ needs module.registerHooks); see .nvmrc
git clone https://github.com/arochab/cuepoint.git
cd cuepoint
npm install

# Supabase is OPTIONAL — the analyzer works fully signed-out.
# Fill these in only for Google / email-link auth + saved track memory.
cp .env.example .env
#   VITE_SUPABASE_URL=https://your-project.supabase.co
#   VITE_SUPABASE_KEY=sb_publishable_xxxxxxxx   (legacy VITE_SUPABASE_ANON_KEY also works)

npm run dev      # → http://localhost:5173
npm test         # golden-value DSP suite (vitest)
npm run check    # svelte-check (TypeScript)
npm run build    # → dist/  (Vercel: framework "vite", output "dist")
```

The DSP, the droplet and the verdict all work with **no `.env` at all** — Supabase only adds saved track memory.

## Repo map

```
src/lib/utils/audio.ts        the DSP — FFT, BS.1770-4 LUFS, 4× true peak, spectrum, RMS envelope
src/lib/utils/audio.test.ts   golden-value DSP tests (true peak, LUFS, phase, tilt)
src/lib/reco/score.ts         metrics → verdict + genre-aware band reads
src/lib/reco/diagnostics.ts   metrics → the fix cards (pure, unit-tested no-bluff layer)
src/lib/reco/needRoutes.ts    deterministic need → recipe routing (the anti-bluff layer)
src/lib/reco/issueText.ts     producer-voice FR/EN verdict copy + honesty receipt
src/lib/data/recipes.ts       20 plugin-chain recipes (+ Ableton-native alternatives)
src/lib/coach/rulesProvider.ts   FREE local coach — measured numbers → guidance, no network
src/lib/coach/serverProvider.ts  PAID coach client — calls the Edge Function, surfaces the 402 paywall
src/lib/cue/cueScene.ts       the Three.js liquid-glass droplet (real shader + RMS reactivity)
src/lib/i18n/index.svelte.ts  FR-default bilingual dictionary (runes module state)
src/lib/components/Admin.svelte  credits dashboard — spend-vs-cap + coaching kill-switch
src/App.svelte                in-memory router (Home · Analyzer · Projects · Auth · Admin)
supabase/functions/coach/        Deno Edge Function — LLM proxy, token metering, daily ceiling, 402
supabase/functions/create-checkout/  Stripe Checkout for EUR credit packs
supabase/functions/stripe-webhook/   Stripe webhook → grants entitlements
.github/workflows/ci.yml      check + test + build on every push
vercel.json                   SPA rewrite + immutable asset caching
```

## License

[MIT](LICENSE) · Built by [Adam Chabbi](https://github.com/arochab) (@arochab).
