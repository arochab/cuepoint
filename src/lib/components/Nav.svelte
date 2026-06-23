<script lang="ts">
  import type { Route } from '../types/index.js';
  import { i18n, t, toggleLocale } from '../i18n/index.svelte.js';

  // "Silence" nav: no topbar, no pill chips, no brand box. Plain text links, always visible
  // at low opacity (rising on hover/focus) — never hidden behind a cursor-to-top gesture
  // (that dies on touch/trackpad). On mobile they collapse to one bottom-fixed quiet row.
  let { route, user, isAdmin = false, onNavigate, onSignOut }: {
    route: Route;
    user: { email?: string } | null;
    isAdmin?: boolean;
    onNavigate: (route: Route) => void;
    onSignOut: () => void;
  } = $props();

  const links = $derived<{ route: Route; labelKey: string }[]>(
    isAdmin
      ? [{ route: 'analyzer', labelKey: 'nav.analyzer' }, { route: 'projects', labelKey: 'nav.projects' }, { route: 'admin', labelKey: 'nav.admin' }]
      : [{ route: 'analyzer', labelKey: 'nav.analyzer' }, { route: 'projects', labelKey: 'nav.projects' }]
  );
</script>

<header class="nav">
  <button class="wordmark" onclick={() => onNavigate('home')}>cuepoint</button>

  <nav class="links">
    {#each links as link}
      <button class="navlink" class:active={route === link.route} onclick={() => onNavigate(link.route)}>{t(link.labelKey)}</button>
    {/each}
    <button class="navlink lang" onclick={toggleLocale}>
      <span class:on={i18n.locale === 'fr'}>FR</span><span class="sep">·</span><span class:on={i18n.locale === 'en'}>EN</span>
    </button>
    {#if user}
      <button class="navlink" onclick={onSignOut} title={user.email}>{t('nav.signout')}</button>
    {/if}
  </nav>
</header>

<style>
  .nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 20;
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 24px; pointer-events: none;
  }
  .nav > * { pointer-events: auto; }
  .wordmark {
    font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.18em;
    color: var(--color-text-secondary); opacity: .55; transition: opacity .25s var(--ease-calm);
  }
  .wordmark:hover { opacity: 1; }
  .links { display: flex; align-items: center; gap: 22px; }
  .navlink {
    font-family: var(--font-sans); font-size: 13px; color: var(--color-text-secondary);
    opacity: .45; transition: opacity .25s var(--ease-calm), color .25s var(--ease-calm);
  }
  .navlink:hover, .navlink:focus-visible { opacity: 1; color: var(--color-text); }
  .navlink.active { opacity: 1; color: var(--color-text); }
  .lang { display: inline-flex; gap: 4px; font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.1em; }
  .lang .on { color: var(--color-cyan); }
  .lang .sep { color: var(--color-text-muted); }

  @media (max-width: 720px) {
    .nav {
      top: auto; bottom: 0; padding: 12px 18px;
      background: var(--color-ink); border-top: 1px solid var(--color-hairline);
    }
    .wordmark { display: none; }
    .links { width: 100%; justify-content: space-around; gap: 12px; }
    .navlink { opacity: .8; }
  }
</style>
