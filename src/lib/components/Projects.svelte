<script lang="ts">
  import type { Route, Project } from '../types/index.js';
  import { createProject } from '../utils/db.js';
  import { toast } from '../utils/toast.svelte.js';
  import { getHistory, type AnalysisRecord } from '../progress/history.js';
  import { i18n, t } from '../i18n/index.svelte.js';
  import Auth from './Auth.svelte';

  // "Silence" Projects = a typographic MEMORY TIMELINE, not a CRM of cards. It shows what
  // Cue has already heard (local history, works signed-out), and offers a quiet inline
  // sign-in to keep it. Project CRUD is demoted to a single quiet "+ nouveau" reveal.
  let { user, projects, onNavigate, onProjectsChanged }: {
    user: { id: string; email?: string } | null;
    projects: Project[];
    onNavigate: (r: Route, param?: string) => void;
    onProjectsChanged: () => void;
  } = $props();

  // The track-memory timeline (local-first), newest first.
  const history = $derived<AnalysisRecord[]>((i18n.locale, getHistory()).slice().reverse());

  const VERDICT_WORD: Record<string, string> = {
    ship: 'ENVOIE', almost: 'PRESQUE', work: 'PAS ENCORE'
  };
  function verdictFor(score: number | undefined): string {
    if (score == null) return '';
    return score >= 80 ? VERDICT_WORD.ship : score >= 55 ? VERDICT_WORD.almost : VERDICT_WORD.work;
  }

  let showCreate = $state(false);
  let newName = $state('');
  let creating = $state(false);

  async function handleCreate() {
    if (!user || !newName.trim() || creating) return;
    creating = true;
    try {
      await createProject(user.id, newName.trim(), '');
      newName = '';
      showCreate = false;
      await onProjectsChanged();
    } catch (error) {
      console.error('Create project failed:', error);
      toast('Could not create project. Check your connection.');
    } finally {
      creating = false;
    }
  }
</script>

<div class="column top">
  <h1 class="title reveal">{t('projects.title')}</h1>

  {#if history.length === 0 && projects.length === 0}
    <button class="empty reveal" style="--i:1;" onclick={() => onNavigate('analyzer')}>{t('projects.empty')}</button>
  {:else}
    <ol class="timeline">
      {#each history as rec, i (rec.at)}
        <li class="track reveal" style="--i:{i + 1};">
          <span class="track-name">{rec.fileName}</span>
          <span class="track-line ash">
            {verdictFor(rec.score)}{#if rec.topIssue && rec.topIssue !== 'healthy'} · {rec.topIssue}{/if}{#if rec.score != null} · {rec.score}/100{/if}
          </span>
        </li>
      {/each}
    </ol>

    {#if user && projects.length > 0}
      <div class="horizon" style="margin:40px 0 28px;"></div>
      <ol class="timeline">
        {#each projects as project (project.id)}
          <li class="track">
            <button class="content-link2" onclick={() => onNavigate('project-detail', project.id)}>
              <span class="track-name">{project.name}</span>
              {#if project.description}<span class="track-line ash">{project.description}</span>{/if}
            </button>
          </li>
        {/each}
      </ol>
    {/if}
  {/if}

  <!-- keep-it: inline sign-in for the signed-out producer, never a wall -->
  {#if !user}
    <div class="keep reveal" style="--i:2;">
      <p class="ash">{t('projects.keepIt')}</p>
      <div class="keep-auth"><Auth /></div>
    </div>
  {:else}
    {#if !showCreate}
      <button class="link ash newproj" onclick={() => showCreate = true}>{t('projects.newProject')}</button>
    {:else}
      <div class="newproj-form">
        <input type="text" bind:value={newName} placeholder="…" onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && handleCreate()} />
        <button class="link tide" onclick={handleCreate} disabled={!newName.trim() || creating}>{creating ? t('an.saving') : 'ok'}</button>
        <button class="link ash" onclick={() => showCreate = false}>{t('cold.back')}</button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .title { font-family: var(--font-serif); font-weight: 300; font-size: clamp(24px, 5vw, 38px); color: var(--color-text); margin: 0 0 var(--gap-verse); }
  .empty { font-family: var(--font-serif); font-weight: 300; font-style: italic; font-size: 18px; color: var(--color-text-muted); text-align: left; }
  .empty:hover { color: var(--color-text); }

  .timeline { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; }
  .track { display: flex; flex-direction: column; gap: 6px; padding: 24px 0; border-bottom: 1px solid var(--color-hairline); }
  .track:last-child { border-bottom: none; }
  .track-name { font-family: var(--font-sans); font-size: 16px; color: var(--color-text); }
  .track-line { font-size: 13px; font-family: var(--font-mono); letter-spacing: 0.02em; }
  .ash { color: var(--color-text-muted); }
  .tide { color: var(--color-cyan); }
  .content-link2 { display: flex; flex-direction: column; gap: 6px; text-align: left; background: none; border: none; cursor: pointer; padding: 0; }

  .link { font-family: var(--font-sans); font-size: 14px; color: var(--color-text-secondary); background: none; border: none; cursor: pointer; }
  .link:hover { color: var(--color-text); }
  .link:disabled { opacity: .4; }

  .keep { margin-top: var(--gap-breath); display: flex; flex-direction: column; gap: 18px; }
  .keep-auth { max-width: 380px; }
  .newproj { margin-top: 40px; align-self: flex-start; }
  .newproj-form { margin-top: 40px; display: flex; gap: 16px; align-items: baseline; }
  .newproj-form input { max-width: 260px; }
</style>
