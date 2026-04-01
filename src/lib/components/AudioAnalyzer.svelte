<script lang="ts">
  import { analyzeAudio, getRecommendations } from '../utils/audio.js';
  import type { AudioAnalysis } from '../utils/audio.js';

  let file = $state<File | null>(null);
  let result = $state<AudioAnalysis | null>(null);
  let loading = $state(false);
  let error = $state('');

  async function handleFile(event: Event) {
    const target = event.target as HTMLInputElement;
    const next = target.files?.[0];
    if (!next) return;
    file = next;
    loading = true;
    result = null;
    error = '';
    try {
      result = await analyzeAudio(next);
    } catch (err) {
      console.error(err);
      error = 'Could not analyze this file. Try a standard WAV, MP3, or FLAC export.';
    } finally {
      loading = false;
    }
  }

  const derived = $derived.by(() => {
    if (!result) return null;

    const issues: Array<{ title: string; severity: 'high' | 'medium' | 'low'; summary: string; beginner: string; expert: string; ignore: string }> = [];
    const headroom = result.truePeakEstimate;
    const loudness = result.lufsEstimate;
    const phase = result.phaseCorrelation;
    const low = result.spectrum.slice(0, 10).reduce((sum, value) => sum + value, 0) / 10;
    const mid = result.spectrum.slice(18, 34).reduce((sum, value) => sum + value, 0) / 16;
    const high = result.spectrum.slice(42, 62).reduce((sum, value) => sum + value, 0) / 20;

    if (headroom > -1) {
      issues.push({
        title: 'Headroom is too tight',
        severity: 'high',
        summary: 'Inter-sample clipping risk is likely once this is encoded or pushed harder.',
        beginner: 'Lower the master or limiter threshold until true peak sits below -1 dBTP.',
        expert: 'Back off the final limiter and compare kick / snare crest before adding any extra loudness push.',
        ignore: 'Do not chase more loudness until this is under control.'
      });
    }

    if (phase < 0.2) {
      issues.push({
        title: 'Mono translation is fragile',
        severity: phase < 0 ? 'high' : 'medium',
        summary: 'Width effects or layered ambience may partially cancel when folded down.',
        beginner: 'Check the low end and wide verbs in mono before doing anything else.',
        expert: 'Collapse selected buses, inspect decorrelated reverbs and chorus returns, and narrow below 150–200 Hz.',
        ignore: 'Do not add more width until the center feels stable.'
      });
    }

    if (high > mid + 8) {
      issues.push({
        title: 'Top-end reads edgy',
        severity: 'medium',
        summary: 'The mix may feel bright on first listen but can turn brittle on long playback.',
        beginner: 'Try a subtle shelf on hats or air elements instead of boosting the whole mix.',
        expert: 'Review cymbal transient shape and upper-mid congestion before adding pure air.',
        ignore: 'Do not fix this with a broad smile EQ on the master.'
      });
    }

    if (low > mid + 15) {
      issues.push({
        title: 'Low-end dominance is likely',
        severity: 'medium',
        summary: 'Kick and bass may feel impressive alone but oversized relative to the rest.',
        beginner: 'A/B on small speakers and lower either kick sub or bass sub by 1–2 dB.',
        expert: 'Separate ownership between 45–65 Hz and 80–110 Hz instead of compressing everything harder.',
        ignore: 'Do not widen the low end to make it feel “bigger”.'
      });
    }

    if (loudness < -14) {
      issues.push({
        title: 'Delivery loudness reads conservative',
        severity: 'low',
        summary: 'The bounce may feel quieter than references even if the mix itself is healthy.',
        beginner: 'Leave it for now if the mix is unfinished. Revisit loudness last.',
        expert: 'Only push once the tonal and headroom problems are solved.',
        ignore: 'Do not chase a LUFS number before the track is balanced.'
      });
    }

    if (!issues.length) {
      issues.push({
        title: 'No red flag dominates yet',
        severity: 'low',
        summary: 'The snapshot looks broadly healthy. Remaining work is likely about taste and reference matching.',
        beginner: 'Compare with one trusted reference and adjust only the biggest mismatch you hear.',
        expert: 'Use the spectrum and crest relationship to fine-tune intent, not to over-correct.',
        ignore: 'Do not invent problems just because a meter exists.'
      });
    }

    const mostImportant = issues[0];
    const safeForDemo = issues.every((issue) => issue.severity !== 'high');
    const verdict = safeForDemo ? 'Safe for demo' : 'Not safe for demo yet';
    const verdictCopy = safeForDemo
      ? 'Nothing urgent appears to block a rough share. Refine selectively, don’t overwork it.'
      : `${mostImportant.summary} This is the first thing to fix before sharing this bounce.`;

    const tonal = low > high + 10 ? 'Bottom-heavy tilt' : high > low + 10 ? 'Air-heavy tilt' : 'Balanced broad tilt';
    const headroomState = headroom > -1 ? 'Needs restraint' : headroom > -2 ? 'Usable but tight' : 'Comfortable enough';
    const monoState = phase < 0 ? 'Unsafe in mono' : phase < 0.3 ? 'Monitor in mono' : 'Stable enough';
    const actionQueue = issues.slice(0, 3);

    return {
      issues,
      verdict,
      verdictCopy,
      safeForDemo,
      tonal,
      headroomState,
      monoState,
      actionQueue,
      recs: getRecommendations(result)
    };
  });
