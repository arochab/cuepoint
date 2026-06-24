// Mix Score + verdict, genre-aware. One place that turns raw DSP into the single
// emotional read the analyzer screen needs: a 0-100 score, a one-word verdict, the
// face mood, and a per-band read against the chosen genre's target zone.
//
// The DSP numbers stay the source of truth - this only INTERPRETS them. Scores are
// deliberately forgiving (a rough demo should not read as a failure).

import type { AudioAnalysis } from '../utils/audio.js';
import { genreById, type GenreId, type GenreTarget } from './genres.js';
import { TP_CLIP_DBTP, PHASE_SECTION_CANCEL } from './issueTypes.js';

export type Verdict = 'ship' | 'almost' | 'work';
export type FaceMood = 'happy' | 'thinking' | 'worried';

export interface MixScore {
  score: number;            // 0..100
  verdict: Verdict;
  verdictWord: string;      // "SHIP IT" / "ALMOST" / "NEEDS WORK"
  face: FaceMood;
}

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }

// Penalty curve: 0 inside the target range, growing as you drift outside it.
function rangePenalty(v: number, [lo, hi]: [number, number], slope: number): number {
  if (v < lo) return (lo - v) * slope;
  if (v > hi) return (v - hi) * slope;
  return 0;
}

export function scoreMix(a: AudioAnalysis, genreId: GenreId | null): MixScore {
  const g: GenreTarget = genreById(genreId);
  const lowGap = a.lowEnergy - a.midEnergy;   // dB
  const highGap = a.highEnergy - a.midEnergy; // dB

  // --- penalties (points off 100) ---
  let off = 0;
  // True peak above -1 dBTP costs points (it's the streaming-headroom recommendation),
  // but gently: a -0.3..-0.8 dBTP master is a normal, intentional club level, not a defect.
  // Slope 10 / cap 20 (was 14/24) so a clean loud master still clears to SHIP.
  if (a.truePeakEstimate > -1) off += clamp((a.truePeakEstimate + 1) * 10, 0, 20);
  // Loudness vs the genre's release zone (gentle - quiet is fine for an unfinished mix).
  off += clamp(rangePenalty(a.lufsEstimate, g.lufs, 2.2), 0, 16);
  // Tonal balance vs genre targets.
  off += clamp(rangePenalty(lowGap, g.lowGap, 3.2), 0, 22);
  off += clamp(rangePenalty(highGap, g.highGap, 3.0), 0, 16);
  // Phase: penalty scales smoothly with how negative the correlation is — no +8 cliff at
  // exactly 0, so a slightly-wide master (phase -0.05) barely loses points while real
  // cancellation (toward -1) is heavily penalized.
  if (a.phaseCorrelation < 0) off += clamp((-a.phaseCorrelation) * 40, 0, 22);
  // A SECTION that collapses in mono (whole-file reads safe but one window is well negative)
  // must cost points too — otherwise the score stays high while diagnostics raises a
  // high-severity "a section cancels in mono" card. Mirrors diagnostics.ts's sectionCancels.
  const sectionCancels = a.phaseCorrelationMin < PHASE_SECTION_CANCEL && a.phaseCorrelation >= 0;
  if (sectionCancels) off += clamp((-a.phaseCorrelationMin) * 30, 0, 22);

  const score = Math.round(clamp(100 - off, 1, 100));

  // --- verdict bands ---
  // A hard fault is an INSTANT worst-tier ("NOT YET"), bypassing the score: real mono
  // cancellation (phase < -0.1), a section that collapses in mono (sectionCancels), or a
  // true peak OVER +1 dBTP (it genuinely clips on lossy encode — and that is exactly where
  // diagnostics.ts turns the headroom card HIGH-severity, so verdict and card agree). A peak
  // of 0..+1 is hot-but-shippable: a low-severity note, points lost, but not condemned —
  // matching the low-severity card there. (See TP_CLIP_DBTP, shared with diagnostics/issueText.)
  const hardFault = a.phaseCorrelation < -0.1 || sectionCancels || a.truePeakEstimate > TP_CLIP_DBTP;
  let verdict: Verdict;
  if (hardFault || score < 55) verdict = 'work';
  else if (score < 80) verdict = 'almost';
  else verdict = 'ship';

  const verdictWord = verdict === 'ship' ? 'SHIP IT' : verdict === 'almost' ? 'ALMOST' : 'NEEDS WORK';
  const face: FaceMood = verdict === 'ship' ? 'happy' : verdict === 'almost' ? 'thinking' : 'worried';

  // The UI reads only score/verdict/verdictWord/face here; the human-readable consequence
  // strings are owned by issueText.ts (issueSummary/honestyReceipt), which is localized and
  // threshold-shared — so there is exactly ONE source of producer-voice copy, no drift.
  return { score, verdict, verdictWord, face };
}
