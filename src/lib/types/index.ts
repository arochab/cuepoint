export type RecipeCategory = 'sound-design' | 'mixing' | 'mastering';

// A recipe's diagnostic need — the producer-voice problem it answers. This is what
// makes Cue physically unable to bluff a route the DSP can't support: the cold-entry
// question and the post-verdict fix both route off `need`, not brittle tag overlap.
// The 4 diagnostic needs map 1:1 to what the DSP truly hears (headroom+loudness merge
// into 'loudness' at the routing layer); 'character' is browse-only, never a verdict.
export type RecipeNeed = 'low-end' | 'phase' | 'top-end' | 'loudness' | 'character';

export interface RecipeStep {
  plugin: string;
  role: string;
  params: string;
}

export interface Recipe {
  id: string;
  title: string;
  category: RecipeCategory;
  need: RecipeNeed;
  goal: string;
  tags: string[];        // internal-only now: search/filter UI is deleted, kept for matching depth
  chain: RecipeStep[];
  ableton_notes: string;
  native_alt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

export interface UserFavorite {
  user_id: string;
  recipe_id: string;
}

export interface UserRecipeNote {
  id: string;
  user_id: string;
  recipe_id: string;
  content: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectRecipe {
  project_id: string;
  recipe_id: string;
}

export interface ChecklistItem {
  id: string;
  project_id: string;
  label: string;
  done: boolean;
  sort_order: number;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  // user_id is null until the invited person logs in and Supabase resolves their account
  user_id: string | null;
  email: string;
  role: 'owner' | 'teacher' | 'friend' | 'reviewer';
  created_at: string;
}

export interface ProjectComment {
  id: string;
  project_id: string;
  author_email: string;
  message: string;
  created_at: string;
}

// 'recipes' (the standalone library) was deleted by the UX jury — recipe-detail survives,
// reached from a verdict (Path A) or a cold need-question (Path B), never a library tab.
export type Route = 'home' | 'recipe-detail' | 'analyzer' | 'projects' | 'project-detail' | 'admin';

// Admin dashboard shapes (read via service-aware RPC / RLS-gated selects).
export interface AdminUserRow {
  id: string;
  email: string;
  display_name: string | null;
  is_admin: boolean;
  banned: boolean;
  credits: number;
  plan: string;
  created_at: string;
}

export interface AdminUsageRow {
  id: string;
  user_id: string | null;
  created_at: string;
  model: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  cost_usd: number | null;
}

export interface AdminLimits {
  daily_spend_usd: number;
  daily_cap_usd: number;
  killed: boolean;
  spend_date: string;
}

export interface AppState {
  route: Route;
  routeParam: string | null;
}
