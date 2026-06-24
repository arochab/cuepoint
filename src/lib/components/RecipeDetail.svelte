<script lang="ts">
  import { recipes } from '../data/recipes.js';
  import type { Project } from '../types/index.js';
  import { t } from '../i18n/index.svelte.js';

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
  <div class="column"><p class="rd-goal">Recipe not found.</p><button class="rd-link" onclick={onBack}>{t('cold.back')}</button></div>
{:else}
  <div class="column top">
    <button class="rd-back rd-link" onclick={onBack}>{t('cold.back')}</button>

    <!-- a scannable worklist, no card — alignment + silence do all the work -->
    <h1 class="rd-title reveal">{recipe.title}</h1>
    <p class="rd-goal reveal" style="--i:1;">{recipe.goal}</p>
    <p class="rd-step-count rd-mono rd-ash reveal" style="--i:2;">{t('fix.stepCount')} 1 {t('fix.stepOf')} {recipe.chain.length}</p>

    <ol class="rd-worklist">
      {#each recipe.chain as step, index}
        <li class="rd-step reveal" style="--i:{index + 3};">
          <span class="rd-idx rd-tide rd-mono">{String(index + 1).padStart(2, '0')}</span>
          <span class="rd-body">
            <span class="rd-plugin">{step.plugin}</span>
            <span class="rd-role rd-ash">{step.role}</span>
            <span class="rd-param rd-mono rd-ash">{step.params}</span>
          </span>
        </li>
      {/each}
    </ol>

    <div class="rd-alts">
      <details><summary class="rd-link">{t('fix.native')}</summary><p class="rd-mono rd-ash rd-small">{recipe.native_alt}</p></details>
      <details><summary class="rd-link">{t('fix.notes')}</summary><p class="rd-ash rd-small">{recipe.ableton_notes}</p></details>
    </div>

    {#if user}
      <div class="rd-note">
        <textarea rows={3} bind:value={localNote} placeholder="…"></textarea>
        <div class="rd-note-actions">
          <button class="rd-link rd-tide" onclick={handleSaveNote}>{noteSaved ? t('an.saved') : 'note'}</button>
          {#if projects.length > 0}
            <button class="rd-link rd-ash" onclick={() => showProjectPicker = !showProjectPicker}>+ projet</button>
          {/if}
        </div>
        {#if showProjectPicker && projects.length > 0}
          <div class="rd-projects">
            {#each projects as project}
              {@const already = (projectRecipeMap[project.id] ?? []).includes(recipe.id)}
              <button class="rd-link {already ? 'rd-tide' : 'rd-ash'}" disabled={already} onclick={() => { if (!already) { onAddToProject(project.id); showProjectPicker = false; } }}>{project.name}{already ? ' ✓' : ''}</button>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .rd-back { align-self: flex-start; margin-bottom: 40px; }
  .rd-title { font-family: var(--font-serif); font-weight: 300; font-size: clamp(24px, 4vw, 36px); line-height: 1.1; color: var(--color-text); margin: 0; }
  .rd-goal { font-family: var(--font-serif); font-weight: 300; font-size: clamp(16px, 2.4vw, 20px); color: var(--color-text-secondary); margin: 16px 0 0; line-height: 1.4; }
  .rd-step-count { margin: 28px 0 0; font-size: 12px; }
  .rd-worklist { list-style: none; padding: 0; margin: 18px 0 0; display: flex; flex-direction: column; gap: var(--gap-verse); }
  .rd-step { display: grid; grid-template-columns: 2ch 1fr; gap: 16px; align-items: baseline; }
  .rd-idx { font-size: 13px; }
  .rd-body { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .rd-plugin { font-family: var(--font-sans); font-size: 15px; font-weight: 500; color: var(--color-text); }
  .rd-role { font-size: 13px; }
  .rd-param { font-size: 12px; line-height: 1.5; word-break: break-word; }
  .rd-alts { display: flex; gap: 24px; flex-wrap: wrap; margin-top: 40px; }
  .rd-alts summary { list-style: none; }
  .rd-note { margin-top: var(--gap-breath); }
  .rd-note-actions { display: flex; gap: 20px; margin-top: 12px; }
  .rd-projects { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; align-items: flex-start; }

  .rd-ash { color: var(--color-text-muted); }
  .rd-tide { color: var(--color-cyan); }
  .rd-small { font-size: 12px; }
  .rd-mono { font-family: var(--font-mono); }
  .rd-link { font-family: var(--font-sans); font-size: 14px; color: var(--color-text-secondary); background: none; border: none; cursor: pointer; transition: color .25s var(--ease-calm); }
  .rd-link:hover { color: var(--color-text); }
  .rd-link:disabled { opacity: .5; cursor: default; }
</style>
