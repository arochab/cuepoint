<script lang="ts">
  import { recipes } from '../data/recipes.js';
  import type { Project } from '../types/index.js';

  let { recipeId, isFav, note, projects, projectRecipeMap, user, onBack, onNavigate, onToggleFav, onSaveNote, onAddToProject }: {
    recipeId: string;
    isFav: boolean;
    note: string;
    projects: Project[];
    projectRecipeMap: Record<string, string[]>;
    user: { email?: string } | null;
    onBack: () => void;
    onNavigate?: (route: 'projects') => void;
    onToggleFav: () => void;
    onSaveNote: (content: string) => void;
    onAddToProject: (projectId: string) => void;
  } = $props();

  const recipe = $derived(recipes.find((entry) => entry.id === recipeId));
  let localNote = $state('');
  let noteSaved = $state(false);
  let showProjectPicker = $state(false);

  function handleSaveNote() {
    onSaveNote(localNote);
    noteSaved = true;
    setTimeout(() => (noteSaved = false), 1800);
  }

  $effect(() => {
    localNote = note;
  });
</script>

{#if !recipe}
  <div class="page-container" style="padding-block:32px;">
    <p class="section-copy">Recipe not found.</p>
    <button class="btn btn-ghost" onclick={onBack}>← Back</button>
  </div>
{:else}
  <section class="page-container fade-up" style="display:grid; gap:1rem;">
    <button class="btn btn-ghost" style="justify-content:flex-start; padding-left:0;" onclick={onBack}>← Back to recipes</button>

    <div class="detail-grid">
      <div class="surface" style="border-radius:var(--radius-xl); padding:1.2rem 1.25rem; display:grid; gap:.8rem;">
        <div class="tag-row">
          <span class="pill active">{recipe.category}</span>
          {#each recipe.tags.slice(0, 4) as tag}
            <span class="pill">{tag}</span>
          {/each}
        </div>
        <div class="flex items-start justify-between gap-3">
          <h1 class="display-title" style="font-size: clamp(1.9rem, 2.4vw, 3rem); max-width:12ch;">{recipe.title}</h1>
          <button class="btn btn-ghost btn-icon" aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'} aria-pressed={isFav} style="font-size:1rem;" onclick={onToggleFav}>{isFav ? '★' : '☆'}</button>
        </div>
        <p class="hero-copy">{recipe.goal}</p>
      </div>

      <div class="surface-strong" style="border-radius:var(--radius-xl); padding:1.1rem; display:grid; gap:.8rem; align-content:start;">
        <div class="eyebrow">Use this route when</div>
        <p class="section-copy">You want a starting chain with clear plugin roles, then adjust by ear instead of building from scratch.</p>
        <button class="btn btn-primary" onclick={() => showProjectPicker = !showProjectPicker}>{showProjectPicker ? 'Close project picker' : '+ Add to project'}</button>
        {#if showProjectPicker}
          <div class="panel-stack">
            {#if projects.length > 0}
              {#each projects as project}
                {@const already = (projectRecipeMap[project.id] ?? []).includes(recipe.id)}
                <button class="btn {already ? 'btn-secondary' : 'btn-ghost'}" style="justify-content:space-between;" onclick={() => { if (!already) { onAddToProject(project.id); showProjectPicker = false; } }} disabled={already}>
                  <span>{project.name}</span>
                  <span>{already ? 'Added' : 'Add'}</span>
                </button>
              {/each}
            {:else}
              <div class="card-quiet" style="padding:1rem; border-radius:var(--radius-md); display:grid; gap:.6rem;">
                <span class="small-note">Create a project first, then save this route into that track’s memory.</span>
                {#if onNavigate}
                  <button class="btn btn-primary" style="justify-self:start;" onclick={() => onNavigate!('projects')}>Create a project</button>
                {/if}
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>

    <div class="detail-grid">
      <section class="surface-strong" style="border-radius:var(--radius-xl); padding:1rem; display:grid; gap:.8rem;">
        <div class="eyebrow">Chain</div>
        <div class="panel-stack">
          {#each recipe.chain as step, index}
            <div class="recipe-step">
              <div class="mono muted" style="font-size:10px; text-transform:uppercase; letter-spacing:.14em; margin-bottom:.35rem;">Step {index + 1}</div>
              <div style="font-size:.98rem; font-weight:600;">{step.plugin}</div>
              <div class="small-note" style="margin-top:.2rem;">{step.role}</div>
              <p class="section-copy" style="font-size:.9rem; margin-top:.5rem;">{step.params}</p>
            </div>
          {/each}
        </div>
      </section>

      <div class="panel-stack">
        <section class="surface-strong" style="border-radius:var(--radius-xl); padding:1rem; display:grid; gap:.6rem;">
          <div class="eyebrow">Ableton notes</div>
          <p class="section-copy">{recipe.ableton_notes}</p>
        </section>
        <section class="surface-strong" style="border-radius:var(--radius-xl); padding:1rem; display:grid; gap:.6rem;">
          <div class="eyebrow">Native fallback</div>
          <p class="section-copy">{recipe.native_alt}</p>
        </section>
        {#if user}
          <section class="surface-strong" style="border-radius:var(--radius-xl); padding:1rem; display:grid; gap:.6rem;">
            <div class="eyebrow">Your note</div>
            <textarea rows={5} bind:value={localNote} placeholder="Why this route helps this track, what to test next, what to avoid…"></textarea>
            <div class="flex items-center gap-2">
              <button class="btn btn-primary" onclick={handleSaveNote}>Save note</button>
              {#if noteSaved}<span class="small-note" style="color:var(--color-ok)">Saved</span>{/if}
            </div>
          </section>
        {/if}
      </div>
    </div>
  </section>
{/if}
