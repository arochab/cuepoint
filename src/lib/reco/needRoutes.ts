// Deterministic need → route resolution. This is the anti-bluff layer the UX jury
// demanded: a recipe is matched to a producer need by its explicit `recipe.need`
// field, NOT by brittle tag overlap. Cue can only ever hand over a route the DSP
// can actually support, because the mapping is structural.
//
// DSP → need merge: the analyzer's IssueType has 6 values, but `headroom` and
// `loudness` are two detections of ONE producer need ("too loud / not loud enough").
// We merge them into 'loudness' here so the cold-entry door shows exactly the needs
// that have a route. 'healthy' has no recipe — it IS a verdict, so it routes to upload.

import type { Recipe, RecipeNeed } from '../types/index.js';
import type { IssueType } from './issueTypes.js';
import { recipes } from '../data/recipes.js';

// The 4 diagnostic needs that have routes (+ character, browse-only).
export const DIAGNOSTIC_NEEDS: RecipeNeed[] = ['low-end', 'phase', 'top-end', 'loudness'];

// Map a DSP IssueType to the producer need it expresses. 'healthy' returns null
// (it is a verdict, not a routable need).
export function issueToNeed(issue: IssueType): RecipeNeed | null {
  switch (issue) {
    case 'low-end': return 'low-end';
    case 'phase': return 'phase';
    case 'top-end': return 'top-end';
    case 'loudness':
    case 'headroom': return 'loudness';   // both express "loudness/headroom"
    case 'healthy': return null;
    default: return null;
  }
}

// Every recipe that answers a given need, in catalogue order (stable, no scoring).
export function routesForNeed(need: RecipeNeed): Recipe[] {
  return recipes.filter((r) => r.need === need);
}

// The single best route for a need — deterministic: the first catalogue match.
export function bestRouteForNeed(need: RecipeNeed): Recipe | null {
  return routesForNeed(need)[0] ?? null;
}

// The browse-only character lane (taste, never a verdict).
export function characterRoutes(): Recipe[] {
  return recipes.filter((r) => r.need === 'character');
}

// Suggestions for a verdict: turn the analyzer's active issues into up to 3 routes,
// deduped, diagnostic-needs only. Replaces the old tag-overlap suggestRecipes().
export function suggestionsForIssues(issues: IssueType[]): Recipe[] {
  const seen = new Set<string>();
  const out: Recipe[] = [];
  for (const issue of issues) {
    const need = issueToNeed(issue);
    if (!need) continue;
    for (const recipe of routesForNeed(need)) {
      if (seen.has(recipe.id)) continue;
      seen.add(recipe.id);
      out.push(recipe);
      if (out.length >= 3) return out;
    }
  }
  return out;
}
