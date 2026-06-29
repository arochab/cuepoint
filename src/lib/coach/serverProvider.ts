import type { CoachProvider, CoachInput, CoachProgress } from './types.js';
import { supabase } from '../supabase/client.js';

// Cloud AI coach. The LLM API key lives ONLY in the Supabase Edge Function `coach`;
// the browser calls it with the user's JWT, the server verifies a PAID entitlement for
// this analysis BEFORE spending anything, then calls the LLM. The DSP diagnosis is the
// source of truth - the LLM only rephrases verified numbers.

// Honest cost estimate shown to the user (the owner funds the API for now).
export const ESTIMATED_COST_EUR = 0.03;

// The analysis row id is needed so the server can match the entitlement. Set by the UI
// after the analysis is saved to the `analyses` table.
let currentAnalysisId: string | null = null;
export function setCoachAnalysisId(id: string | null) { currentAnalysisId = id; }

export const serverProvider: CoachProvider = {
  id: 'server',
  label: 'Cue (AI coach)',

  // Available when signed in. Authorization (credits / unlimited admin) is enforced
  // server-side by the coach function, not by a saved-analysis precondition.
  async isAvailable() {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  },

  async explain(input: CoachInput, onProgress?: CoachProgress): Promise<string> {
    onProgress?.({ stage: 'Asking Cue…' });
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) throw new Error('not-signed-in');

    const { data, error } = await supabase.functions.invoke('coach', {
      body: { ...input, analysisId: currentAnalysisId }
    });
    if (error) {
      // supabase-js wraps any non-2xx in a FunctionsHttpError whose .message is a generic
      // "non-2xx status code" string — it does NOT contain the status. The real status +
      // body live on error.context (the Response). Read the body to detect the 402 paywall.
      let status = 0; let bodyErr = '';
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.status === 'number') {
        status = ctx.status;
        try { const j = await ctx.clone().json(); bodyErr = String(j?.error ?? ''); } catch { /* ignore */ }
      }
      if (status === 402 || bodyErr === 'payment-required') throw new Error('payment-required');
      throw new Error('coach-unavailable');
    }
    return (data?.coaching as string)?.trim() || '';
  }
};
