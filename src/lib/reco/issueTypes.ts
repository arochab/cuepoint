// Shared issue taxonomy. The analyzer detects these from the (verified) DSP metrics;
// the recommendation engine and progression tracking key off the same names.
export type IssueType = 'headroom' | 'phase' | 'top-end' | 'low-end' | 'loudness' | 'healthy';
