import type { CoachProvider, CoachInput } from './types.js';

// The default coach: free, instant, offline. It doesn't "reason" - it assembles a
// warm, plain-language read from the diagnosis the DSP engine already produced.
// This is what most users get, and it never needs a download or WebGPU.
export const rulesProvider: CoachProvider = {
  id: 'rules',
  label: 'Cue (instant)',
  isAvailable: () => true,

  async explain(input: CoachInput): Promise<string> {
    const { safeForDemo, issues, topRecipe } = input;
    const lead = safeForDemo
      ? "Nice - this is in good shape."
      : "You're close. One thing is worth fixing before you share this.";

    const top = issues[0];
    let body = '';
    if (top && top.title) {
      body = ` ${top.summary}`;
    }

    let next = '';
    if (topRecipe) {
      next = ` The fastest move: open the ${topRecipe} recipe, make one change, then A/B on small speakers and stop.`;
    } else if (!safeForDemo) {
      next = ' Fix that one thing first, then trust your ears for the rest.';
    } else {
      next = ' Compare against one reference track and adjust only the biggest mismatch you hear.';
    }

    return (lead + body + next).trim();
  }
};
