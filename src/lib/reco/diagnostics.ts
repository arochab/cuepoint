// Issue detection — the layer that turns DSP metrics into the cards the user sees.
// Pure (depends only on AudioAnalysis + GenreId), so it is unit-tested in diagnostics.test.ts.
// Genre-aware on purpose: score.ts judges the low/high gaps and loudness PER GENRE, so this
// detector uses the SAME genre target zones (genreById) — a verdict and its fix card can
// never contradict each other (the no-bluff invariant).

import type { AudioAnalysis } from '../utils/audio.js';
import { type IssueType, TP_CEILING_DBTP, TP_CLIP_DBTP, PHASE_SECTION_CANCEL } from './issueTypes.js';
import type { Recipe } from '../types/index.js';
import { genreById, type GenreId } from './genres.js';
import { suggestionsForIssues } from './needRoutes.js';

export type Issue = {
  type: IssueType; title: string; severity: 'high' | 'medium' | 'low';
  summary: string; beginner: string; expert: string; ignore: string;
};
export type Diagnostics = {
  issues: Issue[]; safeForDemo: boolean;
  actionQueue: Issue[]; suggestions: Recipe[];
};

export function computeDiagnostics(r: AudioAnalysis, genreId: GenreId | null): Diagnostics {
  const g = genreById(genreId);
  const issues: Issue[] = [];
  const headroom = r.truePeakEstimate, loudness = r.lufsEstimate, phase = r.phaseCorrelation;
  const phaseMin = r.phaseCorrelationMin;   // worst 400ms window — catches a section that collapses
  const low = r.lowEnergy, mid = r.midEnergy, high = r.highEnergy;
  const lowGap = low - mid, highGap = high - mid;
  // A section genuinely cancels in mono even though the whole-file reads safe. Threshold
  // -0.25 (not just <0) so a momentary -0.07 window — normal stereo movement — is NOT
  // flagged; only a real polarity/anti-phase section (well negative) raises it.
  const sectionCancels = phaseMin < PHASE_SECTION_CANCEL && phase >= 0;

  if (headroom > TP_CEILING_DBTP - 1) issues.push({   // anything over -1 dBTP is worth a note
    type: 'headroom',
    // Tiers shared with score.ts (TP_CLIP_DBTP): >+1 genuinely clips (HIGH, caps the verdict);
    // 0..+1 is over the ceiling but shippable (LOW); -1..0 is hot-but-safe (LOW). The severity
    // and the verdict agree on whether it clips — that's the no-bluff invariant.
    title: headroom > TP_CLIP_DBTP ? 'True peak is over the ceiling'
      : headroom > TP_CEILING_DBTP ? 'True peak is over 0 dBTP' : 'True peak is a touch hot',
    severity: headroom > TP_CLIP_DBTP ? 'high' : 'low',
    summary: headroom > TP_CLIP_DBTP
      ? `True peak measures ${r.truePeakEstimate} dBTP, over +${TP_CLIP_DBTP} - lossy encoding will clip it.`
      : headroom > TP_CEILING_DBTP
      ? `True peak measures ${r.truePeakEstimate} dBTP, just over 0 - can clip on lossy encode; drop the ceiling to -1.`
      : `True peak measures ${r.truePeakEstimate} dBTP - a touch over the -1 dBTP streaming ceiling, not clipping.`,
    beginner: 'Lower the master or limiter ceiling until true peak sits at or below -1 dBTP.',
    expert: 'Back off the final limiter and compare kick / snare crest before adding any extra loudness push.',
    ignore: 'Do not chase more loudness until this is under control.'
  });
  if (phase < 0.2 || sectionCancels) issues.push({
    type: 'phase',
    title: phase < 0 ? 'Mono cancellation detected' : sectionCancels ? 'A section cancels in mono' : 'Very wide, check mono',
    severity: (phase < 0 || sectionCancels) ? 'high' : 'low',
    summary: phase < 0 ? `Correlation is ${r.phaseCorrelation} - below 0 means layers cancel when folded to mono.`
      : sectionCancels ? `Overall correlation is ${r.phaseCorrelation}, but a section drops to ${r.phaseCorrelationMin} - part of the track cancels in mono.`
      : `Correlation is ${r.phaseCorrelation} - a wide image is fine, just confirm the low end survives a mono fold.`,
    beginner: 'Check the low end and wide verbs in mono before doing anything else.',
    expert: (phase < 0 || sectionCancels) ? 'Find the inverted/polarity-flipped layer (check the worst section); a mono-maker only masks it. Then narrow below 150-200 Hz.'
      : 'Spot-check decorrelated reverbs and chorus returns, and keep below 150-200 Hz mono.',
    ignore: 'Do not add more width until the center feels stable.'
  });
  // TOP END — detected on BOTH sides (the no-bluff fix: a dull master must not read healthy).
  // The spectral tilt corroborates the deficit so a genre with a low highGap floor (e.g. dub
  // techno) isn't flagged dull just for being dark by design — only a master that is BOTH
  // below its genre's high floor AND globally dark (tilt steeper than ~-6 dB/oct) is "lacks air".
  if (highGap > g.highGap[1] + 2) issues.push({
    type: 'top-end', title: 'Top-end reads bright', severity: 'medium',
    summary: `Highs sit about ${Math.round(highGap)} dB over the mids - bright for ${g.label}, can feel brittle on long listens.`,
    beginner: 'Try a subtle shelf on hats or air elements instead of boosting the whole mix.',
    expert: 'Review cymbal transient shape and upper-mid congestion before adding pure air.',
    ignore: 'Do not fix this with a broad smile EQ on the master.'
  });
  else if (highGap < g.highGap[0] - 2 && r.spectralTiltDbPerOct < -6) issues.push({
    type: 'top-end', title: 'Top-end is dull', severity: 'medium',
    summary: `Highs sit about ${Math.round(highGap)} dB under the mids - dark for ${g.label} (tilt ${r.spectralTiltDbPerOct} dB/oct); it can read lifeless next to references.`,
    beginner: 'Add a gentle air shelf (10-14 kHz) on the elements that should sparkle, not the whole mix.',
    expert: 'Check whether a master-bus low-pass or over-compression is eating the top; restore transient air before shelving.',
    ignore: 'Do not crank a broad high boost — find what is missing and lift only that.'
  });
  // LOW END — both sides too: a thin master (no weight) is as real a fault as a boomy one.
  if (lowGap > g.lowGap[1] + 2) issues.push({
    type: 'low-end', title: 'Low end dominates the mids', severity: 'medium',
    summary: `Low band sits about ${Math.round(lowGap)} dB over the mids - heavy even for ${g.label}; kick and bass will read oversized on full-range systems.`,
    beginner: 'A/B on small speakers and lower either kick sub or bass sub by 1-2 dB.',
    expert: 'Separate ownership between 45-65 Hz and 80-110 Hz instead of compressing everything harder.',
    ignore: 'Do not widen the low end to make it feel "bigger".'
  });
  else if (lowGap < g.lowGap[0] - 2) issues.push({
    type: 'low-end', title: 'Low end is thin', severity: 'medium',
    summary: `Low band sits about ${Math.round(lowGap)} dB over the mids - light for ${g.label}; the track can feel weightless on a club system.`,
    beginner: 'Give the kick and bass more body around 50-90 Hz before touching anything else.',
    expert: 'Check the HPF on the master/bus and whether sub got carved too hard; rebuild weight at the source, not with a broad shelf.',
    ignore: 'Do not just turn the whole low end up — find the missing octave and fill it.'
  });
  if (loudness < g.lufs[0] - 2) issues.push({
    type: 'loudness', title: 'Reads quiet next to references', severity: 'low',
    summary: `At ${r.lufsEstimate} LUFS this is quiet for ${g.label} - fine if the mix is unfinished.`,
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

  // "The one thing" is severity-ranked, not declaration-order: a catastrophic gap must
  // headline over a hair-hot true peak. high > medium > low, stable within a tier.
  const rank = { high: 0, medium: 1, low: 2 } as const;
  issues.sort((a, b) => rank[a.severity] - rank[b.severity]);

  const safeForDemo = issues.every(i => i.severity !== 'high');
  return {
    issues, safeForDemo,
    actionQueue: issues.slice(0, 3),
    suggestions: suggestionsForIssues(issues.map(i => i.type)),
  };
}
