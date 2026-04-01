import { supabase } from '../supabase/client.js';
import type {
  UserFavorite,
  UserRecipeNote,
  Project,
  ProjectRecipe,
  ChecklistItem,
  ProjectComment,
  ProjectMember
} from '../types/index.js';

function unwrap<T>(payload: { data: T | null; error: Error | null }, fallback: T): T {
  if (payload.error) throw payload.error;
  return payload.data ?? fallback;
}

function relationMissing(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error ?? '');
  return /does not exist|Could not find|relation|schema cache/i.test(msg);
}

async function touchProject(projectId: string) {
  const { error } = await supabase.from('projects').update({ updated_at: new Date().toISOString() }).eq('id', projectId);
  if (error) throw error;
}

export async function getFavorites(userId: string): Promise<string[]> {
  const payload = await supabase.from('user_favorites').select('recipe_id').eq('user_id', userId);
  return unwrap(payload, []).map((row: { recipe_id: string }) => row.recipe_id);
}

export async function toggleFavorite(userId: string, recipeId: string, current: boolean) {
  if (current) {
    const { error } = await supabase.from('user_favorites').delete().eq('user_id', userId).eq('recipe_id', recipeId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('user_favorites').insert({ user_id: userId, recipe_id: recipeId });
    if (error) throw error;
  }
}

export async function getNotes(userId: string): Promise<UserRecipeNote[]> {
  const payload = await supabase.from('user_recipe_notes').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
  return unwrap(payload, []);
}

export async function saveNote(userId: string, recipeId: string, content: string) {
  // Upsert on the (user_id, recipe_id) unique constraint — atomic, no race condition
  const { error } = await supabase
    .from('user_recipe_notes')
    .upsert({ user_id: userId, recipe_id: recipeId, content, updated_at: new Date().toISOString() }, { onConflict: 'user_id,recipe_id' });
  if (error) throw error;
}

export async function getProjects(userId: string): Promise<Project[]> {
  const ownPayload = await supabase.from('projects').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
  const own = unwrap(ownPayload, [] as Project[]);

  try {
    const membershipPayload = await supabase.from('project_members').select('project_id').eq('user_id', userId);
    const memberships = unwrap(membershipPayload, [] as Array<{ project_id: string }>);
    if (!memberships.length) return own;
    const ids = memberships.map((m) => m.project_id).filter((id) => !own.some((project) => project.id === id));
    if (!ids.length) return own;
    const sharedPayload = await supabase.from('projects').select('*').in('id', ids).order('updated_at', { ascending: false });
    const shared = unwrap(sharedPayload, [] as Project[]);
    return [...own, ...shared].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  } catch (error) {
    if (relationMissing(error)) return own;
    throw error;
  }
}

export async function createProject(userId: string, name: string, description: string): Promise<Project | null> {
  const payload = await supabase.from('projects').insert({ user_id: userId, name, description }).select().single();
  return unwrap(payload, null);
}

export async function deleteProject(id: string) {
  await Promise.allSettled([
    supabase.from('project_comments').delete().eq('project_id', id),
    supabase.from('project_members').delete().eq('project_id', id),
    supabase.from('project_checklist_items').delete().eq('project_id', id),
    supabase.from('project_recipes').delete().eq('project_id', id),
  ]);
  const project = await supabase.from('projects').delete().eq('id', id);
  if (project.error) throw project.error;
}

export async function getProjectRecipes(projectId: string): Promise<string[]> {
  const payload = await supabase.from('project_recipes').select('recipe_id').eq('project_id', projectId);
  return unwrap(payload, []).map(// .select('recipe_id') returns partial rows — only type the field we asked for
  (row: { recipe_id: string }) => row.recipe_id);
}

export async function addRecipeToProject(projectId: string, recipeId: string) {
  const { error } = await supabase.from('project_recipes').upsert({ project_id: projectId, recipe_id: recipeId }, { onConflict: 'project_id,recipe_id' });
  if (error) throw error;
  await touchProject(projectId);
}

export async function removeRecipeFromProject(projectId: string, recipeId: string) {
  const { error } = await supabase.from('project_recipes').delete().eq('project_id', projectId).eq('recipe_id', recipeId);
  if (error) throw error;
  await touchProject(projectId);
}

export async function getChecklist(projectId: string): Promise<ChecklistItem[]> {
  const payload = await supabase.from('project_checklist_items').select('*').eq('project_id', projectId).order('sort_order');
  return unwrap(payload, []);
}

export async function addChecklistItem(projectId: string, label: string, sortOrder: number): Promise<ChecklistItem | null> {
  const payload = await supabase.from('project_checklist_items').insert({ project_id: projectId, label, sort_order: sortOrder }).select().single();
  const item = unwrap(payload, null);
  await touchProject(projectId);
  return item;
}

export async function toggleChecklistItem(id: string, done: boolean) {
  const { data, error } = await supabase.from('project_checklist_items').update({ done }).eq('id', id).select('project_id').single();
  if (error) throw error;
  if (data?.project_id) await touchProject(data.project_id);
}

export async function deleteChecklistItem(id: string) {
  const { data, error } = await supabase.from('project_checklist_items').delete().eq('id', id).select('project_id').single();
  if (error) throw error;
  if (data?.project_id) await touchProject(data.project_id);
}

export async function getProjectMembers(projectId: string): Promise<ProjectMember[]> {
  try {
    const payload = await supabase.from('project_members').select('*').eq('project_id', projectId).order('created_at');
    return unwrap(payload, []);
  } catch (error) {
    if (relationMissing(error)) return [];
    throw error;
  }
}

export async function addProjectMember(projectId: string, userId: string | null, email: string, role: ProjectMember['role']) {
  try {
    const payload = await supabase
      .from('project_members')
      .upsert({ project_id: projectId, user_id: userId, email: email.trim().toLowerCase(), role }, { onConflict: 'project_id,email' })
      .select()
      .single();
    const member = unwrap(payload, null);
    await touchProject(projectId);
    return member as ProjectMember | null;
  } catch (error) {
    if (relationMissing(error)) return null;
    throw error;
  }
}

export async function getProjectComments(projectId: string): Promise<ProjectComment[]> {
  try {
    const payload = await supabase.from('project_comments').select('*').eq('project_id', projectId).order('created_at');
    return unwrap(payload, []);
  } catch (error) {
    if (relationMissing(error)) return [];
    throw error;
  }
}

export async function addProjectComment(projectId: string, authorEmail: string, message: string) {
  try {
    const payload = await supabase
      .from('project_comments')
      .insert({ project_id: projectId, author_email: authorEmail, message })
      .select()
      .single();
    const comment = unwrap(payload, null);
    await touchProject(projectId);
    return comment as ProjectComment | null;
  } catch (error) {
    if (relationMissing(error)) return null;
    throw error;
  }
}

export async function exportProject(project: Project, recipeIds: string[], checklist: ChecklistItem[]) {
  const payload = { project, recipeIds, checklist, exportedAt: new Date().toISOString(), version: '1.2' };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${project.name.replace(/\s+/g, '-').toLowerCase()}-export.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
