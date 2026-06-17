<script lang="ts">
  import type { Route } from '../types/index.js';
  import Cue from './Cue.svelte';

  let { route, user, isAdmin = false, onNavigate, onSignOut }: {
    route: Route;
    user: { email?: string } | null;
    isAdmin?: boolean;
    onNavigate: (route: Route) => void;
    onSignOut: () => void;
  } = $props();

  // Mono uppercase labels only - the Claude Design nav carries no sub-labels.
  const baseLinks: { route: Route; label: string }[] = [
    { route: 'recipes', label: 'Recipes' },
    { route: 'analyzer', label: 'Analyzer' },
    { route: 'projects', label: 'Projects' }
  ];
  // Admin link only appears for admins (the route is also guarded in App + RLS).
  const links = $derived(
    isAdmin ? [...baseLinks, { route: 'admin' as Route, label: 'Admin' }] : baseLinks
  );
</script>

<header class="topbar">
  <div class="page-container topbar-inner">
    <button class="brand" onclick={() => onNavigate('home')}>
      <span class="brand-mark"><Cue size={32} mood="idle" /></span>
      <span class="brand-lines">
        <span class="brand-title">CuePoint <span class="mono muted" style="font-size:10px;margin-left:.25rem;">BETA</span></span>
        <span class="brand-subtitle">A studio ear, in your browser</span>
      </span>
    </button>

    <div class="flex items-center gap-3 flex-wrap justify-end">
      <nav class="nav-cluster">
        {#each links as link}
          <button class="nav-item {route === link.route ? 'active' : ''}" aria-current={route === link.route ? 'page' : undefined} onclick={() => onNavigate(link.route)}>
            {link.label}
          </button>
        {/each}
      </nav>

      {#if user}
        <div class="flex items-center gap-2" style="border:1px solid var(--color-hairline); border-radius:999px; background:var(--color-paper); padding:6px 8px;">
          <div class="hidden lg:block px-2 text-right">
            <div class="mono muted" style="font-size:10px; text-transform:uppercase; letter-spacing:.14em;">Connected</div>
            <div style="max-width:160px; font-size:12px; color:var(--color-text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{user.email}</div>
          </div>
          <button class="btn btn-secondary" style="padding:.7rem .95rem; font-size:.84rem;" onclick={() => onNavigate('projects')}>Workspace</button>
          <button class="btn btn-ghost" style="padding:.7rem .9rem; font-size:.84rem;" onclick={onSignOut}>Sign out</button>
        </div>
      {:else}
        <button
          class="btn btn-outline-cyan"
          style="padding:.82rem 1.05rem; font-family:var(--font-mono); font-size:11px; letter-spacing:0.12em; text-transform:uppercase;"
          onclick={() => {
            onNavigate('home');
            // Send the user to the actual sign-in field, not just the top of home.
            requestAnimationFrame(() => {
              const el = document.getElementById('get-access');
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el?.querySelector('input')?.focus();
            });
          }}
        >Get access</button>
      {/if}
    </div>
  </div>
</header>
