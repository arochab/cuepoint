// Cue's memory of your progress - LOCAL FIRST, no account, nothing leaves the device.
// This is what turns a one-off analyzer into a companion: Cue can say "your low end
// improved since last time". Stored in localStorage, capped, easy to clear.

export interface AnalysisRecord {
  at: number;            // timestamp (ms)
  fileName: string;
  lufs: number;
  truePeak: number;
  phase: number;
  lowEnergy: number;
  midEnergy: number;
  topIssue: string;      // issue type that dominated, or 'healthy'
  safeForDemo: boolean;
  score?: number;        // Mix Score 0..100 (added for "Cue remembers")
}

// "Cue remembers" - the retention wedge. On re-upload Cue can say, concretely:
// "Last time your low end was +4 dB boomy. Now +1. You got it." This struct backs the
// centerpiece memory card; null headline = first track, nothing to compare yet.
export interface MemoryReadout {
  isReturning: boolean;      // has Cue heard this producer before?
  sameTrack: boolean;        // is this likely the same file, re-bounced?
  prevScore: number | null;
  scoreDelta: number | null; // current - previous (null if either score missing)
  headline: string | null;   // the one line Cue says about progress
  trackCount: number;        // how many tracks Cue has heard total
}

const KEY = 'cuepoint.history.v1';
const MAX = 50;

function read(): AnalysisRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AnalysisRecord[]) : [];
  } catch {
    return [];
  }
}

function write(list: AnalysisRecord[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX)));
  } catch {
    // storage full or blocked - progression is a nice-to-have, never fatal
  }
}

export function recordAnalysis(rec: AnalysisRecord): void {
  const list = read();
  list.push(rec);
  write(list);
}

export function getHistory(): AnalysisRecord[] {
  return read();
}

export function clearHistory(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

// Cue's one-line progress note: compares this analysis to the previous one.
// Returns null when there's nothing meaningful to say (first run, or no change).
export function progressNote(current: AnalysisRecord): string | null {
  const list = read();
  // The current record may already be stored; find the previous distinct one.
  const prior = list.filter((r) => r.at < current.at);
  if (prior.length === 0) return null;
  const last = prior[prior.length - 1];

  // Low-end balance is the most common pain - lead with it when it moved.
  const lowGapNow = current.lowEnergy - current.midEnergy;
  const lowGapThen = last.lowEnergy - last.midEnergy;
  if (lowGapThen - lowGapNow >= 2) return 'Your low end is tighter than last time. Nice progress.';
  if (lowGapNow - lowGapThen >= 2) return 'Low end is heavier than your last track - worth a check.';

  if (last.truePeak > -0.5 && current.truePeak <= -1) return 'You fixed your headroom since last time. That sticks.';
  if (current.safeForDemo && !last.safeForDemo) return 'This one cleared the bar your last track did not. Keep going.';

  const total = list.length;
  if (total >= 3) return `That is ${total} tracks Cue has heard from you. You are building an ear.`;
  return null;
}

// Rich comparison for the "Cue remembers" card. Prefers comparing against the SAME
// track (matched by file name) if seen before - that is where the "you fixed it" story
// is strongest - otherwise falls back to the previous track overall.
export function compareToLast(current: AnalysisRecord): MemoryReadout {
  const list = read();
  const prior = list.filter((r) => r.at < current.at);
  const trackCount = prior.length + 1;

  if (prior.length === 0) {
    return { isReturning: false, sameTrack: false, prevScore: null, scoreDelta: null, headline: null, trackCount };
  }

  const sameName = prior.filter((r) => r.fileName === current.fileName);
  const ref = sameName.length ? sameName[sameName.length - 1] : prior[prior.length - 1];
  const sameTrack = sameName.length > 0;

  const lowGapNow = current.lowEnergy - current.midEnergy;
  const lowGapThen = ref.lowEnergy - ref.midEnergy;
  const scoreDelta = current.score != null && ref.score != null ? current.score - ref.score : null;

  let headline: string | null = null;
  if (sameTrack) {
    // Same file re-bounced: tell them precisely whether the fix landed.
    if (lowGapThen - lowGapNow >= 2)
      headline = `Last time your low end was +${Math.round(lowGapThen)} dB heavy. Now +${Math.round(Math.max(0, lowGapNow))}. You got it.`;
    else if (ref.truePeak > -1 && current.truePeak <= -1)
      headline = 'Your true peak was over the ceiling last time. Fixed. That sticks.';
    else if (scoreDelta != null && scoreDelta >= 4)
      headline = `Same track, ${scoreDelta} points cleaner than your last bounce. It is working.`;
    else if (scoreDelta != null && scoreDelta <= -4)
      headline = 'This bounce scored lower than the last one. Worth an A/B before you commit.';
    else
      headline = 'Cue checked this against your last bounce of it. Close - here is the next move.';
  } else {
    headline = progressNote(current);
  }

  return { isReturning: true, sameTrack, prevScore: ref.score ?? null, scoreDelta, headline, trackCount };
}
