// Tool-agnostic coaching layer (Omnigent spirit).
// The DSP engine is the SOURCE OF TRUTH for every number. A ReasoningProvider only
// turns that verified diagnosis into human, encouraging guidance in Cue's voice.
// Any engine - local rules, an in-browser open-source LLM, or some future model -
// implements the same interface, so the product never hard-binds to one vendor.

import type { AudioAnalysis } from '../utils/audio.js';

export interface CoachInput {
  fileName: string;
  analysis: AudioAnalysis;
  verdict: string;            // short punchy verdict (from the DSP layer)
  safeForDemo: boolean;
  issues: { title: string; severity: string; summary: string }[];
  topRecipe?: string;         // name of the first suggested recipe, if any
}

export type CoachProgress = (info: { stage: string; pct?: number }) => void;

export interface CoachProvider {
  readonly id: string;        // e.g. "rules", "webllm"
  readonly label: string;     // human label for the UI
  /** Is this provider usable in the current environment right now? */
  isAvailable(): Promise<boolean> | boolean;
  /** Warm up (e.g. download/instantiate the model). No-op for the rules engine. */
  prepare?(onProgress?: CoachProgress): Promise<void>;
  /** Produce a short, warm explanation of the (already-computed) diagnosis. */
  explain(input: CoachInput, onProgress?: CoachProgress): Promise<string>;
}