</script>

<section class="page-container fade-up" style="display:grid; gap:1rem;">
  <div class="surface" style="border-radius:28px; padding:1.2rem 1.3rem; display:grid; gap:.8rem;">
    <div class="eyebrow">Audio check</div>
    <h1 class="display-title" style="font-size: clamp(1.95rem, 2.5vw, 3.1rem); max-width:11ch;">A smarter mix inspector.</h1>
    <p class="hero-copy" style="max-width:46rem;">Drop a bounce, get a verdict, see the likely issue, and know what to fix next. Everything runs locally in the browser.</p>

    <label class="surface-strong" style="border-radius:22px; padding:1.05rem; display:grid; gap:.55rem; cursor:pointer; justify-items:center; text-align:center;">
      <input type="file" accept="audio/*" class="hidden" onchange={handleFile} />
      <div class="brand-mark">♪</div>
      <div style="font-size:.94rem; font-weight:600;">{file ? file.name : 'Drop audio here or click to upload'}</div>
      <div class="small-note">WAV, MP3, FLAC — local analysis only, nothing uploaded.</div>
    </label>
  </div>

  {#if loading}
    <div class="surface-strong" style="border-radius:24px; padding:2rem; display:grid; place-items:center; min-height:220px;">
      <div style="display:inline-flex; align-items:center; gap:.75rem;">
        <div class="w-5 h-5 rounded-full border-2 border-[var(--color-accent)] border-r-transparent animate-spin"></div>
        <span class="section-copy">Analyzing bounce…</span>
      </div>
    </div>
  {/if}

  {#if error}
    <div class="surface-strong" style="border-radius:24px; padding:1rem 1.1rem; color:var(--color-warn);">{error}</div>
  {/if}

  {#if result && derived}
    <div class="panel-stack">
      <div class="detail-grid">
        <section class="surface-strong" style="border-radius:24px; padding:1.2rem; display:grid; gap:.9rem;">
          <div class="eyebrow">Overall verdict</div>
          <h2 style="font-size: clamp(1.9rem, 2.3vw, 2.8rem); line-height:.95; letter-spacing:-.05em; font-weight:700; color:{derived.safeForDemo ? 'var(--color-ok)' : 'var(--color-warn)'}; max-width:10ch;">{derived.verdict}</h2>
          <p class="section-copy" style="max-width:44rem;">{derived.verdictCopy}</p>
          <div class="tag-row">
            <span class="pill {derived.safeForDemo ? 'active' : ''}">{derived.safeForDemo ? 'Ready to share a rough demo' : 'Hold before sharing'}</span>
            <span class="pill">{derived.actionQueue.length} priority calls</span>
          </div>
        </section>

        <section class="surface-strong" style="border-radius:24px; padding:1.1rem; display:grid; gap:.7rem; align-content:start;">
          <div class="eyebrow">What matters first</div>
          {#each derived.actionQueue as issue}
            <article class="issue-card">
              <div class="flex items-start justify-between gap-3 mb-2">
                <h3 style="font-size:.96rem; font-weight:650; line-height:1.2;">{issue.title}</h3>
                <span class="pill {issue.severity === 'high' ? '' : 'active'}" style="color:{issue.severity === 'high' ? 'var(--color-warn)' : 'var(--color-accent-ink)'};">{issue.severity}</span>
              </div>
              <p class="small-note" style="color:var(--color-text-secondary);">{issue.summary}</p>
            </article>
          {/each}
        </section>
      </div>

      <div class="analyzer-grid">
        <section class="surface-strong" style="border-radius:24px; padding:1.1rem; display:grid; gap:1rem; align-content:start;">
          <div class="eyebrow">Evidence</div>
          <div class="kpi-row">
            <div class="metric-card"><div class="mono muted" style="font-size:10px; text-transform:uppercase;">LUFS (est.)</div><div style="font-size:1.45rem; font-weight:650; letter-spacing:-.04em;">{result.lufsEstimate}</div><div class="small-note">Integrated energy zone</div></div>
            <div class="metric-card"><div class="mono muted" style="font-size:10px; text-transform:uppercase;">True peak</div><div style="font-size:1.45rem; font-weight:650; letter-spacing:-.04em;">{result.truePeakEstimate} dBTP</div><div class="small-note">Clip risk after conversion</div></div>
            <div class="metric-card"><div class="mono muted" style="font-size:10px; text-transform:uppercase;">Phase</div><div style="font-size:1.45rem; font-weight:650; letter-spacing:-.04em;">{result.phaseCorrelation}</div><div class="small-note">Closer to 1 = safer mono fold</div></div>
            <div class="metric-card"><div class="mono muted" style="font-size:10px; text-transform:uppercase;">Peak</div><div style="font-size:1.45rem; font-weight:650; letter-spacing:-.04em;">{result.peakDb} dBFS</div><div class="small-note">Instantaneous ceiling</div></div>
            <div class="metric-card"><div class="mono muted" style="font-size:10px; text-transform:uppercase;">RMS</div><div style="font-size:1.45rem; font-weight:650; letter-spacing:-.04em;">{result.rmsDb} dB</div><div class="small-note">Perceived density proxy</div></div>
          </div>

          <div class="detail-grid" style="grid-template-columns:minmax(0,1fr) 220px; gap:.9rem;">
            <div class="metric-card" style="display:grid; gap:.7rem; min-height: 240px;">
              <div class="mono muted" style="font-size:10px; text-transform:uppercase;">Spectral balance</div>
              <div style="display:flex; align-items:end; gap:3px; min-height:150px;">
                {#each result.spectrum as band, index}
                  {@const norm = Math.max(0.06, Math.min(1, (band + 100) / 80))}
                  {@const color = index < 10 ? '#d7a5a1' : index < 34 ? '#bfd5a5' : '#b8c7ef'}
                  <div style="flex:1; height:{norm * 120}px; border-radius:999px 999px 0 0; background:{color}; opacity:{0.35 + norm * 0.55};"></div>
                {/each}
              </div>
              <div class="flex justify-between small-note"><span>Sub / low</span><span>Mid</span><span>High</span></div>
            </div>

            <div class="panel-stack">
              <div class="metric-card"><div class="mono muted" style="font-size:10px; text-transform:uppercase;">Tonal read</div><div style="font-size:.95rem; font-weight:650;">{derived.tonal}</div></div>
              <div class="metric-card"><div class="mono muted" style="font-size:10px; text-transform:uppercase;">Headroom</div><div style="font-size:.95rem; font-weight:650;">{derived.headroomState}</div></div>
              <div class="metric-card"><div class="mono muted" style="font-size:10px; text-transform:uppercase;">Mono</div><div style="font-size:.95rem; font-weight:650;">{derived.monoState}</div></div>
            </div>
          </div>
        </section>

        <section class="surface-strong" style="border-radius:24px; padding:1.1rem; display:grid; gap:.9rem; align-content:start;">
          <div class="eyebrow">Action queue</div>
          {#each derived.actionQueue as issue}
            <article class="issue-card" style="display:grid; gap:.55rem;">
              <div>
                <div style="font-size:.95rem; font-weight:650;">{issue.title}</div>
                <div class="small-note" style="margin-top:.2rem;">{issue.summary}</div>
              </div>
              <div>
                <div class="mono muted" style="font-size:10px; text-transform:uppercase;">Beginner move</div>
                <p class="section-copy" style="font-size:.9rem;">{issue.beginner}</p>
              </div>
              <div>
                <div class="mono muted" style="font-size:10px; text-transform:uppercase;">Expert move</div>
                <p class="section-copy" style="font-size:.9rem;">{issue.expert}</p>
              </div>
              <div>
                <div class="mono muted" style="font-size:10px; text-transform:uppercase;">Ignore for now</div>
                <p class="small-note">{issue.ignore}</p>
              </div>
            </article>
          {/each}

          <div class="issue-card" style="display:grid; gap:.45rem;">
            <div class="eyebrow">Quick notes</div>
            {#each derived.recs.slice(0, 3) as rec}
              <p class="small-note" style="color:var(--color-text-secondary);">{rec}</p>
            {/each}
          </div>
        </section>
      </div>
    </div>
  {/if}
</section>
