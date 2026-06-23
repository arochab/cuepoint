<script lang="ts">
  import type { Route } from '../types/index.js';
  import { t } from '../i18n/index.svelte.js';
  import Cue from './Cue.svelte';

  // "Silence" Home = the door, and the door IS the dropzone. One invitation, one whisper,
  // a small idle droplet behind. The whole screen accepts a drop; dropping/clicking routes
  // to the analyzer with the file. No hero slab, no manifesto, no auth wall, no cards.
  let { user, projects = [], onNavigate, onFile }: {
    user: { email?: string } | null;
    projects?: { id: string }[];
    onNavigate: (route: Route) => void;
    onFile?: (file: File) => void;
  } = $props();

  let dragging = $state(false);

  function handleFiles(files: FileList | null | undefined) {
    const f = files?.[0];
    if (!f) return;
    if (onFile) onFile(f);
    else onNavigate('analyzer');
  }
  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragging = false;
    handleFiles(e.dataTransfer?.files);
  }
</script>

<!-- The whole shell is the drop target (Apple/Arc-style single unmissable affordance). -->
<div
  class="home"
  role="button"
  tabindex="-1"
  ondragover={(e) => { e.preventDefault(); dragging = true; }}
  ondragleave={() => dragging = false}
  ondrop={onDrop}
>
  <div class="home-cue" aria-hidden="true">
    <Cue size={180} mood="idle" interactive={false} autoRotate={true} />
  </div>

  <div class="column">
    <p class="invite reveal">{t('home.invite')}</p>
    <p class="whisper reveal" style="--i:1;">{dragging ? t('home.dropNow') : t('home.whisper')}</p>

    <!-- The invitation line itself is the click target for the file picker. -->
    <label class="drop-hit reveal" style="--i:2;">
      <input type="file" accept="audio/*" class="sr-only-focusable" aria-label={t('home.invite')}
             onchange={(e) => handleFiles((e.target as HTMLInputElement).files)} />
    </label>
  </div>

  <!-- always-visible door hint (never hover-gated) -->
  <div class="door-hint" class:bright={dragging} aria-hidden="true"></div>

  <!-- the cold door, visible on first paint and on touch -->
  <button class="cold-link" onclick={() => onNavigate('analyzer')} data-cold>
    {t('home.knowAlready')}
  </button>

  {#if user && projects.length > 0}
    <button class="returning-link" onclick={() => onNavigate('projects')}>{t('home.openProjects')}</button>
  {/if}
</div>

<style>
  .home {
    position: relative;
    min-height: calc(100dvh - 64px);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
  }
  .home-cue {
    position: absolute; left: 50%; top: 38%; transform: translate(-50%, -50%);
    width: 180px; height: 180px; z-index: 1; pointer-events: none;
  }
  .invite {
    font-family: var(--font-serif); font-weight: 300;
    font-size: clamp(22px, 4vw, 30px); color: var(--color-text);
    text-align: center; margin: 0;
  }
  .whisper {
    font-family: var(--font-sans); font-size: 14px; color: var(--color-text-muted);
    text-align: center; margin: 48px 0 0; transition: color .4s var(--ease-calm);
  }
  .drop-hit { position: absolute; inset: 0; cursor: pointer; z-index: 3; display: block; }
  .door-hint {
    position: absolute; bottom: 26px; left: 50%; transform: translateX(-50%);
    width: 96px; height: 3px; background: var(--color-cyan); opacity: .4;
    transition: opacity .3s var(--ease-calm), width .3s var(--ease-calm);
  }
  .door-hint.bright { opacity: 1; width: 160px; }
  .cold-link {
    position: absolute; bottom: 22px; left: 24px; z-index: 4;
    font-family: var(--font-sans); font-size: 13px; color: var(--color-text-muted);
  }
  .cold-link:hover { color: var(--color-text); }
  .returning-link {
    position: absolute; bottom: 22px; right: 24px; z-index: 4;
    font-family: var(--font-sans); font-size: 13px; color: var(--color-text-muted);
  }
  .returning-link:hover { color: var(--color-text); }
</style>
