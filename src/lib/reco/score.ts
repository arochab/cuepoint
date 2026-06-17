// Mix Score + verdict, genre-aware. One place that turns raw DSP into the single
// emotional read the analyzer screen needs: a 0-100 score, a one-word verdict, the
// face mood, and a per-band read against the chosen genre's target zone.
//
// The DSP numbers stay the source of truth - this only INTERPRETS them. Scores are
// deliberately forgiving (a rough demo should not read as a failure).

import type { AudioAnalysis } from '../utils/audio.js';
import { genreById, type GenreId, type GenreTarget } from './genres.js';

export type Verdict = 'ship' | 'almost' | 'work';
export type FaceMood = 'happy' | 'thinking' | 'worried';

export interface BandRead {
  key: 'low' | 'mid' | 'high';
  label: string;       // "Mud & weight", "Body", "Air & sparkle"
  state: 'low' | 'ok' | 'high';
  human: string;       // one-line consequence in plain words
}

export interface MixScore {
  score: number;            // 0..100
  verdict: Verdict;
  verdictWord: string;      // "SHIP IT" / "ALMOST" / "NEEDS WORK"
  face: FaceMood;
  // the three translated headline stats (consequence, not raw number)
  loudnessHuman: string;
  truePeakHuman: string;
  monoHuman: string;
  bands: BandRead[];
  // which band is the problem to lean toward: -1 low, 0 mid, +1 high
  lean: number;
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
  // True peak over the ceiling is the one hard technical fault.
  if (a.truePeakEstimate > -1) off += clamp((a.truePeakEstimate + 1) * 14, 0, 24);
  // Loudness vs the genre's release zone (gentle - quiet is fine for an unfinished mix).
  off += clamp(rangePenalty(a.lufsEstimate, g.lufs, 2.2), 0, 16);
  // Tonal balance vs genre targets.
  off += clamp(rangePenalty(lowGap, g.lowGap, 3.2), 0, 22);
  off += clamp(rangePenalty(highGap, g.highGap, 3.0), 0, 16);
  // Phase: real mono cancellation hurts; merely wide does not.
  if (a.phaseCorrelation < 0) off += clamp((-a.phaseCorrelation) * 30 + 8, 8, 22);

  const score = Math.round(clamp(100 - off, 1, 100));

  // --- verdict bands ---
  const hardFault = a.truePeakEstimate > -1 || a.phaseCorrelation < 0;
  let verdict: Verdict;
  if (hardFault || score < 55) verdict = 'work';
  else if (score < 80) verdict = 'almost';
  else verdict = 'ship';

  const verdictWord = verdict === 'ship' ? 'SHIP IT' : verdict === 'almost' ? 'ALMOST' : 'NEEDS WORK';
  const face: FaceMood = verdict === 'ship' ? 'happy' : verdict === 'almost' ? 'thinking' : 'worried';

  // --- translated headline stats ---
  const lufsLo = g.lufs[0], lufsHi = g.lufs[1];
  const loudnessHuman =
    a.lufsEstimate > lufsHi + 1 ? 'louder than this style needs'
    : a.lufsEstimate < lufsLo - 2 ? 'quiet next to released tracks'
    : 'sits right for streaming';
  const truePeakHuman =
    a.truePeakEstimate > -1 ? 'clipping risk after conversion'
    : a.truePeakEstimate > -1.5 ? 'a touch hot' : 'safe headroom';
  const monoHuman =
    a.phaseCorrelation < 0 ? 'parts cancel in mono'
    : a.phaseCorrelation < 0.2 ? 'very wide, check on phones' : 'plays safe on phone speakers';

  // --- per-band read ---
  const lowState = lowGap > g.lowGap[1] ? 'high' : lowGap < g.lowGap[0] ? 'low' : 'ok';
  const highState = highGap > g.highGap[1] ? 'high' : highGap < g.highGap[0] ? 'low' : 'ok';
  const bands: BandRead[] = [
    {
      key: 'low', label: 'Mud & weight', state: lowState as BandRead['state'],
      human: lowState === 'high' ? 'low end is sitting on everything else'
        : lowState === 'low' ? 'could use more weight down low' : 'low end is in its lane'
    },
    {
      key: 'mid', label: 'Body', state: 'ok',
      human: 'mids carry the track, looking steady'
    },
    {
      key: 'high', label: 'Air & sparkle', state: highState as BandRead['state'],
      human: highState === 'high' ? 'highs read bright, can get brittle'
        : highState === 'low' ? 'a little dark up top' : 'top end is balanced'
    },
  ];

  // lean toward the worst band (for Cue to physically point at it)
  const lowMag = lowState === 'ok' ? 0 : Math.abs(lowGap - (lowState === 'high' ? g.lowGap[1] : g.lowGap[0]));
  const highMag = highState === 'ok' ? 0 : Math.abs(highGap - (highState === 'high' ? g.highGap[1] : g.highGap[0]));
  const lean = lowMag >= highMag ? (lowMag > 0 ? -1 : 0) : (highMag > 0 ? 1 : 0);

  return { score, verdict, verdictWord, face, loudnessHuman, truePeakHuman, monoHuman, bands, lean };
}
