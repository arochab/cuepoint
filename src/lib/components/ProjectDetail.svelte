<script lang="ts">
  import type { Project, ChecklistItem, ProjectComment, ProjectMember } from '../types/index.js';
  import { recipes } from '../data/recipes.js';
  import {
    getChecklist,
    addChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
    removeRecipeFromProject,
    exportProject,
    getProjectComments,
    addProjectComment,
    getProjectMembers,
    addProjectMember
  } from '../utils/db.js';

  let { projectId, projects, projectRecipeMap, onBack, onProjectsChanged, onRecipesChanged, onOpenRecipe, user }: {
    projectId: string;
    projects: Project[];
    projectRecipeMap: Record<string, string[]>;
    onBack: () => void;
    onProjectsChanged: () => void;
    onRecipesChanged: () => void;
    onOpenRecipe: (id: string) => void;
    user: { id: string; email?: string } | null;
  } = $props();

  let checklist = $state<ChecklistItem[]>([]);
  let comments = $state<ProjectComment[]>([]);
  let members = $state<ProjectMember[]>([]);
  let newItem = $state('');
  let newComment = $state('');
  let inviteEmail = $state('');
  let inviteRole = $state<ProjectMember['role']>('friend');
  let loading = $state(true);
  let savingComment = $state(false);

  const project = $derived(projects.find((entry) => entry.id === projectId));
  const recipeIds = $derived(projectRecipeMap[projectId] ?? []);
  const projectRecipes = $derived(recipeIds.map((id) => recipes.find((recipe) => recipe.id === id)).filter(Boolean));
  const doneCount = $derived(checklist.filter((item) => item.done).length);
  const progress = $derived(checklist.length ? Math.round((doneCount / checklist.length) * 100) : 0);
  const visibleMembers = $derived.by(() => {
    const base = members.slice();
    if (user?.email && !base.some((member) => member.email === user.email)) {
      return [{ id: 'self-owner', project_id: projectId, email: user.email, role: 'owner', created_at: new Date().toISOString() }, ...base];
    }
    return base;
  });


  async function loadWorkspace(id: string) {
    loading = true;
    try {
      const [nextChecklist, nextComments, nextMembers] = await Promise.all([
        getChecklist(id),
        getProjectComments(id),
        getProjectMembers(id)
      ]);
      checklist = nextChecklist;
      comments = nextComments;
      members = nextMembers;
    } catch (error) {
      console.error('Project workspace load failed:', error);
      checklist = [];
      comments = [];
      members = [];
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    if (projectId) loadWorkspace(projectId);
  });

  async function handleAddItem() {
    if (!newItem.trim()) return;
    try {
      const item = await addChecklistItem(projectId, newItem.trim(), checklist.length);
      if (item) checklist = [...checklist, item];
      newItem = '';
      await onProjectsChanged();
    } catch (error) {
      console.error('Checklist add failed:', error);
    }
  }

  async function handleToggle(item: ChecklistItem) {
    try {
      await toggleChecklistItem(item.id, !item.done);
      checklist = checklist.map((entry) => entry.id === item.id ? { ...entry, done: !entry.done } : entry);
      await onProjectsChanged();
    } catch (error) {
      console.error('Checklist toggle failed:', error);
    }
  }

  async function handleDeleteItem(id: string) {
    try {
      await deleteChecklistItem(id);
      checklist = checklist.filter((entry) => entry.id !== id);
      await onProjectsChanged();
    } catch (error) {
      console.error('Checklist delete failed:', error);
    }
  }

  async function handleRemoveRecipe(recipeId: string) {
    try {
      await removeRecipeFromProject(projectId, recipeId);
      await onRecipesChanged();
      await onProjectsChanged();
    } catch (error) {
      console.error('Remove recipe failed:', error);
    }
  }

  async function handleAddComment() {
    if (!newComment.trim() || !user?.email || savingComment) return;
    savingComment = true;
    try {
      const comment = await addProjectComment(projectId, user.email, newComment.trim());
      if (comment) comments = [...comments, comment];
      newComment = '';
      await onProjectsChanged();
    } catch (error) {
      console.error('Comment add failed:', error);
    } finally {
      savingComment = false;
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    try {
      const member = await addProjectMember(projectId, null, inviteEmail, inviteRole);
      if (member) members = [...members.filter((entry) => entry.email !== member.email), member];
      inviteEmail = '';
      inviteRole = 'friend';
      await onProjectsChanged();
    } catch (error) {
      console.error('Invite failed:', error);
    }
  }

  function handleExport() {
    if (!project) return;
    exportProject(project, recipeIds, checklist);
  }

  function formatTime(value: string) {
    return new Date(value).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
</script>

{#if !project}
  <div class="page-container" style="padding-block:32px;">
    <p class="section-copy">Project not found.</p>
    <button class="btn btn-ghost" onclick={onBack}>← Back</button>
  </div>
{:else}
  <section class="page-container fade-up" style="display:grid; gap:1rem;">
    <button class="btn btn-ghost" style="justify-content:flex-start; padding-left:0;" onclick={onBack}>← Back to projects</button>

    <div class="detail-grid">
      <div class="surface" style="border-radius:26px; padding:1.2rem 1.25rem; display:grid; gap:.8rem;">
        <div class="eyebrow">Project workspace</div>
        <h1 class="display-title" style="font-size: clamp(1.95rem, 2.4vw, 3rem); max-width:11ch;">{project.name}</h1>
        {#if project.description}
          <p class="hero-copy" style="max-width:45rem;">{project.description}</p>
        {/if}
        <div class="tag-row">
          <span class="pill">{projectRecipes.length} recipe picks</span>
          <span class="pill">{checklist.length} checklist items</span>
          <span class="pill">{comments.length} comments</span>
        </div>
      </div>

      <div class="surface-strong" style="border-radius:26px; padding:1.15rem; display:grid; gap:.75rem; align-content:start;">
        <div class="eyebrow">Project actions</div>
        <button class="btn btn-primary" onclick={handleExport}>Export JSON</button>
        <button class="btn btn-secondary" disabled title="Export .adg — not implemented yet">Export .adg (later)</button>
        <div class="small-note">Use this page as the shared memory of the track: picks, checklist, and focused comments.</div>
      </div>
    </div>

    <div class="detail-grid">
      <div class="panel-stack">
        <section class="surface-strong" style="border-radius:24px; padding:1rem; display:grid; gap:.8rem;">
          <div class="flex items-center justify-between gap-3">
            <div>
              <div class="eyebrow">Recipe picks</div>
              <div class="section-copy" style="font-size:.9rem;">The chains currently attached to this track.</div>
            </div>
          </div>
          {#if projectRecipes.length === 0}
            <div class="card-quiet" style="padding:1rem; border-radius:18px;">Add a recipe from the recipe detail page to start building a route for this project.</div>
          {:else}
            <div class="panel-stack">
              {#each projectRecipes as recipe (recipe?.id)}
                {#if recipe}
                  <div class="recipe-step" style="display:flex; align-items:center; justify-content:space-between; gap:.8rem;">
                    <button class="text-left" style="flex:1; min-width:0;" onclick={() => onOpenRecipe(recipe.id)}>
                      <div style="font-size:.96rem; font-weight:650;">{recipe.title}</div>
                      <div class="small-note">{recipe.chain.map((step) => step.plugin).slice(0, 3).join(' · ')}</div>
                    </button>
                    <button class="btn btn-ghost" style="padding:.45rem .55rem;" onclick={() => handleRemoveRecipe(recipe.id)}>×</button>
                  </div>
                {/if}
              {/each}
            </div>
          {/if}
        </section>

        <section class="surface-strong" style="border-radius:24px; padding:1rem; display:grid; gap:.8rem;">
          <div class="flex items-center justify-between gap-3">
            <div>
              <div class="eyebrow">Checklist</div>
              <div class="section-copy" style="font-size:.9rem;">{doneCount}/{checklist.length} done</div>
            </div>
            <span class="pill active">{progress}%</span>
          </div>
          <div style="height:6px; background:rgba(25,22,18,0.06); border-radius:999px; overflow:hidden;">
            <div style="height:100%; width:{progress}%; background:var(--color-accent);"></div>
          </div>
          {#if loading}
            <div class="card-quiet" style="padding:1rem; border-radius:18px;">Loading workspace…</div>
          {:else}
            <div class="panel-stack">
              {#each checklist as item (item.id)}
                <label class="recipe-step" style="display:flex; align-items:center; gap:.75rem;">
                  <input type="checkbox" checked={item.done} onchange={() => handleToggle(item)} style="width:18px; height:18px;" />
                  <span style="flex:1; font-size:.92rem; color:{item.done ? 'var(--color-text-muted)' : 'var(--color-text)'}; text-decoration:{item.done ? 'line-through' : 'none'};">{item.label}</span>
                  <button class="btn btn-ghost" style="padding:.35rem .45rem;" onclick={() => handleDeleteItem(item.id)}>×</button>
                </label>
              {/each}
            </div>
            <div style="display:grid; gap:.6rem; grid-template-columns:minmax(0,1fr) auto;">
              <input type="text" bind:value={newItem} placeholder="Add the next practical step…" onkeydown={(event: KeyboardEvent) => event.key === 'Enter' && handleAddItem()} />
              <button class="btn btn-primary" onclick={handleAddItem} disabled={!newItem.trim()}>Add</button>
            </div>
          {/if}
        </section>
      </div>

      <div class="panel-stack">
        <section class="surface-strong" style="border-radius:24px; padding:1rem; display:grid; gap:.8rem;">
          <div>
            <div class="eyebrow">Members</div>
            <div class="section-copy" style="font-size:.9rem;">Lightweight collaboration for a friend, teacher, or reviewer.</div>
          </div>
          <div class="tag-row">
            {#if visibleMembers.length}
              {#each visibleMembers as member (member.id)}
                <span class="pill">{member.email || 'owner'} · {member.role}</span>
              {/each}
            {:else}
              <span class="pill">Only you for now</span>
            {/if}
          </div>
          <div style="display:grid; gap:.55rem; grid-template-columns:minmax(0,1fr) 140px auto;">
            <input type="email" bind:value={inviteEmail} placeholder="friend@studio.com" />
            <select bind:value={inviteRole}>
              <option value="friend">Friend</option>
              <option value="teacher">Teacher</option>
              <option value="reviewer">Reviewer</option>
            </select>
            <button class="btn btn-secondary" onclick={handleInvite} disabled={!inviteEmail.trim()}>Add</button>
          </div>
          <div class="small-note">This becomes fully live once the updated schema is run in Supabase.</div>
        </section>

        <section class="surface-strong" style="border-radius:24px; padding:1rem; display:grid; gap:.8rem;">
          <div>
            <div class="eyebrow">Discussion</div>
            <div class="section-copy" style="font-size:.9rem;">Keep decisions attached to the project instead of scattering them across messages.</div>
          </div>
          <div class="panel-stack" style="max-height:380px; overflow:auto;">
            {#if comments.length === 0}
              <div class="card-quiet" style="padding:1rem; border-radius:18px;">No comments yet. Use this to exchange focused feedback with a friend or teacher.</div>
            {:else}
              {#each comments as comment (comment.id)}
                <article class="issue-card">
                  <div class="flex items-center justify-between gap:1rem;">
                    <strong style="font-size:.86rem;">{comment.author_email}</strong>
                    <span class="small-note">{formatTime(comment.created_at)}</span>
                  </div>
                  <p class="section-copy" style="font-size:.9rem; margin-top:.35rem;">{comment.message}</p>
                </article>
              {/each}
            {/if}
          </div>
          <div style="display:grid; gap:.55rem;">
            <textarea bind:value={newComment} rows={4} placeholder="Add one clear note: what should change, why, and what to listen for."></textarea>
            <button class="btn btn-primary" onclick={handleAddComment} disabled={!newComment.trim() || savingComment}>{savingComment ? 'Posting…' : 'Post comment'}</button>
          </div>
        </section>
      </div>
    </div>
  </section>
{/if}
