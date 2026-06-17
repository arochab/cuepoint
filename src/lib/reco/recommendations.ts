// Contextual recommendation layer - "The Move".
// When Cue resolves a problem, it points to the concrete kind of tool/sound that fixes it.
// USEFUL FIRST: the recommendation is genuinely the right fix; monetization (a sponsored
// partner filling a slot) is invisible to the user and never overrides usefulness.
// Vendor-neutral by design - any partner can fill a slot later; trust is the asset.

import type { IssueType } from './issueTypes.js';

export interface Recommendation {
  kind: 'tool' | 'sound' | 'technique';
  title: string;        // what to reach for
  why: string;          // why it fixes THIS issue (plain language)
  category: string;     // neutral category a partner could be matched to
  sponsored?: { partner: string; url: string } | null; // null = organic; filled later, honestly labeled
}

// Map each issue to its genuine fix. Sponsored stays null until a real, relevant partner exists.
const MAP: Record<IssueType, Recommendation> = {
  headroom: {
    kind: 'tool',
    title: 'A true-peak limiter',
    why: 'Catches inter-sample peaks so your master stops clipping when it gets encoded.',
    category: 'mastering-limiter',
    sponsored: null
  },
  phase: {
    kind: 'tool',
    title: 'A mono-maker / correlation tool',
    why: 'Keeps your low end mono and your image safe when the track folds to mono.',
    category: 'stereo-imaging',
    sponsored: null
  },
  'top-end': {
    kind: 'technique',
    title: 'A gentle high shelf, not a boost',
    why: 'Tames the edge without making the whole mix brittle on long listens.',
    category: 'eq-de-esser',
    sponsored: null
  },
  'low-end': {
    kind: 'technique',
    title: 'Carve kick and bass ownership',
    why: 'Pull the sub level and split kick vs bass by frequency (and sidechain) so the low end is big without piling up. Adding another sub rarely fixes too much low end.',
    category: 'low-end-eq',
    sponsored: null
  },
  loudness: {
    kind: 'tool',
    title: 'A loudness meter you trust',
    why: 'Lets you push to a target on purpose instead of guessing.',
    category: 'loudness-meter',
    sponsored: null
  },
  healthy: {
    kind: 'technique',
    title: 'One trusted reference track',
    why: 'A/B against something you love and match only the biggest difference you hear.',
    category: 'reference',
    sponsored: null
  }
};

export function recommendationFor(issue: IssueType): Recommendation {
  return MAP[issue] ?? MAP.healthy;
}
