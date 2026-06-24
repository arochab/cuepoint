<script lang="ts">
  import { analyzeAudio, getRecommendations, ANALYSIS_STAGES, type AnalysisStage } from '../utils/audio.js';
  import type { AudioAnalysis } from '../utils/audio.js';
  import type { Recipe, Project, RecipeNeed } from '../types/index.js';
  import { issueSummary, honestyReceipt } from '../reco/issueText.js';
  import { addProjectComment, saveAnalysis, getCredits, startCheckout } from '../utils/db.js';
  import Cue from './Cue.svelte';
  import ShareCard from './ShareCard.svelte';
  import { rulesProvider } from '../coach/rulesProvider.js';
  import { serverProvider, setCoachAnalysisId } from '../coach/serverProvider.js';
  import type { IssueType } from '../reco/issueTypes.js';
  import { recordAnalysis, compareToLast, type AnalysisRecord, type MemoryReadout } from '../progress/history.js';
  import { GENRES, lastGenre, rememberGenre, type GenreId } from '../reco/genres.js';
  import { scoreMix, type MixScore } from '../reco/score.js';
  // Deterministic need→route bridge (replaces brittle tag-overlap scoring). Cue can
  // only ever hand over a route the DSP supports — see needRoutes.ts.
  import { suggestionsForIssues, characterRoutes, bestRouteForNeed, DIAGNOSTIC_NEEDS } from '../reco/needRoutes.js';
  import { i18n, t } from '../i18n/index.svelte.js';

  let {
    onOpenRecipe,
    onNavigate,
    user = null,
    projects = [],
    pendingFile = null,
    onConsumedFile
  }: {
    onOpenRecipe?: (id: string) => void;
    onNavigate?: (route: 'projects') => void;
    user?: { id: string; email?: string } | null;
    projects?: Project[];
    pendingFile?: File | null;
    onConsumedFile?: () => void;
  } = $props();

  // A file handed over from Home (the drop happened there) is analyzed immediately.
  $effect(() => {
    if (pendingFile) {
      const f = pendingFile;
      onConsumedFile?.();
      void runAnalysis(f);
    }
  });

  // Genre is asked ONCE, up front (chip row). Pre-selected from last time as a kindness.
  let genre = $state<GenreId | null>(lastGenre());

  // HONEST droplet reactivity: a real loudness value [0..1] fed to <Cue energy>. During
  // listening it climbs with real stage progress; on the verdict reveal it plays back the
  // track's REAL RMS envelope once (a short "this is what Cue heard" pulse). Never random.
  let liveEnergy = $state(0);
  let envTimer: ReturnType<typeof setInterval> | undefined;
  function playEnvelope(env: number[]) {
    if (envTimer) clearInterval(envTimer);
    if (!env?.length) return;
    let i = 0;
    const stepMs = Math.max(16, Math.round(1600 / env.length)); // ~1.6s sweep through the track
    envTimer = setInterval(() => {
      liveEnergy = env[i] ?? 0;
      i++;
      if (i >= env.length) { clearInterval(envTimer); envTimer = undefined; liveEnergy = 0; }
    }, stepMs);
  }

  let file = $state<File | null>(null);
  let result = $state<AudioAnalysis | null>(null);
  let loading = $state(false);
  let error = $state('');

  // HONEST listening stepper — the 4 named stages map 1:1 to real DSP phases reported by
  // analyzeAudio's onStage callback. The progress hairline width = stagesDone / total, so
  // it reflects true completion, never a faked ceiling.
  const STAGE_KEY: Record<AnalysisStage, string> = {
    decode: 'an.stageDecode', loudness: 'an.stageLoudness', truepeak: 'an.stageTruepeak', spectrum: 'an.stageSpectrum'
  };
  let stageDone = $state(0);      // 0..ANALYSIS_STAGES.length
  let currentStage = $state<AnalysisStage | null>(null);

  // Premium motion has two escape hatches: reduced-motion (OS setting) + express (the
  // iterative bounce loop — same track re-analyzed collapses the ceremony to near-instant).
  const reduceMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let express = $state(false);

  // The interpreted result (genre-aware). Single source for verdict, score, face, bands.
  let mix = $state<MixScore | null>(null);
  let memory = $state<MemoryReadout | null>(null);

  // Progressive disclosure: the default verdict is ONE thing. Everything numeric folds
  // into a single quiet "More" reveal (the jury killed the score hero + stat tiles + the
  // evidence grid from the default path). showFix drives Path A — The Continuation.
  let showMore = $state(false);     // single fold: score whisper + stats + evidence
  let showShare = $state(false);
  let showFix = $state(false);      // Path A: the fix is the next sentence after the verdict
  let showMoreRoutes = $state(false); // reveal suggestions[1..2]
  let expandedRoute = $state<string | null>(null); // inline-expand a route's steps
  let showCharacter = $state(false); // browse-only character lane (taste, never a verdict)
  let showCold = $state(false);      // Path B: the cold-entry need-question

  // The 4 diagnostic need-chips shown cold (low-end, phase, top-end, loudness). The 5th
  // chip ("ready?") is rendered separately and routes to upload — it is a verdict, not a route.
  const COLD_NEEDS: RecipeNeed[] = DIAGNOSTIC_NEEDS;

  // Cold-door chip → the single best route for that need (deterministic, no scoring).
  function pickNeed(need: RecipeNeed) {
    const route = bestRouteForNeed(need);
    if (route && onOpenRecipe) { showCold = false; onOpenRecipe(route.id); }
  }

  // Save-to-project state
  let selectedProjectId = $state('');
  let savingSnapshot = $state(false);
  let snapshotSaved = $state(false);
  let snapshotError = $state('');

  // Coach state. The AI coach is OPTIONAL and on-demand; the DSP diagnosis is the truth.
  // PARKED (jury decision): the coach + paid packs no longer surface AT the verdict moment
  // — money must not appear mid-sentence. The wiring stays so paid AI coaching can return
  // as a deliberate, later opt-in (v2), but it has no UI entry point on the verdict today.
  let coachText = $state('');
  let coachBusy = $state(false);
  let coachStage = $state('');
  let coachUsedAI = $state(false);

  // Paid-coach state (parked alongside the coach — see note above).
  let savedAnalysisId = $state<string | null>(null);
  let credits = $state(0);
  let showPacks = $state(false);
  let buying = $state(false);

  function coachInputFrom() {
    if (!result || !diagnostics || !mix) return null;
    return {
      fileName: file?.name ?? 'your track',
      analysis: result,
      verdict: mix.verdictWord,
      safeForDemo: diagnostics.safeForDemo,
      issues: diagnostics.issues.map(i => ({ title: i.title, severity: i.severity, summary: i.summary })),
      topRecipe: diagnostics.suggestions[0]?.title,
      genre: genre ?? 'unspecified'
    };
  }

  async function askCoach(useAI: boolean) {
    if (coachBusy) return;
    const input = coachInputFrom();
    if (!input) return;

    if (!useAI) {
      coachBusy = true; coachText = ''; coachUsedAI = false;
      try { coachText = await rulesProvider.explain(input); }
      finally { coachBusy = false; }
      return;
    }
    if (!user) { showPacks = true; return; }
    // credits === -1 = unlimited (admins). Only block when a normal user has none left.
    const unlimited = credits === -1;
    if (!unlimited && credits <= 0) { showPacks = true; return; }

    coachBusy = true; coachText = ''; coachStage = '';
    try {
      // The SERVER spends the credit atomically (spend_credit) and the LLM only runs if a
      // credit was available - the client never decrements, so a failed coach can't overcharge.
      coachUsedAI = true;
      coachText = await serverProvider.explain(input, (p) => { coachStage = p.stage; });
      // Reflect the server-side spend in the UI (admins at -1 stay unlimited).
      if (!unlimited) credits = await getCredits();
    } catch (e) {
      // Payment/credit problem from the server -> show packs; otherwise fall back to free coach.
      coachUsedAI = false;
      if (String((e as Error)?.message) === 'payment-required') { showPacks = true; coachText = ''; }
      else coachText = await rulesProvider.explain(input);
    } finally {
      coachBusy = false; coachStage = '';
    }
  }

  async function buyPack(pack: 'single' | 'five' | 'twelve') {
    if (buying) return;
    buying = true;
    try {
      const url = await startCheckout(pack);
      if (url) window.location.href = url;
    } finally {
      buying = false;
    }
  }

  function pickGenre(id: GenreId) {
    genre = id;
    rememberGenre(id);
    // If a result is already on screen, re-interpret it against the new genre live.
    if (result) mix = scoreMix(result, genre);
  }

  let fileGeneration = 0;

  // Public entry: Home hands us a dropped/selected file directly.
  export function analyzeFile(f: File) { void runAnalysis(f); }

  async function handleFile(event: Event) {
    const target = event.target as HTMLInputElement;
    const next = target.files?.[0];
    if (!next) return;
    await runAnalysis(next);
  }

  async function runAnalysis(next: File) {
    const myRun = ++fileGeneration;
    // express = the iterative bounce loop (same filename re-analyzed) -> skip ceremony.
    express = !!file && file.name === next.name;
    file = next;
    loading = true;
    result = null; mix = null; memory = null; error = '';
    showMore = false; showShare = false; showFix = false; showMoreRoutes = false;
    expandedRoute = null; showCharacter = false; showCold = false;
    selectedProjectId = ''; snapshotSaved = false; snapshotError = '';
    coachText = ''; coachBusy = false; coachStage = '';
    savedAnalysisId = null; setCoachAnalysisId(null);

    // HONEST listening flow: each named stage ticks as its real DSP phase begins (onStage).
    // The progress hairline width = stageDone / total. No fake ceiling, no padding delay.
    stageDone = 0; currentStage = null; liveEnergy = 0;

    try {
      const analysis = await analyzeAudio(next, (stage) => {
        if (myRun !== fileGeneration) return;
        currentStage = stage;
        // the stage index tells us how many are now in-flight/complete
        stageDone = ANALYSIS_STAGES.indexOf(stage);
        // droplet energy climbs with REAL stage progress during listening (honest, not random)
        liveEnergy = 0.25 + 0.6 * (stageDone / ANALYSIS_STAGES.length);
      });
      if (myRun !== fileGeneration) return;
      // The DSP is genuinely done — all stages complete.
      stageDone = ANALYSIS_STAGES.length;

      result = analysis;
      // play the track's REAL loudness envelope once as the verdict appears
      playEnvelope(analysis.envelope);
      const diag = computeDiagnostics(analysis);
      const m = scoreMix(analysis, genre);
      mix = m;

      const rec: AnalysisRecord = {
        at: Date.now(),
        fileName: next.name,
        lufs: analysis.lufsEstimate,
        truePeak: analysis.truePeakEstimate,
        phase: analysis.phaseCorrelation,
        lowEnergy: analysis.lowEnergy,
        midEnergy: analysis.midEnergy,
        topIssue: diag.issues[0]?.type ?? 'healthy',
        safeForDemo: diag.safeForDemo,
        score: m.score
      };
      memory = compareToLast(rec);   // compute BEFORE recording (compares to prior)
      recordAnalysis(rec);

      if (user) {
        try {
          const id = await saveAnalysis({
            file_name: next.name,
            lufs: analysis.lufsEstimate, true_peak: analysis.truePeakEstimate, phase: analysis.phaseCorrelation,
            low_energy: analysis.lowEnergy, mid_energy: analysis.midEnergy, high_energy: analysis.highEnergy,
            top_issue: diag.issues[0]?.type ?? 'healthy', safe_for_demo: diag.safeForDemo
          });
          if (myRun === fileGeneration) { savedAnalysisId = id; setCoachAnalysisId(id); credits = await getCredits(); }
        } catch { /* backend not wired -> free coach still works */ }
      }
    } catch (err) {
      console.error(err);
      if (myRun === fileGeneration) error = t('an.error');
    } finally {
      if (myRun === fileGeneration) { loading = false; currentStage = null; }
    }
  }

  // Reset to the upload screen.
  function analyzeAnother() {
    if (envTimer) { clearInterval(envTimer); envTimer = undefined; }
    liveEnergy = 0;
    file = null; result = null; mix = null; memory = null; error = ''; express = false;
    coachText = ''; showPacks = false; showMore = false; showShare = false;
    showFix = false; showMoreRoutes = false; expandedRoute = null; showCharacter = false; showCold = false;
  }

  async function saveSnapshot() {
    if (!user || !result || !diagnostics || !mix || !selectedProjectId) return;
    savingSnapshot = true; snapshotError = ''; snapshotSaved = false;
    const issueList = diagnostics.issues.map(i => i.title).join(', ');
    const text = [
      `[Analysis] ${file?.name ?? 'unknown'} | ${genre ?? 'no genre'}`,
      `Mix Score ${mix.score}/100 - ${mix.verdictWord}`,
      `LUFS ${result.lufsEstimate} | True peak ${result.truePeakEstimate} dBTP | Phase ${result.phaseCorrelation}`,
      issueList ? `Issues: ${issueList}` : null,
    ].filter(Boolean).join('\n');
    try {
      await addProjectComment(selectedProjectId, user.email ?? 'unknown', text);
      snapshotSaved = true;
      setTimeout(() => { snapshotSaved = false; }, 4000);
    } catch (err) {
      snapshotError = err instanceof Error ? err.message : 'Could not save. Try again.';
    } finally {
      savingSnapshot = false;
    }
  }

  // ---- Diagnostics (issue detection) - unchanged source of truth, drives "the fix" ----
  type Issue = {
    type: IssueType; title: string; severity: 'high' | 'medium' | 'low';
    summary: string; beginner: string; expert: string; ignore: string;
  };
  type Diagnostics = {
    issues: Issue[]; verdict: string; safeForDemo: boolean;
    tonal: string; headroomState: string; monoState: string;
    actionQueue: Issue[]; recs: string[]; suggestions: Recipe[];
  };

  // Recipe suggestions now route off the explicit `recipe.need` field via needRoutes,
  // not tag overlap — the matching is structural, so Cue cannot bluff a route.
  function suggestRecipes(issues: Issue[]): Recipe[] {
    return suggestionsForIssues(issues.map(i => i.type));
  }

  function computeDiagnostics(r: AudioAnalysis): Diagnostics {
    const issues: Issue[] = [];
    const headroom = r.truePeakEstimate, loudness = r.lufsEstimate, phase = r.phaseCorrelation;
    const low = r.lowEnergy, mid = r.midEnergy, high = r.highEnergy;

    if (headroom > -1) issues.push({
      type: 'headroom', title: 'True peak is over the ceiling', severity: 'high',
      summary: `True peak measures ${r.truePeakEstimate} dBTP, above the -1 dBTP ceiling - lossy encoding can push it into clipping.`,
      beginner: 'Lower the master or limiter ceiling until true peak sits at or below -1 dBTP.',
      expert: 'Back off the final limiter and compare kick / snare crest before adding any extra loudness push.',
      ignore: 'Do not chase more loudness until this is under control.'
    });
    if (phase < 0 || phase < 0.2) issues.push({
      type: 'phase', title: phase < 0 ? 'Mono cancellation detected' : 'Very wide, check mono', severity: phase < 0 ? 'high' : 'low',
      summary: phase < 0 ? `Correlation is ${r.phaseCorrelation} - below 0 means layers cancel when folded to mono.`
        : `Correlation is ${r.phaseCorrelation} - a wide image is fine, just confirm the low end survives a mono fold.`,
      beginner: 'Check the low end and wide verbs in mono before doing anything else.',
      expert: phase < 0 ? 'Find the inverted/polarity-flipped layer; a mono-maker only masks it. Then narrow below 150-200 Hz.'
        : 'Spot-check decorrelated reverbs and chorus returns, and keep below 150-200 Hz mono.',
      ignore: 'Do not add more width until the center feels stable.'
    });
    if (high > mid + 3) issues.push({
      type: 'top-end', title: 'Top-end reads bright', severity: 'medium',
      summary: `Highs sit about ${Math.round(high - mid)} dB over the mids - can feel crisp at first but brittle on long listens.`,
      beginner: 'Try a subtle shelf on hats or air elements instead of boosting the whole mix.',
      expert: 'Review cymbal transient shape and upper-mid congestion before adding pure air.',
      ignore: 'Do not fix this with a broad smile EQ on the master.'
    });
    if (low > mid + 4) issues.push({
      type: 'low-end', title: 'Low end dominates the mids', severity: 'medium',
      summary: `Low band sits about ${Math.round(low - mid)} dB over the mids - kick and bass will read oversized on full-range systems.`,
      beginner: 'A/B on small speakers and lower either kick sub or bass sub by 1-2 dB.',
      expert: 'Separate ownership between 45-65 Hz and 80-110 Hz instead of compressing everything harder.',
      ignore: 'Do not widen the low end to make it feel "bigger".'
    });
    if (loudness < -16) issues.push({
      type: 'loudness', title: 'Reads quiet next to references', severity: 'low',
      summary: `At ${r.lufsEstimate} LUFS this bounce is on the quiet side - fine if the mix is unfinished.`,
      beginner: 'Leave it for now if the mix is unfinished. Revisit loudness last.',
      expert: 'Only push once the tonal and headroom problems are solved.',
      ignore: 'Do not chase a LUFS number before the track is balanced.'
    });
    if (!issues.length) issues.push({
      type: 'healthy', title: 'No red flag dominates yet', severity: 'low',
      summary: 'The snapshot looks broadly healthy. Remaining work is likely about taste and reference matching.',
      beginner: 'Compare with one trusted reference and adjust only the biggest mismatch you hear.',
      expert: 'Use the spectrum and crest relationship to fine-tune intent, not to over-correct.',
      ignore: 'Do not invent problems just because a meter exists.'
    });

    const safeForDemo = issues.every(i => i.severity !== 'high');
    const tonal = low > high + 5 ? 'Bottom-heavy tilt' : high > low + 5 ? 'Air-heavy tilt' : 'Balanced broad tilt';
    const headroomState = headroom > -1 ? 'Over the ceiling' : headroom > -1.5 ? 'Tight' : 'Comfortable';
    const monoState = phase < 0 ? 'Unsafe in mono' : phase < 0.2 ? 'Monitor in mono' : 'Stable enough';
    return { issues, verdict: '', safeForDemo, tonal, headroomState, monoState,
      actionQueue: issues.slice(0, 3), recs: getRecommendations(r), suggestions: suggestRecipes(issues) };
  }

  const diagnostics = $derived(result ? computeDiagnostics(result) : null);
  const topFix = $derived(diagnostics?.actionQueue[0] ?? null);

  // Map the real DSP verdict to the three-answer system + exact brand colours.
  // ship -> SEND IT / ENVOIE (Volt Lime) | almost -> ALMOST / PRESQUE (Pool Cyan) | work -> NOT YET / PAS ENCORE (Magenta).
  // The middle word is now ALMOST/PRESQUE (not "ONE THING") so it stops colliding with
  // the design principle and the fix-card heading (juror catch).
  const VERDICT_KEY: Record<string, string> = { ship: 'verdict.ship', almost: 'verdict.almost', work: 'verdict.work' };
  const VERDICT_HEX: Record<string, string> = { ship: '#C9F23C', almost: '#2FCDE6', work: '#F73CB0' };
  // referencing i18n.locale keeps verdictWord reactive to the language toggle
  const verdictWord = $derived(mix ? (i18n.locale, t(VERDICT_KEY[mix.verdict])) : t('verdict.almost'));
  const verdictColor = $derived(mix ? VERDICT_HEX[mix.verdict] : '#2FCDE6');
  // Cue's mood drives the 3D verdict state: ship->happy(send), almost->thinking(one), work->worried(not).
  const cueMood = $derived(mix ? (mix.verdict === 'ship' ? 'happy' : mix.verdict === 'almost' ? 'thinking' : 'worried') : 'idle');

  // The "move" title, localized: the producer-voice fix headline (FR/EN via i18n).
  const moveTitle = $derived(topFix ? (i18n.locale, t(`move.${topFix.type}`)) : '');

  // The one fix sentence — now FULLY producer-FR (the screenshot moment can't be half-English).
  // issueSummary() returns the localized one-line "what's wrong + what to do" per issue.
  const oneThing = $derived.by(() => {
    if (!topFix) return '';
    return (i18n.locale, issueSummary(topFix.type as IssueType));
  });

  // The honesty receipt: one line of what Cue actually heard, under the verdict.
  const receipt = $derived(mix && result ? (i18n.locale, honestyReceipt(mix, result)) : '');

  // Path A suggestions: up to 3 deterministic routes for the active issues.
  const suggestions = $derived(diagnostics?.suggestions ?? []);
  const topRoute = $derived(suggestions[0] ?? null);
  const extraRoutes = $derived(suggestions.slice(1, 3));

  // Listening progress as a 0..1 fraction (real stage completion, not a timer).
  const progressFrac = $derived(loading ? stageDone / ANALYSIS_STAGES.length : 0);

  const categoryLabel: Record<string, string> = {
    'sound-design': 'Sound design', 'mixing': 'Mixing', 'mastering': 'Mastering'
  };
