<script lang="ts">
  import { toasts, dismiss } from '../utils/toast.svelte.js';
</script>

{#if toasts.length > 0}
  <div class="toast-rack">
    {#each toasts as t (t.id)}
      <div class="toast toast--{t.type}" role={t.type === 'error' ? 'alert' : 'status'} aria-live={t.type === 'error' ? 'assertive' : 'polite'}>
        <span class="toast-msg">{t.message}</span>
        <button class="toast-close" onclick={() => dismiss(t.id)} aria-label="Dismiss">×</button>
      </div>
    {/each}
  </div>
{/if}

<style>
  .toast-rack {
    position: fixed;
    bottom: 1.25rem;
    right: 1.25rem;
    display: grid;
    gap: .5rem;
    z-index: 9999;
    width: min(340px, calc(100vw - 2.5rem));
    pointer-events: none;
  }
  .toast {
    display: flex;
    align-items: center;
    gap: .6rem;
    padding: .75rem 1rem;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-line);
    border-left: 3px solid var(--color-ok);
    background: var(--color-surface-strong);
    box-shadow: var(--shadow-card);
    pointer-events: all;
    font-size: .9rem;
    color: var(--color-text);
    animation: toast-in .18s ease;
  }
  .toast--error { border-left-color: var(--color-coral); }
  .toast-msg { flex: 1; }
  .toast-close {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-muted);
    font-size: 1.15rem;
    line-height: 1;
    padding: 0 .1rem;
  }
  .toast-close:hover { color: var(--color-text); }
  @keyframes toast-in {
    from { transform: translateX(.75rem); opacity: 0; }
    to   { transform: translateX(0);      opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) {
    .toast { animation: none; }
  }
</style>
