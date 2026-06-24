import { describe, it, expect, afterEach } from 'vitest';
import { computeDiagnostics } from './diagnostics.js';
import { issueSummary } from './issueText.js';
import { scoreMix } from './score.js';
import { setLocale } from '../i18n/index.svelte.js';
import type { AudioAnalysis } from '../utils/audio.js';

afterEach(() => setLocale('fr'));   // restore the default locale between tests

function mk(p: Partial<AudioAnalysis>): AudioAnalysis {
  return {
    durationSec: 60, sampleRate: 44100, channels: 2,
    peakDb: -1, rmsDb: -12,
    lufsEstimate: -8, truePeakEstimate: -1, phaseCorrelation: 0.9, phaseCorrelationMin: 0.9,
    spectrum: [], spectrumFreqs: [],
    lowEnergy: -30, midEnergy: -50, highEnergy: -66, spectralTiltDbPerOct: -4.5,
    envelope: [],
    ...p,
  };
}
// the real reference master (W.A.R.R.I.O. - Bagatelle), measured by the live DSP
const BAGATELLE = mk({ lufsEstimate: -12.7, truePeakEstimate: 0.1, phaseCorrelation: 0.98, phaseCorrelationMin: -0.07, lowEnergy: -20.4, midEnergy: -41.5, highEnergy: -55.6 });

const types = (a: AudioAnalysis, g: Parameters<typeof computeDiagnostics>[1]) =>
  computeDiagnostics(a, g).issues.map((i) => i.type);

describe('computeDiagnostics — no phantom cards on a good master', () => {
  it('the reference master shows no PHANTOM tonal/phase cards (lowGap 21 is in-zone, -0.07 is not a cancel)', () => {
    for (const g of ['techno', 'other', 'deep-house', 'electro'] as const) {
      const t = types(BAGATELLE, g);
      expect(t, `genre ${g}`).toContain('headroom');           // +0.1 dBTP is worth a note
      expect(t, `genre ${g}`).not.toContain('low-end');        // lowGap 21 is in-zone -> no phantom bass card
      expect(t, `genre ${g}`).not.toContain('top-end');
      expect(t, `genre ${g}`).not.toContain('phase');          // a -0.07 window is normal stereo movement, not a cancel
    }
  });
  it('a loudness card only appears where -12.7 LUFS is genuinely quiet for the style', () => {
    // techno releases at -9..-6, so -12.7 IS legitimately quiet (an honest card, not a phantom);
    // "other" spans -13..-7, so -12.7 is in-zone -> no loudness card.
    expect(types(BAGATELLE, 'techno')).toContain('loudness');
    expect(types(BAGATELLE, 'other')).not.toContain('loudness');
  });
  it('a clean balanced master shows the healthy card only', () => {
    const clean = mk({ truePeakEstimate: -1.5, lufsEstimate: -8, lowEnergy: -30, midEnergy: -52, highEnergy: -67, phaseCorrelation: 0.7, phaseCorrelationMin: 0.6 });
    expect(types(clean, 'techno')).toEqual(['healthy']);
  });
});

describe('computeDiagnostics — real defects still surface', () => {
  it('a genuinely clipping master raises a high-severity headroom card', () => {
    const d = computeDiagnostics(mk({ truePeakEstimate: 1.5 }), 'techno');
    const h = d.issues.find((i) => i.type === 'headroom')!;
    expect(h.severity).toBe('high');
  });
  it('a polarity-flipped section raises a phase card even when whole-file reads safe', () => {
    expect(types(mk({ phaseCorrelation: 0.5, phaseCorrelationMin: -0.6 }), 'techno')).toContain('phase');
  });
  it('genuinely muddy low end raises a low-end card', () => {
    expect(types(mk({ lowEnergy: -10, midEnergy: -55, highEnergy: -70 }), 'techno')).toContain('low-end');
  });
  // DEFICIT side — the no-bluff fix: a dull/thin master must NOT read "healthy"/SHIP.
  it('a dull, dark master (lifeless top) raises a top-end card, not "healthy"', () => {
    // highGap well under techno floor (-24) and globally dark (tilt steeper than -6)
    const dull = mk({ lowEnergy: -30, midEnergy: -42, highEnergy: -72, spectralTiltDbPerOct: -8 });
    const t = types(dull, 'techno');
    expect(t).toContain('top-end');
    expect(t).not.toContain('healthy');
    expect(scoreMix(dull, 'techno').verdict).not.toBe('ship');   // verdict agrees with the card
    const card = computeDiagnostics(dull, 'techno').issues.find((i) => i.type === 'top-end')!;
    expect(card.title.toLowerCase()).toMatch(/dull/);             // deficit copy, not "bright"
  });
  it('a thin, weightless master raises a low-end (thin) card', () => {
    // lowGap well under techno floor (10)
    const thin = mk({ lowEnergy: -52, midEnergy: -50, highEnergy: -64, spectralTiltDbPerOct: -2 });
    const t = types(thin, 'techno');
    expect(t).toContain('low-end');
    expect(t).not.toContain('healthy');
    const card = computeDiagnostics(thin, 'techno').issues.find((i) => i.type === 'low-end')!;
    expect(card.title.toLowerCase()).toMatch(/thin/);
  });
  it('the reference master shows NO deficit card (not flagged dull or thin)', () => {
    for (const g of ['techno', 'other', 'deep-house', 'electro'] as const) {
      const cards = computeDiagnostics(BAGATELLE, g).issues;
      expect(cards.find((i) => i.title.toLowerCase().includes('dull')), `genre ${g}`).toBeUndefined();
      expect(cards.find((i) => i.title.toLowerCase().includes('thin')), `genre ${g}`).toBeUndefined();
    }
  });
  it('the one thing is severity-ranked (a high beats a low)', () => {
    // hot-but-safe headroom (low) + a clipping... use a real high vs low: muddy low (medium) over loudness (low)
    const d = computeDiagnostics(mk({ truePeakEstimate: 1.5, lowEnergy: -10, midEnergy: -55, highEnergy: -70 }), 'techno');
    expect(d.actionQueue[0].severity).toBe('high');
  });
});

