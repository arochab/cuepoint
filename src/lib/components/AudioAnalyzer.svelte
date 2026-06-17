<script lang="ts">
  import { analyzeAudio, getRecommendations } from '../utils/audio.js';
  import type { AudioAnalysis } from '../utils/audio.js';
  import { recipes } from '../data/recipes.js';
  import type { Recipe, Project } from '../types/index.js';
  import { addProjectComment, saveAnalysis, getCredits, startCheckout } from '../utils/db.js';
  import Cue from './Cue.svelte';
  import ShareCard from './ShareCard.svelte';
  import { rulesProvider } from '../coach/rulesProvider.js';
  import { serverProvider, setCoachAnalysisId } from '../coach/serverProvider.js';
  import type { IssueType } from '../reco/issueTypes.js';
  import { recommendationFor } from '../reco/recommendations.js';
  import { recordAnalysis, compareToLast, type AnalysisRecord, type MemoryReadout } from '../progress/history.js';
  import { GENRES, lastGenre, rememberGenre, type GenreId } from '../reco/genres.js';
  import { scoreMix, type MixScore } from '../reco/score.js';

  let {
    onOpenRecipe,
    onNavigate,
    user = null,
    projects = []
  }: {
    onOpenRecipe?: (id: string) => void;
    onNavigate?: (route: 'projects') => void;
    user?: { id: string; email?: string } | null;
    projects?: Project[];
  } = $props();

  // Genre is asked ONCE, up front (chip row). Pre-selected from last time as a kindness.
  let genre = $state<GenreId | null>(lastGenre());

  let file = $state<File | null>(null);
  let result = $state<AudioAnalysis | null>(null);
  let loading = $state(false);
  let error = $state('');

  // Live analysis stepper - determinate, named stages that narrate the craft.
  const STEPS = ['Decoding audio', 'Measuring loudness', 'Scanning for masking', 'Picking your #1 fix'];
  let stepIndex = $state(-1);     // -1 = not started, STEPS.length = done
  let liveEnergy = $state(0);     // feeds Cue's audio-reactive pulse during analysis

  // The interpreted result (genre-aware). Single source for verdict, score, face, bands.
  let mix = $state<MixScore | null>(null);
  let memory = $state<MemoryReadout | null>(null);

  // Progressive disclosure: everything beyond the one fix folds away.
  let showBreakdown = $state(false);
  let showNumbers = $state(false);
  let showShare = $state(false);

  // Save-to-project state
  let selectedProjectId = $state('');
  let savingSnapshot = $state(false);
  let snapshotSaved = $state(false);
  let snapshotError = $state('');

  // Coach state. The AI coach is OPTIONAL and on-demand; the DSP diagnosis is the truth.
  let coachText = $state('');
  let coachBusy = $state(false);
  let coachStage = $state('');
  let coachUsedAI = $state(false);

  // Paid-coach state.
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

  async function handleFile(event: Event) {
    const target = event.target as HTMLInputElement;
    const next = target.files?.[0];
    if (!next) return;
    const myRun = ++fileGeneration;
    file = next;
    loading = true;
    result = null; mix = null; memory = null; error = '';
    showBreakdown = false; showNumbers = false; showShare = false;
    selectedProjectId = ''; snapshotSaved = false; snapshotError = '';
    coachText = ''; coachBusy = false; coachStage = '';
    savedAnalysisId = null; setCoachAnalysisId(null);

    // Claude Design "LISTENING" flow: a SCANNING percentage climbs while the real DSP runs.
    // We never show a fake 100% before the real result is in: the bar waits for the analysis.
    stepIndex = 0;
    analyzePct = 0;
    let energyTimer: ReturnType<typeof setInterval> | undefined;
    energyTimer = setInterval(() => { liveEnergy = Math.random() * 0.8 + 0.2; }, 140);
    let scanReady = false;
    const scanTimer = setInterval(() => {
      if (myRun !== fileGeneration) return;
      // climb to 92% on a timer; the last 8% is unlocked only once the DSP result is ready.
      const ceiling = scanReady ? 100 : 92;
      analyzePct = Math.min(ceiling, analyzePct + Math.random() * 7 + 3);
      stepIndex = analyzePct < 33 ? 0 : analyzePct < 66 ? 1 : analyzePct < 95 ? 2 : 3;
    }, 180);

    try {
      const analysis = await analyzeAudio(next);
      if (myRun !== fileGeneration) { clearInterval(scanTimer); return; }
      scanReady = true;
      // let the bar visibly reach 100 before the reveal (Claude Design pacing).
      await new Promise<void>(r => setTimeout(r, 520));
      clearInterval(scanTimer);
      if (myRun !== fileGeneration) return;
      analyzePct = 100;

      result = analysis;
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
      if (myRun === fileGeneration) error = 'Could not analyze this file. Try a standard WAV, MP3, or FLAC export.';
    } finally {
      clearInterval(scanTimer);
      if (energyTimer) clearInterval(energyTimer);
      liveEnergy = 0;
      if (myRun === fileGeneration) { loading = false; stepIndex = -1; }
    }
  }

  // Reset to the upload screen (Claude Design "ANALYZE ANOTHER").
  function analyzeAnother() {
    file = null; result = null; mix = null; memory = null; error = '';
    coachText = ''; showPacks = false; showBreakdown = false; showNumbers = false; showShare = false;
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

  const issueTagMap: Record<IssueType, string[]> = {
    headroom:   ['mastering', 'final', 'loudness', 'LUFS'],
    phase:      ['stereo', 'width', 'mixing'],
    'top-end':  ['hi-hats', 'top-loop', 'air', 'drums'],
    'low-end':  ['low-end', 'kick', 'bass', 'translation'],
    loudness:   ['mastering', 'loudness', 'LUFS', 'final'],
    healthy:    []
  };

  function suggestRecipes(issues: Issue[]): Recipe[] {
    const activeTypes = issues.map(i => i.type).filter(t => t !== 'healthy');
    if (!activeTypes.length) return [];
    const scores = new Map<string, number>();
    for (const type of activeTypes) {
      const targetTags = issueTagMap[type];
      for (const recipe of recipes) {
        const hits = recipe.tags.filter(tag => targetTags.includes(tag)).length;
        if (hits > 0) scores.set(recipe.id, (scores.get(recipe.id) ?? 0) + hits);
      }
    }
    return [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map(([id]) => recipes.find(r => r.id === id)!).filter(Boolean);
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

  // Map the real DSP verdict to Claude Design's three-answer system + exact brand colours.
  // ship -> SEND IT (Volt Lime) | almost -> ONE THING (Pool Cyan) | work -> NOT YET (Magenta).
  const VERDICT_WORD: Record<string, string> = { ship: 'SEND IT', almost: 'ONE THING', work: 'NOT YET' };
  const VERDICT_HEX: Record<string, string> = { ship: '#C9F23C', almost: '#2FCDE6', work: '#F73CB0' };
  const verdictWord = $derived(mix ? VERDICT_WORD[mix.verdict] : 'ONE THING');
  const verdictColor = $derived(mix ? VERDICT_HEX[mix.verdict] : '#2FCDE6');
  // Cue's mood drives the 3D verdict state: ship->happy(send), almost->thinking(one), work->worried(not).
  const cueMood = $derived(mix ? (mix.verdict === 'ship' ? 'happy' : mix.verdict === 'almost' ? 'thinking' : 'worried') : 'idle');

  // The one fix sentence, grounded in the real diagnosis (truthful, not the demo's canned copy).
  const oneThing = $derived.by(() => {
    if (!topFix) return '';
    const move = recommendationFor(topFix.type as IssueType);
    return `${move.title}. ${topFix.summary}`;
  });

  // Analyze progress percentage (Claude Design "SCANNING · NN%").
  let analyzePct = $state(0);

  const categoryLabel: Record<string, string> = {
    'sound-design': 'Sound design', 'mixing': 'Mixing', 'mastering': 'Mastering'
  };
</script>

<!-- ============================================================================
     CuePoint app - EXACT port of the Claude Design brand system. Dark "Ink" stage,
     full-bleed real-time 3D Cue behind, three screens: UPLOAD / LISTENING / VERDICT.
     The DSP brain is the source of truth; the verdict maps to SEND IT / ONE THING /
     NOT YET with Cue's verdict colours.
     ============================================================================ -->
<div class="cp-stage">
  <!-- full-bleed 3D Cue -->
  <div class="cp-cue">
    <Cue mood={loading ? 'listening' : (mix ? cueMood : 'idle')} interactive={false} autoRotate={true} />
  </div>

  <!-- top bar -->
  <div class="cp-topbar">
    <div style="display:flex;align-items:center;gap:9px;">
      <span class="cp-mono" style="font-size:11px;letter-spacing:0.3em;color:#cfd5db;">CUEPOINT</span>
      <span class="cp-dot" style="background:{loading ? '#2FCDE6' : (mix ? verdictColor : '#2FCDE6')};"></span>
    </div>
    <span class="cp-mono" style="font-size:10px;letter-spacing:0.18em;color:#5b636b;">PRIVATE · IN-BROWSER</span>
  </div>

  <!-- STEP 1 : UPLOAD -->
  {#if !loading && !result && !error}
    <div class="cp-screen">
      <div class="cp-mono" style="font-size:11px;letter-spacing:0.24em;color:#2FCDE6;margin-bottom:22px;">STEP 01 / UPLOAD</div>
      <h1 class="cp-display" style="font-size:clamp(46px,12vw,118px);">DROP A<br>BOUNCE</h1>
      <p class="cp-lede">Your track, your machine. Cue listens for a few seconds and tells you the one thing to fix first.</p>

      <!-- genre chips (our wedge: no reference track needed) -->
      <div class="cp-mono" style="font-size:10px;letter-spacing:0.2em;color:#6f7880;margin-bottom:12px;">WHAT IS IT?</div>
      <div class="cp-chips">
        {#each GENRES as g (g.id)}
          <button class="cp-chip" class:on={genre === g.id} onclick={() => pickGenre(g.id)}>{g.label}</button>
        {/each}
      </div>

      <label class="cp-dropzone">
        <input type="file" accept="audio/*" class="sr-only-focusable" aria-label="Choose an audio file to analyze" onchange={handleFile} />
        <svg viewBox="0 0 120 90" width="46" height="34" aria-hidden="true"><path d="M96,20 L96,52 L44,52 M44,52 L62,34 M44,52 L62,70" fill="none" stroke="#ECEDEE" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"></path></svg>
        <span style="text-align:left;">
          <span style="display:block;font-weight:700;font-size:17px;">Drop a track or click</span>
          <span class="cp-mono" style="display:block;font-size:11px;color:#6f7880;letter-spacing:0.1em;margin-top:3px;">MP3 / WAV · NOTHING LEAVES YOUR BROWSER</span>
        </span>
      </label>
    </div>
  {/if}

  <!-- STEP 2 : LISTENING -->
  {#if loading}
    <div class="cp-screen">
      <div class="cp-mono" style="font-size:11px;letter-spacing:0.24em;color:#2FCDE6;margin-bottom:30px;">STEP 02 / LISTENING</div>
      <div class="cp-eq">
        {#each Array(28) as _, i}
          <div class="cp-eqbar" style="height:{22 + ((i * 37) % 60)}px;animation-delay:{((i * 53) % 80) / 100}s;{i % 7 === 3 ? 'background:#C9F23C;' : ''}"></div>
        {/each}
      </div>
      <h2 style="margin:0;font-size:clamp(26px,5vw,44px);font-weight:600;letter-spacing:-0.02em;">Cue is listening<span class="cp-dots">...</span></h2>
      <div class="cp-progress"><div class="cp-fill" style="width:{analyzePct}%;"></div></div>
      <div class="cp-mono" style="font-size:12px;color:#6f7880;letter-spacing:0.16em;margin-top:14px;">SCANNING · {Math.round(analyzePct)}%</div>

      <!-- Named, determinate stepper (retour #1): you SEE where Cue is - each finished
           stage ticks to a check, the active one pulses. The stepIndex is already
           driven by the real DSP progress above. -->
      <ol class="cp-stepper" aria-label="Analysis progress">
        {#each STEPS as label, i}
          <li class="cp-step" class:done={i < stepIndex} class:active={i === stepIndex}>
            <span class="cp-step-mark" aria-hidden="true">
              {#if i < stepIndex}&#10003;{:else if i === stepIndex}&#9679;{:else}&#9675;{/if}
            </span>
            <span class="cp-step-label">{label}</span>
          </li>
        {/each}
      </ol>
    </div>
  {/if}

  <!-- error -->
  {#if error}
    <div class="cp-screen">
      <div class="cp-mono" style="font-size:11px;letter-spacing:0.24em;color:#F73CB0;margin-bottom:18px;">COULD NOT READ</div>
      <p class="cp-lede" style="color:#ECEDEE;">{error}</p>
      <label class="cp-dropzone" style="margin-top:8px;">
        <input type="file" accept="audio/*" class="sr-only-focusable" onchange={handleFile} />
        <span style="font-weight:700;font-size:16px;">Try another file</span>
      </label>
    </div>
  {/if}

  <!-- STEP 3 : VERDICT -->
  {#if result && diagnostics && mix && !loading}
    <div class="cp-screen cp-verdict">
      <div class="cp-mono" style="font-size:11px;letter-spacing:0.24em;color:#6f7880;margin-bottom:14px;">STEP 03 / VERDICT · MIX SCORE</div>
      <div class="cp-mono" style="font-weight:500;letter-spacing:-0.02em;line-height:1;margin-bottom:6px;">
        <span style="font-size:clamp(56px,12vw,116px);">{mix.score}</span><span style="font-size:clamp(22px,4vw,40px);color:#6f7880;">/100</span>
      </div>
      <h1 class="cp-display" style="font-size:clamp(48px,13vw,150px);letter-spacing:-0.01em;line-height:0.96;color:{verdictColor};">{verdictWord}</h1>

      {#if memory?.headline}
        <div class="cp-memory">
          <span style="color:{verdictColor};">&#8599;</span> {memory.headline}
        </div>
      {/if}

      <div class="cp-card">
        <div class="cp-mono" style="font-size:11px;letter-spacing:0.16em;color:{verdictColor};margin-bottom:10px;">THE ONE THING &#8629;</div>
        <div style="font-size:clamp(15px,2.3vw,18px);font-weight:500;line-height:1.5;color:#ECEDEE;">{oneThing}</div>
      </div>

      <!-- 3 translated stats (truthful numbers, brand styling) -->
      <div class="cp-stats">
        {#each [['LOUDNESS', result.lufsEstimate + ' LUFS', mix.loudnessHuman], ['TRUE PEAK', result.truePeakEstimate + ' dBTP', mix.truePeakHuman], ['MONO', String(result.phaseCorrelation), mix.monoHuman]] as [k, v, human]}
          <div class="cp-stat">
            <div class="cp-mono" style="font-size:10px;letter-spacing:0.14em;color:#6f7880;">{k}</div>
            <div style="font-weight:700;font-size:18px;margin-top:3px;">{v}</div>
            <div style="font-size:12px;color:#aeb6bd;margin-top:2px;">{human}</div>
          </div>
        {/each}
      </div>

      <!-- coaching CTA -->
      {#if coachBusy}
        <div class="cp-mono" style="margin-top:22px;color:#aeb6bd;letter-spacing:0.12em;">{coachStage || 'CUE IS THINKING...'}</div>
      {:else if coachText}
        <div class="cp-card" style="margin-top:18px;">
          <div class="cp-mono" style="font-size:11px;letter-spacing:0.16em;color:{verdictColor};margin-bottom:10px;">CUE'S COACHING{coachUsedAI ? ' · AI' : ''}</div>
          <div style="font-size:16px;line-height:1.55;color:#ECEDEE;">{coachText}</div>
        </div>
      {:else}
        <button class="cp-primary" onclick={() => askCoach(!!user)}>
          WALK ME THROUGH THE FIX{#if user && credits > 0} · {credits} LEFT{:else} · FIRST TRACK FREE{/if}
        </button>
      {/if}

      {#if showPacks}
        <div class="cp-card" style="margin-top:16px;text-align:left;">
          {#if !user}
            <div style="font-weight:700;font-size:18px;margin-bottom:6px;">Your mastering engineer. 1&euro;, not 200&euro;.</div>
            <p style="color:#aeb6bd;font-size:14px;line-height:1.5;">Sign in with Google, then unlock Cue's full coaching for this track. No subscription, no trap.</p>
            {#if onNavigate}<button class="cp-primary" style="margin-top:12px;" onclick={() => onNavigate!('projects')}>SIGN IN TO CONTINUE</button>{/if}
          {:else}
            <div style="font-weight:700;font-size:18px;margin-bottom:10px;">Unlock Cue's AI coaching</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="appbtn" disabled={buying} onclick={() => buyPack('single')}>1 TRACK · 1&euro;</button>
              <button class="appbtn" disabled={buying} onclick={() => buyPack('five')}>5 TRACKS · 4&euro;</button>
              <button class="appbtn" disabled={buying} onclick={() => buyPack('twelve')}>12 TRACKS · 8&euro;</button>
            </div>
            <div class="cp-mono" style="font-size:10px;color:#6f7880;margin-top:10px;letter-spacing:0.12em;">CREDITS NEVER EXPIRE · NO SUBSCRIPTION</div>
          {/if}
        </div>
      {/if}

      <!-- quiet reveal row -->
      <div class="cp-reveals">
        <button class="cp-reveal" onclick={() => showBreakdown = !showBreakdown}>{showBreakdown ? 'HIDE' : 'FULL'} BREAKDOWN</button>
        <button class="cp-reveal" onclick={() => showNumbers = !showNumbers}>{showNumbers ? 'HIDE' : 'ALL'} NUMBERS</button>
        <button class="cp-reveal" onclick={() => showShare = !showShare}>SHARE</button>
      </div>

      {#if showBreakdown}
        <div class="cp-fold">
          <div class="cp-mono" style="font-size:11px;letter-spacing:0.16em;color:#6f7880;margin-bottom:10px;">FOUR BANDS VS THE {(genre ?? 'TYPICAL').toUpperCase()} TARGET</div>
          {#each mix.bands as b (b.key)}
            <div class="cp-bandrow">
              <span class="cp-mono" style="font-size:11px;color:{b.state === 'high' ? '#F73CB0' : b.state === 'low' ? '#2FCDE6' : '#C9F23C'};min-width:13ch;letter-spacing:0.1em;">{b.label.toUpperCase()}</span>
              <span style="font-size:13px;color:#aeb6bd;">{b.human}</span>
            </div>
          {/each}
          {#if diagnostics.suggestions.length > 0 && onOpenRecipe}
            <div class="cp-mono" style="font-size:11px;letter-spacing:0.16em;color:#6f7880;margin:14px 0 8px;">RECIPES THAT FIX IT</div>
            {#each diagnostics.suggestions as recipe (recipe.id)}
              <button class="cp-reciperow" onclick={() => onOpenRecipe!(recipe.id)}>
                <span style="font-weight:600;font-size:14px;">{recipe.title}</span>
                <span class="cp-mono" style="font-size:11px;color:#2FCDE6;">{categoryLabel[recipe.category] ?? recipe.category} &rarr;</span>
              </button>
            {/each}
          {/if}
        </div>
      {/if}

      {#if showNumbers}
        <div class="cp-fold">
          <div class="cp-mono" style="font-size:11px;letter-spacing:0.16em;color:#6f7880;margin-bottom:10px;">EVIDENCE</div>
          <div class="cp-evidence">
            {#each [['LUFS', result.lufsEstimate], ['TRUE PEAK', result.truePeakEstimate + ' dBTP'], ['PHASE', result.phaseCorrelation], ['PEAK', result.peakDb + ' dBFS'], ['RMS', result.rmsDb + ' dB'], ['TILT', result.spectralTiltDbPerOct]] as [k, v]}
              <div class="cp-stat">
                <div class="cp-mono" style="font-size:9px;letter-spacing:0.14em;color:#6f7880;">{k}</div>
                <div style="font-weight:700;font-size:16px;margin-top:2px;">{v}</div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      {#if showShare}
        <div class="cp-fold" style="display:flex;justify-content:center;">
          <ShareCard {mix} {genre} fileName={file?.name ?? 'my track'} />
        </div>
      {/if}

      {#if user && projects.length > 0}
        <div class="cp-fold" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:center;">
          <select bind:value={selectedProjectId} class="cp-select">
            <option value="">Pin to a project...</option>
            {#each projects as project (project.id)}<option value={project.id}>{project.name}</option>{/each}
          </select>
          <button class="appbtn" disabled={!selectedProjectId || savingSnapshot} onclick={saveSnapshot}>{savingSnapshot ? 'SAVING...' : 'PIN IT'}</button>
          {#if snapshotSaved}<span class="cp-mono" style="font-size:11px;color:#C9F23C;">SAVED</span>{/if}
        </div>
      {/if}

      <button class="appbtn" style="margin-top:26px;" onclick={analyzeAnother}>&#8635; ANALYZE ANOTHER</button>
    </div>
  {/if}
</div>

<style>
  .cp-stage { position: relative; width: 100%; min-height: calc(100dvh - 64px); overflow: hidden;
    background: radial-gradient(64% 56% at 50% 42%, #1b2128 0%, #11151a 52%, #080a0d 100%);
    font-family: var(--font-sans); color: #ECEDEE; }
  .cp-cue { position: absolute; inset: 0; z-index: 0; }
  .cp-mono { font-family: 'JetBrains Mono', monospace; }
  .cp-topbar { position: absolute; left: 0; right: 0; top: 0; display: flex; justify-content: space-between;
    align-items: center; padding: 22px 26px; z-index: 5; pointer-events: none; }
  .cp-dot { width: 5px; height: 5px; border-radius: 50%; display: inline-block; transition: background .6s ease; }
  .cp-screen { position: relative; z-index: 4; min-height: calc(100dvh - 64px); display: flex; flex-direction: column;
    align-items: center; justify-content: center; text-align: center; padding: 80px 24px 48px; }
  .cp-verdict { justify-content: flex-start; padding-top: clamp(70px, 12vh, 130px); }
  /* Big display titles in JetBrains Mono now (Adam: the machine's voice). Mono needs
     air, so no skew and a touch of positive tracking; weight 700 (no 900 in mono). */
  .cp-display { margin: 0; font-family: 'JetBrains Mono', monospace; font-weight: 700; letter-spacing: -0.01em; line-height: 0.96; }
  .cp-lede { font-size: clamp(15px, 2.2vw, 19px); color: #aeb6bd; max-width: 440px; margin: 26px 0 22px; line-height: 1.45; }
  .cp-chips { display: flex; gap: 7px; flex-wrap: wrap; justify-content: center; max-width: 500px; margin-bottom: 28px; }
  .cp-chip { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.06em; padding: 8px 15px;
    border-radius: 999px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.02); color: #aeb6bd;
    cursor: pointer; transition: border-color .2s ease, color .2s ease, background .2s ease, box-shadow .2s ease; }
  .cp-chip:hover { border-color: rgba(47,205,230,0.55); color: #fff; }
  .cp-chip.on { background: #2FCDE6; border-color: #2FCDE6; color: #0a0c0f; font-weight: 500;
    box-shadow: 0 0 22px rgba(47,205,230,0.35); }
  .cp-dropzone { cursor: pointer; border: 1.5px dashed rgba(255,255,255,0.28); background: rgba(255,255,255,0.03);
    border-radius: 22px; padding: 24px 32px; display: flex; align-items: center; gap: 18px; transition: all .25s ease; }
  .cp-dropzone:hover { border-color: rgba(47,205,230,0.6); background: rgba(47,205,230,0.06); }
  .cp-eq { display: flex; align-items: center; gap: 5px; height: 90px; margin-bottom: 34px; }
  .cp-eqbar { width: 4px; border-radius: 3px; background: #2FCDE6; transform-origin: center; transform: scaleY(0.3);
    animation: cpeq 0.9s ease-in-out infinite; }
  @keyframes cpeq { 0%,100% { transform: scaleY(0.28); } 50% { transform: scaleY(1); } }
  .cp-dots::after { content: ''; }
  .cp-progress { width: min(360px, 72vw); height: 3px; border-radius: 3px; background: rgba(255,255,255,0.12);
    margin-top: 30px; overflow: hidden; }
  .cp-fill { height: 100%; background: #2FCDE6; border-radius: 3px; transition: width .2s linear; }

  /* Named stepper: each stage ticks done, the active one pulses cyan. */
  .cp-stepper { list-style: none; margin: 24px 0 0; padding: 0; display: flex; flex-direction: column;
    gap: 9px; align-items: flex-start; text-align: left; }
  .cp-step { display: flex; align-items: center; gap: 11px;
    font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: 0.08em;
    color: #5b636b; transition: color .35s ease; }
  .cp-step-mark { width: 16px; display: inline-flex; justify-content: center; font-size: 12px; }
  .cp-step.done { color: #aeb6bd; }
  .cp-step.done .cp-step-mark { color: #C9F23C; }              /* completed = volt lime check */
  .cp-step.active { color: #ECEDEE; }
  .cp-step.active .cp-step-mark { color: #2FCDE6; animation: cpPulse 1s ease-in-out infinite; }
  @keyframes cpPulse { 0%,100% { opacity: 0.4; transform: scale(0.85); } 50% { opacity: 1; transform: scale(1.15); } }
  .cp-memory { display: inline-flex; align-items: center; gap: 8px; margin-top: 18px; font-size: 14px; font-weight: 500;
    color: #ECEDEE; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 999px;
    padding: 8px 16px; }
  .cp-card { margin-top: 26px; max-width: min(520px, 88vw); width: 100%; border: 1px solid rgba(255,255,255,0.1);
    background: rgba(14,17,22,0.55); border-radius: 18px; padding: 22px 26px; text-align: left; backdrop-filter: blur(6px); }
  .cp-stats { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-top: 18px; }
  .cp-stat { border: 1px solid rgba(255,255,255,0.1); background: rgba(14,17,22,0.5); border-radius: 12px;
    padding: 10px 14px; min-width: 9rem; text-align: left; }
  .cp-primary { margin-top: 22px; font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: 0.14em;
    padding: 15px 24px; border-radius: 999px; border: none; background: #2FCDE6; color: #0a0c0f; font-weight: 700;
    cursor: pointer; transition: transform .1s ease, filter .2s ease; }
  .cp-primary:hover { filter: brightness(1.08); }
  .cp-primary:active { transform: scale(0.98); }
  .appbtn { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.12em; padding: 9px 15px;
    border-radius: 999px; border: 1px solid rgba(255,255,255,0.16); background: transparent; color: #aeb6bd; cursor: pointer;
    transition: all .25s ease; }
  .appbtn:hover { border-color: rgba(255,255,255,0.45); color: #fff; }
  .appbtn:disabled { opacity: 0.5; cursor: not-allowed; }
  .cp-reveals { display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; margin-top: 22px; }
  .cp-reveal { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.14em; color: #6f7880;
    background: none; border: none; cursor: pointer; border-bottom: 1px dashed rgba(255,255,255,0.2); padding-bottom: 2px; }
  .cp-reveal:hover { color: #ECEDEE; border-color: #ECEDEE; }
  .cp-fold { margin-top: 18px; max-width: min(560px, 92vw); width: 100%; text-align: left;
    border-top: 1px solid rgba(255,255,255,0.08); padding-top: 16px; animation: fadeUp .4s ease both; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
  .cp-bandrow { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
  .cp-reciperow { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 10px;
    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 10px 14px;
    margin-top: 6px; cursor: pointer; color: #ECEDEE; text-align: left; }
  .cp-reciperow:hover { border-color: rgba(47,205,230,0.5); }
  .cp-evidence { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 8px; }
  .cp-select { width: auto; min-width: 170px; background: rgba(14,17,22,0.7); color: #ECEDEE;
    border: 1px solid rgba(255,255,255,0.16); border-radius: 10px; padding: 9px 12px; cursor: pointer; }
  @media (prefers-reduced-motion: reduce) { .cp-eqbar, .cp-step.active .cp-step-mark { animation: none; } }
</style>
