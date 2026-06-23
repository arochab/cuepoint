// Producer-voice FR text for the verdict screen — the screenshot moment, so it CANNOT be
// half-English (UX-jury non-negotiable). One short, human sentence per issue, tutoiement,
// studio jargon kept where a French producer actually says it (kick, mono, true peak, LUFS).
//
// EN strings are provided too so the FR/EN toggle stays honest end-to-end.

import type { IssueType } from './issueTypes.js';
import type { AudioAnalysis } from '../utils/audio.js';
import type { MixScore } from './score.js';
import { i18n } from '../i18n/index.svelte.js';

type Bi = { fr: string; en: string };

// The one-line "what's wrong" sentence, in producer voice, per issue.
const SUMMARY: Record<IssueType, Bi> = {
  headroom: {
    fr: 'Ton true peak dépasse le plafond — au moindre encodage, ça va clipper. Baisse le ceiling à -1 dBTP.',
    en: 'Your true peak is over the ceiling — it will clip once encoded. Drop the ceiling to -1 dBTP.',
  },
  phase: {
    fr: 'En mono, des éléments s’annulent — vérifie la polarité et les reverbs avant tout le reste.',
    en: 'In mono, parts cancel out — check polarity and reverbs before anything else.',
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

export function issueSummary(issue: IssueType): string {
  return SUMMARY[issue][i18n.locale];
}

// FR/EN for the three human readings (mirror score.ts, localized).
const LOUD: Record<string, Bi> = {
  loud:  { fr: 'plus fort que ce style demande', en: 'louder than this style needs' },
  quiet: { fr: 'faible à côté des sorties', en: 'quiet next to released tracks' },
  ok:    { fr: 'calé pour le streaming', en: 'sits right for streaming' },
};
const TP: Record<string, Bi> = {
  clip: { fr: 'risque de clip après conversion', en: 'clipping risk after conversion' },
  hot:  { fr: 'un poil chaud', en: 'a touch hot' },
  safe: { fr: 'marge saine', en: 'safe headroom' },
};
const MONO: Record<string, Bi> = {
  cancel: { fr: 'des éléments s’annulent en mono', en: 'parts cancel in mono' },
  wide:   { fr: 'très large, vérifie au casque', en: 'very wide, check on phones' },
  safe:   { fr: 'tient sur un haut-parleur de tél', en: 'plays safe on phone speakers' },
};

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
