<script lang="ts">
  import type { Route } from '../types/index.js';

  let { route, user, onNavigate, onSignOut }: {
    route: Route;
    user: { email?: string } | null;
    onNavigate: (route: Route) => void;
    onSignOut: () => void;
  } = $props();

  const links: { route: Route; label: string; sub: string }[] = [
    { route: 'recipes', label: 'Recipes', sub: 'Library' },
    { route: 'analyzer', label: 'Analyzer', sub: 'Mix check' },
    { route: 'projects', label: 'Projects', sub: 'Workspace' }
  ];
</script>

<header class="topbar">
  <div class="page-container topbar-inner">
    <button class="brand" onclick={() => onNavigate('home')}>
      <span class="brand-mark">K</span>
      <span class="brand-lines">
        <span class="brand-title">KAPMAN Toolkit <span class="mono muted" style="font-size:10px;margin-left:.25rem;">BETA</span></span>
        <span class="brand-subtitle">Recipes · analyzer · project memory for Ableton workflows</span>
      </span>
    </button>

    <div class="flex items-center gap-3 flex-wrap justify-end">
      <nav class="nav-cluster">
        {#each links as link}
          <button class="nav-item {route === link.route ? 'active' : ''}" onclick={() => onNavigate(link.route)}>
            <div class="label">{link.label}</div>
            <div class="sub">{link.sub}</div>
          </button>
        {/each}
      </nav>

      {#if user}
        <div class="flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-white/55 px-2 py-2">
          <div class="hidden lg:block px-2 text-right">
            <div class="mono muted" style="font-size:10px; text-transform:uppercase; letter-spacing:.14em;">Connected</div>
            <div style="max-width:160px; font-size:12px; color:var(--color-text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{user.email}</div>
          </div>
          <button class="btn btn-secondary" style="padding:.7rem .95rem; font-size:.84rem;" onclick={() => onNavigate('projects')}>Workspace</button>
          <button class="btn btn-ghost" style="padding:.7rem .9rem; font-size:.84rem;" onclick={onSignOut}>Sign out</button>
        </div>
      {:else}
        <button class="btn btn-primary" style="padding:.82rem 1.05rem;" onclick={() => onNavigate('home')}>Get access</button>
      {/if}
    </div>
  </div>
</header>