</script>

<!-- ============================================================================
     "Silence" — one breathing column on a Slate ground. Exactly one object on screen.
     The droplet appears only on upload/listening/verdict, never behind the fix worklist.
     ZERO cards: the fix is a typographic worklist, the verdict a spoken word + one line.
     ============================================================================ -->
<div class="room" class:fix-mode={showFix}>
  {#if !showFix && !showCold && !showCharacter}
    <div class="room-cue" aria-hidden="true">
      <Cue size={240} mood={loading ? 'listening' : (mix ? cueMood : 'idle')} energy={liveEnergy} interactive={false} autoRotate={true} />
    </div>
  {/if}

  <!-- UPLOAD (direct nav to analyzer, no file in flight) — same invitation as Home -->
  {#if !loading && !result && !error && !showCold && !showCharacter}
    <div class="column">
      <p class="invite reveal">{t('home.invite')}</p>
      <p class="ash reveal" style="--i:1;">{t('home.whisper')}</p>
      <label class="upload-hit reveal" style="--i:2;">
        <input type="file" accept="audio/*" class="sr-only-focusable" aria-label={t('home.invite')} onchange={handleFile} />
      </label>
      <button class="link ash cold-door reveal" style="--i:3;" onclick={() => showCold = true}>{t('home.knowAlready')}</button>
    </div>
  {/if}

  <!-- LISTENING -->
  {#if loading}
    <div class="column">
      {#if file}<p class="sentence ash reveal">{file.name}</p>{/if}
      <div class="progress reveal" style="--i:1;"><span class="progress-fill" style="width:{Math.round(progressFrac * 100)}%;"></span></div>
      <ol class="stepper reveal" style="--i:2;" aria-label="Analyse">
        {#each ANALYSIS_STAGES as stage, i}
          <li class="step" class:done={i < stageDone} class:active={i === stageDone}>{t(STAGE_KEY[stage])}</li>
        {/each}
      </ol>
    </div>
  {/if}

  <!-- ERROR -->
  {#if error && !loading}
    <div class="column">
      <p class="sentence reveal">{error}</p>
      <label class="link reveal" style="--i:1;">
        <input type="file" accept="audio/*" class="sr-only-focusable" onchange={handleFile} />
        {t('an.tryAnother')}
      </label>
    </div>
  {/if}

  <!-- VERDICT -->
  {#if result && diagnostics && mix && !loading && !showFix}
    <div class="column">
      {#if memory?.headline}<p class="memory ash reveal">↗ {memory.headline}</p>{/if}
      <h1 class="verdict-word reveal" style="--i:1;">{verdictWord}<span class="vdot" style="color:{verdictColor};">.</span></h1>
      <p class="sentence reveal" style="--i:2;">{oneThing}</p>
      <p class="receipt mono reveal" style="--i:3;">{receipt}</p>

      <div class="actions reveal" style="--i:4;">
        <button class="link tide" onclick={() => showFix = true}>{t('an.walkMeThrough')} →</button>
        <button class="link" onclick={() => showMore = !showMore}>{showMore ? t('an.hide') : t('an.numbers')}</button>
        <button class="link" onclick={() => showCold = true}>{t('home.knowAlready')}</button>
      </div>

      {#if showMore}
        <div class="fold reveal">
          <p class="ash mono small">{t('an.mixScore')} · {mix.score}/100</p>
          <div class="numbers">
            <span><b>{result.lufsEstimate}</b> LUFS</span>
            <span><b>{result.truePeakEstimate}</b> dBTP</span>
            <span><b>{result.phaseCorrelation}</b> {t('stat.mono')}</span>
            <span><b>{result.peakDb}</b> dBFS</span>
            <span><b>{result.rmsDb}</b> RMS</span>
            <span><b>{result.spectralTiltDbPerOct}</b> tilt</span>
          </div>
          <p class="ash mono small" style="margin-top:24px;">{t('an.genreCorrect')}</p>
          <div class="genre-correct">
            {#each GENRES as g (g.id)}
              <button class="link" class:tide={genre === g.id} onclick={() => pickGenre(g.id)}>{t('genre.' + g.id)}</button>
            {/each}
          </div>
        </div>
      {/if}

      {#if user && projects.length > 0}
        <div class="pin reveal">
          <select bind:value={selectedProjectId}>
            <option value="">{t('an.pinProject')}</option>
            {#each projects as project (project.id)}<option value={project.id}>{project.name}</option>{/each}
          </select>
          <button class="link" disabled={!selectedProjectId || savingSnapshot} onclick={saveSnapshot}>{savingSnapshot ? t('an.saving') : t('an.pinIt')}</button>
          {#if snapshotSaved}<span class="tide small">{t('an.saved')}</span>{/if}
        </div>
      {/if}

      <button class="link analyze-again" onclick={analyzeAnother}>↻ {t('an.analyzeAnother')}</button>
    </div>
  {/if}

  <!-- THE FIX (Path A continuation) — a scannable worklist, no card -->
  {#if result && diagnostics && mix && !loading && showFix}
    <div class="column top">
      <p class="ash small">{verdictWord} — {moveTitle}</p>
      <div class="horizon" style="margin:14px 0 28px;"></div>
      {#if topRoute}
        <p class="goal reveal">{topRoute.goal}</p>
        <p class="ash mono small reveal" style="--i:1;">{t('fix.stepCount')} 1 {t('fix.stepOf')} {topRoute.chain.length}</p>
        <ol class="worklist">
          {#each topRoute.chain as step, i}
            <li class="work-step reveal" style="--i:{i + 2};">
              <span class="work-idx tide mono">{String(i + 1).padStart(2, '0')}</span>
              <span class="work-body">
                <span class="work-plugin">{step.plugin}</span>
                <span class="work-role ash">{step.role}</span>
                <span class="work-param mono ash">{step.params}</span>
              </span>
            </li>
          {/each}
        </ol>

        <div class="alts reveal">
          {#if topRoute.native_alt}<details><summary class="link">{t('fix.native')}</summary><p class="mono ash small">{topRoute.native_alt}</p></details>{/if}
          {#if topRoute.ableton_notes}<details><summary class="link">{t('fix.notes')}</summary><p class="ash small">{topRoute.ableton_notes}</p></details>{/if}
          {#if onOpenRecipe}<button class="link" onclick={() => onOpenRecipe?.(topRoute.id)}>{t('fix.openRoute')} →</button>{/if}
        </div>

        {#if extraRoutes.length > 0}
          <div class="horizon" style="margin:28px 0 18px;"></div>
          {#if !showMoreRoutes}
            <button class="link ash" onclick={() => showMoreRoutes = true}>{extraRoutes.length} {t('fix.moreRoutes')} ↓</button>
          {:else}
            {#each extraRoutes as r (r.id)}
              <button class="alt-route reveal" onclick={() => onOpenRecipe?.(r.id)}>
                <span class="work-plugin">{r.title}</span>
                <span class="ash small">{r.goal}</span>
              </button>
            {/each}
          {/if}
        {/if}
      {/if}

      <p class="closing reveal">{t('fix.closing')}</p>
      <div class="actions">
        <button class="link ash" onclick={() => showCharacter = true}>{t('fix.characterLane')} →</button>
        <button class="link ash" onclick={() => showFix = false}>{t('cold.back')}</button>
        <button class="link ash" onclick={analyzeAnother}>↻ {t('an.analyzeAnother')}</button>
      </div>
    </div>
  {/if}

  <!-- COLD ENTRY (Path B) — a typeset contents page of the 5 needs -->
  {#if showCold && !loading}
    <div class="column">
      <h1 class="question reveal">{t('cold.question')}</h1>
      <p class="ash reveal" style="--i:1;">{t('cold.sub')}</p>
      <ol class="contents">
        {#each COLD_NEEDS as need, i (need)}
          <li class="content-row reveal" style="--i:{i + 2};">
            <button class="content-link" onclick={() => pickNeed(need)}>
              <span class="row-num mono ash">{String(i + 1).padStart(2, '0')}</span>
              <span class="row-need">{t('coldrow.' + need)}</span>
              <span class="row-dots"></span>
              <span class="row-tag mono ash">{t('coldtag.' + need)}</span>
            </button>
          </li>
        {/each}
        <li class="content-row reveal" style="--i:6;">
          <button class="content-link" onclick={() => { showCold = false; }}>
            <span class="row-num mono ash">05</span>
            <span class="row-need">{t('coldrow.healthy')}</span>
            <span class="row-dots"></span>
            <span class="row-tag mono ash">{t('coldtag.healthy')}</span>
          </button>
        </li>
      </ol>
      <div class="actions">
        <button class="link ash" onclick={() => showCharacter = true}>{t('cold.characterFooter')}</button>
        <button class="link ash" onclick={() => showCold = false}>{t('cold.back')}</button>
      </div>
    </div>
  {/if}

  <!-- CHARACTER lane (browse-only taste, never a verdict) -->
  {#if showCharacter}
    <div class="column top">
      <p class="ash small">{t('need.character')}</p>
      <div class="horizon" style="margin:14px 0 28px;"></div>
      <ol class="worklist">
        {#each characterRoutes() as r, i (r.id)}
          <li class="char-row reveal" style="--i:{i};">
            <button class="content-link" onclick={() => onOpenRecipe?.(r.id)}>
              <span class="work-plugin">{r.title}</span>
              <span class="ash small">{r.goal}</span>
            </button>
          </li>
        {/each}
      </ol>
      <button class="link ash" style="margin-top:32px;" onclick={() => showCharacter = false}>{t('cold.back')}</button>
    </div>
  {/if}

  {#if showShare && mix}
    <div class="column"><ShareCard {mix} {genre} fileName={file?.name ?? 'my track'} /></div>
  {/if}
</div>

<style>
  .room { position: relative; min-height: calc(100dvh - 64px); }
  .room-cue {
    position: absolute; left: 50%; top: 30%; transform: translate(-50%, -50%);
    width: 240px; height: 240px; z-index: 1; pointer-events: none;
    transition: opacity .6s var(--ease-calm);
  }

  .invite { font-family: var(--font-serif); font-weight: 300; font-size: clamp(22px, 4vw, 30px); color: var(--color-text); text-align: center; margin: 0; }
  .upload-hit { position: absolute; inset: 0; cursor: pointer; z-index: 3; display: block; }
  .cold-door { position: relative; z-index: 4; margin-top: 48px; align-self: center; }

  .verdict-word {
    font-family: var(--font-serif); font-weight: 300;
    font-size: var(--step-hero); line-height: 0.96; letter-spacing: -0.02em;
    color: var(--color-text); text-align: center; margin: 0;
  }
  .vdot { font-weight: 400; }

  .sentence { font-family: var(--font-sans); font-size: clamp(17px, 2.4vw, 20px); line-height: 1.5; color: var(--color-text); text-align: center; margin: 56px 0 0; max-width: 30ch; align-self: center; }
  .memory { text-align: center; margin: 0 0 8px; font-size: 13px; }
  .receipt { align-self: center; margin: 18px 0 0; font-size: 12px; color: var(--color-text-muted); letter-spacing: 0.02em; text-align: center; }

  .ash { color: var(--color-text-muted); }
  .tide { color: var(--color-cyan); }
  .small { font-size: 12px; }
  .mono { font-family: var(--font-mono); }

  .link { font-family: var(--font-sans); font-size: 14px; color: var(--color-text-secondary); background: none; border: none; padding: 0; cursor: pointer; transition: color .25s var(--ease-calm); }
  .link:hover { color: var(--color-text); }
  .link.tide { color: var(--color-cyan); }
  .link:disabled { opacity: .4; cursor: not-allowed; }

  .actions { display: flex; gap: 28px; flex-wrap: wrap; justify-content: center; margin-top: 56px; }
  .analyze-again { margin-top: 40px; align-self: center; color: var(--color-text-muted); }

  .progress { width: 100%; max-width: 360px; height: 1px; background: var(--color-hairline); align-self: center; overflow: hidden; }
  .progress-fill { display: block; height: 100%; background: var(--color-cyan); transition: width .4s linear; }
  .stepper { list-style: none; display: flex; gap: 22px; justify-content: center; padding: 0; margin: 24px 0 0; flex-wrap: wrap; }
  .step { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.12em; color: var(--color-text-muted); transition: color .35s var(--ease-calm); }
  .step.done { color: var(--color-text-secondary); }
  .step.active { color: var(--color-cyan); }

  .fold { margin-top: 40px; align-self: stretch; }
  .numbers { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 16px 24px; margin-top: 14px; }
  .numbers span { font-family: var(--font-mono); font-size: 12px; color: var(--color-text-muted); }
  .numbers b { display: block; font-size: 17px; color: var(--color-text); font-weight: 500; }
  .genre-correct { display: flex; flex-wrap: wrap; gap: 18px; margin-top: 14px; }

  .pin { display: flex; gap: 18px; align-items: center; flex-wrap: wrap; justify-content: center; margin-top: 40px; }
  .pin select { width: auto; min-width: 180px; }

  .goal { font-family: var(--font-serif); font-weight: 300; font-size: clamp(18px, 3vw, 24px); line-height: 1.3; color: var(--color-text); margin: 0 0 18px; }
  .worklist { list-style: none; padding: 0; margin: 18px 0 0; display: flex; flex-direction: column; gap: var(--gap-verse); }
  .work-step { display: grid; grid-template-columns: 2ch 1fr; gap: 16px; align-items: baseline; }
  .work-idx { font-size: 13px; }
  .work-body { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .work-plugin { font-family: var(--font-sans); font-size: 15px; font-weight: 500; color: var(--color-text); }
  .work-role { font-size: 13px; }
  .work-param { font-size: 12px; line-height: 1.5; word-break: break-word; }
  .alts { display: flex; gap: 24px; flex-wrap: wrap; margin-top: 32px; align-items: baseline; }
  .alts details { font-size: 13px; }
  .alts summary { list-style: none; }
  .alt-route { display: flex; flex-direction: column; gap: 4px; text-align: left; background: none; border: none; cursor: pointer; padding: 12px 0; }
  .closing { font-family: var(--font-serif); font-weight: 300; font-style: italic; color: var(--color-text-muted); margin: 40px 0 0; }

  .question { font-family: var(--font-serif); font-weight: 300; font-size: clamp(24px, 5vw, 38px); line-height: 1.1; color: var(--color-text); margin: 0; }
  .contents { list-style: none; padding: 0; margin: var(--gap-verse) 0 0; display: flex; flex-direction: column; gap: 32px; }
  .content-link { display: grid; grid-template-columns: 3ch 1fr auto; gap: 12px; align-items: baseline; width: 100%; background: none; border: none; cursor: pointer; text-align: left; }
  .row-num { font-size: 12px; }
  .row-need { font-family: var(--font-serif); font-weight: 300; font-size: clamp(18px, 3vw, 24px); color: var(--color-text-secondary); transition: color .25s var(--ease-calm); }
  .content-link:hover .row-need { color: var(--color-text); }
  .row-dots { border-bottom: 1px dotted var(--color-hairline); align-self: center; height: 1px; }
  .row-tag { font-size: 11px; }
  .char-row { padding: 0; }

  @media (prefers-reduced-motion: reduce) {
    .progress-fill, .room-cue { transition: none; }
  }
</style>
