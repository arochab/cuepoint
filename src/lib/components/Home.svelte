<script lang="ts">
  import type { Route } from '../types/index.js';
  import Auth from './Auth.svelte';

  let { user, onNavigate }: {
    user: { email?: string } | null;
    onNavigate: (route: Route) => void;
  } = $props();

  const valueBlocks = [
    {
      eyebrow: 'Recipe library',
      title: 'Production routes that start fast and stay realistic.',
      copy: 'Cleaner chains, richer recipes, and plugin intent that reads like actual work — not generic preset folklore.'
    },
    {
      eyebrow: 'Mix inspector',
      title: 'Diagnosis first. Metrics second.',
      copy: 'Upload a bounce, get a verdict, see the likely issue, and know what to fix first — with beginner-safe and expert-level next steps.'
    },
    {
      eyebrow: 'Project memory',
      title: 'Keep picks, notes, checklist, and team feedback together.',
      copy: 'Save what mattered, share remarks with friends or a teacher, and stop losing context between sessions.'
    }
  ];
</script>

<section class="page-container fade-up" style="display:grid; gap:1.15rem;">
  <div class="hero-grid">
    <div class="surface" style="padding:1.35rem 1.45rem 1.5rem; border-radius:28px; display:grid; gap:1rem; align-content:start;">
      <div class="eyebrow">Calm workflow for Ableton producers</div>
      <h1 class="display-title" style="max-width:11ch;">Finish tracks faster, with clearer next steps.</h1>
      <p class="hero-copy">KAPMAN Toolkit combines practical recipes, a smarter mix inspector, and shared project memory into one quieter workspace for finishing electronic tracks.</p>

      <div class="hero-actions">
        <button class="btn btn-primary" onclick={() => onNavigate('recipes')}>Open recipe library</button>
        <button class="btn btn-secondary" onclick={() => onNavigate('analyzer')}>Try the inspector</button>
        {#if user}
          <button class="btn btn-ghost" onclick={() => onNavigate('projects')}>Open workspace</button>
        {/if}
      </div>

      <div class="tag-row">
        <span class="pill active">Less guesswork</span>
        <span class="pill">Account-based project memory</span>
        <span class="pill">Comments for review loops</span>
      </div>
    </div>

    {#if user}
      <div class="surface-strong" style="border-radius:28px; padding:1.2rem; display:grid; gap: .9rem; align-content:start;">
        <div class="eyebrow">Workspace ready</div>
        <h2 class="section-title">You’re connected. Move straight into decisions.</h2>
        <p class="section-copy" style="font-size:.93rem;">Go from recipes to analysis to project memory without losing context.</p>
        <div class="panel-stack">
          <button class="btn btn-primary" style="width:100%;" onclick={() => onNavigate('projects')}>Open projects</button>
          <button class="btn btn-secondary" style="width:100%;" onclick={() => onNavigate('analyzer')}>Check a mix</button>
        </div>
      </div>
    {:else}
      <Auth />
    {/if}
  </div>

  <div class="metric-grid">
    {#each valueBlocks as block}
      <article class="card" style="padding:1rem 1.05rem; border-radius:22px; display:grid; gap:.55rem;">
        <div class="eyebrow">{block.eyebrow}</div>
        <h3 class="section-title" style="font-size:1.18rem;">{block.title}</h3>
        <p class="section-copy" style="font-size:.92rem;">{block.copy}</p>
      </article>
    {/each}
  </div>
</section>