// The core invariant: the headroom SENTENCE and the headroom CARD must agree on whether
// it clips. The card is high-severity at TP > 0; so the sentence must say "clip" iff TP > 0.
function headroomCard(a: AudioAnalysis) {
  return computeDiagnostics(a, 'techno').issues.find((i) => i.type === 'headroom');
}
const saysClip = (s: string) => /clip|clipper/.test(s.toLowerCase());

describe('the no-bluff invariant — headroom sentence, card and verdict never disagree', () => {
  // > +1 dBTP genuinely clips: HIGH-severity card, hard-clip sentence, verdict can't ship.
  it.each([1.5, 2.0, 3.0])('TP +%s dBTP: card high-severity, sentence warns clip, verdict NOT ship (all agree)', (tp) => {
    const a = mk({ truePeakEstimate: tp });
    expect(headroomCard(a)?.severity).toBe('high');
    expect(saysClip(issueSummary('headroom', a, scoreMix(a, 'techno').verdict))).toBe(true);
    expect(scoreMix(a, 'techno').verdict).not.toBe('ship');
  });
  // 0..+1 dBTP: over the ceiling but shippable — LOW-severity card, soft "can clip" note, still ships.
  it.each([0.1, 0.5, 1.0])('TP +%s dBTP: card low-severity, sentence says "can clip", verdict still ships (all agree)', (tp) => {
    const a = mk({ truePeakEstimate: tp, lufsEstimate: -8, lowEnergy: -30, midEnergy: -52, highEnergy: -67 });
    expect(headroomCard(a)?.severity).toBe('low');
    expect(saysClip(issueSummary('headroom', a, scoreMix(a, 'techno').verdict))).toBe(true); // honest: over 0 can clip
    expect(scoreMix(a, 'techno').verdict).toBe('ship');
  });
  it.each([-0.3, -0.5, -0.9])('TP %s dBTP: hot-but-safe — card low-severity AND sentence does NOT say clip (aligned)', (tp) => {
    const a = mk({ truePeakEstimate: tp });
    expect(headroomCard(a)?.severity).toBe('low');
    expect(saysClip(issueSummary('headroom', a, scoreMix(a, 'techno').verdict))).toBe(false);
  });
  it('the real reference master (+0.11 dBTP) is consistent: card LOW, sentence "can clip", verdict still SHIP', () => {
    expect(headroomCard(BAGATELLE)?.severity).toBe('low');
    expect(saysClip(issueSummary('headroom', BAGATELLE, scoreMix(BAGATELLE, 'other').verdict))).toBe(true);
    expect(scoreMix(BAGATELLE, 'other').verdict).toBe('ship'); // +0.1 is over 0 but doesn't condemn the master
  });
  it('a wide-but-positive master never says "parts cancel"', () => {
    const wide = mk({ phaseCorrelation: 0.15, phaseCorrelationMin: 0.1 });
    expect(issueSummary('phase', wide).toLowerCase()).not.toMatch(/cancel|s’annulent|s'annulent/);
  });
  it('a real cancellation DOES say parts cancel', () => {
    expect(issueSummary('phase', mk({ phaseCorrelation: -0.5, phaseCorrelationMin: -0.8 })).toLowerCase()).toMatch(/cancel|s’annulent|s'annulent/);
  });
});

// The verdict screen is the screenshot moment — EN copy must be exercised too, not just FR,
// so an EN-string drift on "will clip" / "cancel" can't regress with CI green (jury nit).
describe('EN-locale copy is honest too', () => {
  it('EN: a hard clipper says "will clip"; a 0..+1 peak says "can clip"; a cancellation says "cancel"', () => {
    setLocale('en');
    expect(issueSummary('headroom', mk({ truePeakEstimate: 3 }), 'work')).toMatch(/will clip/i);
    expect(issueSummary('headroom', mk({ truePeakEstimate: 0.5 }), 'ship')).toMatch(/can clip/i);
    expect(issueSummary('phase', mk({ phaseCorrelation: -0.5, phaseCorrelationMin: -0.8 }))).toMatch(/cancel/i);
    expect(issueSummary('headroom', mk({ truePeakEstimate: -0.5 }), 'ship')).not.toMatch(/clip/i); // hot-but-safe
  });
  it('EN: tonal copy is two-sided — "lacks air" for dull, "thin" for weightless', () => {
    setLocale('en');
    const dull = mk({ lowEnergy: -30, midEnergy: -42, highEnergy: -72, spectralTiltDbPerOct: -8 });
    expect(issueSummary('top-end', dull, 'almost', 'techno')).toMatch(/lacks air/i);
    const thin = mk({ lowEnergy: -52, midEnergy: -50, highEnergy: -64 });
    expect(issueSummary('low-end', thin, 'almost', 'techno')).toMatch(/thin/i);
  });
});
