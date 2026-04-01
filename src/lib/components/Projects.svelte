<script lang="ts">
  import type { Route, Project } from '../types/index.js';
  import { createProject, deleteProject } from '../utils/db.js';
  import Auth from './Auth.svelte';

  let { user, projects, onNavigate, onProjectsChanged }: {
    user: { id: string; email?: string } | null;
    projects: Project[];
    onNavigate: (r: Route, param?: string) => void;
    onProjectsChanged: () => void;
  } = $props();

  let showCreate = $state(false);
  let newName = $state('');
  let newDesc = $state('');
  let creating = $state(false);
  let confirmDelete = $state<string | null>(null);

  async function handleCreate() {
    if (!user || !newName.trim() || creating) return;
    creating = true;
    try {
      await createProject(user.id, newName.trim(), newDesc.trim());
      newName = '';
      newDesc = '';
      showCreate = false;
      await onProjectsChanged();
    } catch (error) {
      console.error('Create project failed:', error);
    } finally {
      creating = false;
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteProject(id);
      confirmDelete = null;
      await onProjectsChanged();
    } catch (error) {
      console.error('Delete project failed:', error);
    }
  }

  function fmtDate(value: string) {
    return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }
</script>

<section class="page-container fade-up" style="display:grid; gap:1rem;">
  <div class="surface" style="border-radius:28px; padding:1.2rem 1.3rem; display:grid; gap:.75rem;">
    <div class="eyebrow">Project workspace</div>
    <h1 class="display-title" style="font-size: clamp(2rem, 2.6vw, 3.2rem); max-width:11ch;">Track memory that survives beyond the session.</h1>
    <p class="hero-copy">Save recipe picks, keep notes per account, invite a teacher or a friend into the review loop, and hold onto concrete next steps.</p>
    <div class="tag-row">
      <span class="pill active">Project comments</span>
      <span class="pill">Checklist memory</span>
      <span class="pill">JSON export</span>
    </div>
  </div>

  {#if !user}
    <div class="detail-grid">
      <div class="surface" style="border-radius:24px; padding:1.1rem; display:grid; gap:.6rem; align-content:start;">
        <div class="eyebrow">Account required</div>
        <h2 class="section-title">Projects, notes, favorites, and checklist memory are tied to your account.</h2>
        <p class="section-copy">Use the magic link once, then move between recipes, analyzer, and project space without losing context.</p>
        <div class="tag-row">
          <span class="pill">Per-account memory</span>
          <span class="pill">Project comments</span>
          <span class="pill">Recipe collections by track</span>
        </div>
      </div>
      <Auth />
    </div>
  {:else}
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <div class="eyebrow">Workspace</div>
        <p class="section-copy" style="font-size:.92rem;">Open a project to manage chain picks, checklist items, and conversation around a track.</p>
      </div>
      <button class="btn btn-primary" onclick={() => showCreate = !showCreate}>{showCreate ? 'Close' : '+ New project'}</button>
    </div>

    {#if showCreate}
      <div class="surface-strong" style="border-radius:22px; padding:1rem; display:grid; gap:.75rem;">
        <div class="eyebrow">Create project</div>
        <input type="text" bind:value={newName} placeholder="Project name" />
        <textarea bind:value={newDesc} rows={3} placeholder="What is this track trying to become? What should your collaborators listen for?"></textarea>
        <div class="flex gap-2">
          <button class="btn btn-primary" onclick={handleCreate} disabled={!newName.trim() || creating}>{creating ? 'Creating…' : 'Create project'}</button>
          <button class="btn btn-secondary" onclick={() => showCreate = false}>Cancel</button>
        </div>
      </div>
    {/if}

    {#if projects.length === 0}
      <div class="surface-strong" style="border-radius:24px; padding:1.2rem; display:grid; gap:.7rem; min-height: 280px; align-content:center; justify-items:start;">
        <div class="eyebrow">Empty workspace</div>
        <h2 class="section-title">No project yet.</h2>
        <p class="section-copy" style="max-width:42rem;">Create one project per track. Use it as the place where recipes, notes, checklist, and feedback stay coherent instead of living in five tabs and three messages.</p>
        <button class="btn btn-primary" onclick={() => showCreate = true}>Create the first project</button>
      </div>
    {:else}
      <div class="recipe-grid">
        {#each projects as project (project.id)}
          <article class="recipe-card" style="gap:.75rem;">
            <div class="flex items-start justify-between gap-3">
              <div style="display:grid; gap:.35rem; min-width:0;">
                <div class="eyebrow">Project</div>
                <button onclick={() => onNavigate('project-detail', project.id)} class="text-left"><h3 class="section-title" style="font-size:1.18rem;">{project.name}</h3></button>
                {#if project.description}
                  <p class="section-copy" style="font-size:.9rem;">{project.description}</p>
                {/if}
              </div>
              <button class="btn btn-ghost" style="padding:.45rem .55rem;" onclick={() => confirmDelete = confirmDelete === project.id ? null : project.id}>×</button>
            </div>
            <div class="tag-row">
              <span class="pill">Updated {fmtDate(project.updated_at)}</span>
              <span class="pill">Comments ready</span>
              <span class="pill">Exportable</span>
            </div>
            <div class="flex items-center justify-between gap-3 pt-2" style="border-top:1px solid var(--color-line);">
              {#if confirmDelete === project.id}
                <div class="small-note" style="color:var(--color-warn);">Delete this project?</div>
                <div class="flex gap-2">
                  <button class="btn btn-secondary" style="padding:.55rem .8rem;" onclick={() => confirmDelete = null}>Cancel</button>
                  <button class="btn btn-primary" style="padding:.55rem .8rem; background:var(--color-warn);" onclick={() => handleDelete(project.id)}>Delete</button>
                </div>
              {:else}
                <span class="small-note">Open full chain picks, checklist, and discussion.</span>
                <button class="btn btn-secondary" style="padding:.55rem .85rem;" onclick={() => onNavigate('project-detail', project.id)}>Open</button>
              {/if}
            </div>
          </article>
        {/each}
      </div>
    {/if}
  {/if}
</section>
