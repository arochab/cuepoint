// Producer-voice FR text for the verdict screen — the screenshot moment, so it CANNOT be
// half-English (UX-jury non-negotiable). One short, human sentence per issue, tutoiement,
// studio jargon kept where a French producer actually says it (kick, mono, true peak, LUFS).
//
// EN strings are provided too so the FR/EN toggle stays honest end-to-end.

import { type IssueType, TP_CEILING_DBTP, TP_CLIP_DBTP, PHASE_SECTION_CANCEL } from './issueTypes.js';
import type { AudioAnalysis } from '../utils/audio.js';
import type { MixScore } from './score.js';
import { i18n } from '../i18n/index.svelte.js';

type Bi = { fr: string; en: string };

// The one-line "what's wrong" sentence, in producer voice, per issue. Some issues are
// STATE-AWARE (headroom, phase): the same issue type means different things depending on
// the real measurement, so the copy branches on it — a SHIP master that's only a hair hot
// must never read "it will clip", and a wide-but-positive master must never read "parts
// cancel". This is the no-bluff invariant: the sentence can't contradict the receipt.
const SUMMARY: Record<IssueType, Bi> = {
  // headroom: hot-but-safe variant (default); the over-ceiling clip variant is below.
  headroom: {
    fr: 'Dernier point avant d’envoyer : ton true peak est un peu chaud, ramène le ceiling à -1 dBTP.',
    en: 'One last thing before you ship: your true peak is a touch hot — set the ceiling to -1 dBTP.',
  },
  phase: {
    fr: 'Image large — vérifie que le bas et les parties clés tiennent en mono avant d’élargir plus.',
    en: 'Wide image — confirm the low end and key parts survive a mono fold before widening more.',
  },
  'top-end': {
    fr: 'Le haut du spectre est dur — un shelf doux sur les aigus, pas un boost sur tout le mix.',
    en: 'The top end reads harsh — a gentle high shelf, not a boost across the whole mix.',
  },
  'low-end': {
    fr: 'Le bas mange les mids — donne au kick et à la basse chacun leur étage, pas plus de sub.',
    en: 'The low end is covering the mids — give kick and bass each their own lane, not more sub.',
  },
  loudness: {
    fr: 'Ça lit faible à côté des refs — laisse-le pour la fin si le mix n’est pas terminé.',
    en: 'It reads quiet next to references — leave it for last if the mix is unfinished.',
  },
  healthy: {
    fr: 'Rien de rouge ne ressort. Compare à une réf que tu aimes et ajuste le plus gros écart, c’est tout.',
    en: 'Nothing red stands out. Compare to a reference you love and adjust the biggest gap, that’s it.',
  },
};

// State-aware overrides keyed on the real measurement.
// Two headroom variants, tier-matched to the card (diagnostics.ts) and the verdict (score.ts):
//   > TP_CLIP_DBTP : genuinely clips (the card is HIGH-severity, the verdict can't ship)
//   0..TP_CLIP     : over 0, can clip on encode — a real but small note (still ships)
const HEADROOM_HARDCLIP: Bi = {
  fr: 'Ton true peak dépasse le plafond — à l’encodage, ça va clipper. Baisse le ceiling à -1 dBTP.',
  en: 'Your true peak is over the ceiling — it will clip once encoded. Drop the ceiling to -1 dBTP.',
};
const HEADROOM_CLIP: Bi = {
  fr: 'Ton true peak passe au-dessus de 0 — à l’encodage lossy, ça peut clipper. Ramène le ceiling à -1 dBTP.',
  en: 'Your true peak is over 0 — it can clip on lossy encoding. Set the ceiling to -1 dBTP.',
};
const PHASE_CANCEL: Bi = {
  fr: 'En mono, des éléments s’annulent — vérifie la polarité et les reverbs avant tout le reste.',
  en: 'In mono, parts cancel out — check polarity and reverbs before anything else.',
};
const PHASE_SECTION: Bi = {
  fr: 'Une section s’annule en mono — repère le passage le plus large et corrige sa polarité.',
  en: 'A section cancels in mono — find the widest passage and fix its polarity.',
};

// The one-line summary. Pass the analysis + the verdict so headroom/phase branch on the
// REAL state — the sentence can never contradict the verdict or the honesty receipt.
// `verdict` is the score.ts tier ('ship' | 'almost' | 'work'); when the mix already SHIPs,
// a hot true peak is a last-call note, not a "it will clip" condemnation.
export function issueSummary(issue: IssueType, a?: AudioAnalysis, verdict?: string): string {
  const loc = i18n.locale;
  if (a) {
    if (issue === 'headroom') {
      // Tier-matched to the card + verdict (shared TP_CLIP_DBTP / TP_CEILING_DBTP):
      //   > +1 dBTP -> "it WILL clip" (high-severity card, verdict can't ship)
      //   0..+1     -> "can clip on encode" (low-severity note, still ships)
      //   -1..0     -> hot-but-safe last-call note
      if (a.truePeakEstimate > TP_CLIP_DBTP) return HEADROOM_HARDCLIP[loc];
      if (a.truePeakEstimate > TP_CEILING_DBTP) return HEADROOM_CLIP[loc];
      return SUMMARY.headroom[loc];
    }
    if (issue === 'phase') {
      if (a.phaseCorrelation < 0) return PHASE_CANCEL[loc];
      if (a.phaseCorrelationMin < PHASE_SECTION_CANCEL) return PHASE_SECTION[loc];
      return SUMMARY.phase[loc];   // wide-but-positive
    }
  }
  return SUMMARY[issue][loc];
}

// The honesty receipt: one Ash line under the verdict that makes "no bluff" visible —
// what Cue actually heard, built from real measurements. e.g.
//   FR: "entendu : bas +6 dB · phase ok · pic -0.4 dB"
export function honestyReceipt(mix: MixScore, a: AudioAnalysis): string {
  const loc = i18n.locale;
  const lowGap = Math.round(a.lowEnergy - a.midEnergy);
  const lowTxt = (loc === 'fr' ? 'bas ' : 'low ') + (lowGap >= 0 ? '+' : '') + lowGap + ' dB';
  const phaseTxt = (loc === 'fr' ? 'phase ' : 'phase ') +
    (a.phaseCorrelation < 0 ? (loc === 'fr' ? 'annule' : 'cancels')
      : a.phaseCorrelation < 0.2 ? (loc === 'fr' ? 'large' : 'wide')
      : 'ok');
  const tpTxt = (loc === 'fr' ? 'pic ' : 'peak ') + a.truePeakEstimate + ' dBTP';
  const lufsTxt = a.lufsEstimate + ' LUFS';
  const heard = loc === 'fr' ? 'entendu' : 'heard';
  return `${heard} : ${lowTxt} · ${phaseTxt} · ${tpTxt} · ${lufsTxt}`;
}
