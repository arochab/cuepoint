<script lang="ts">
  import type { Recipe } from '../types/index.js';

  let { recipe, isFav, onOpen, onToggleFav }: {
    recipe: Recipe;
    isFav: boolean;
    onOpen: () => void;
    onToggleFav: () => void;
  } = $props();

  const categoryLabel: Record<string, string> = {
    'sound-design': 'Sound design',
    'mixing': 'Mixing',
    'mastering': 'Mastering'
  };
</script>

<article class="recipe-card">
  <div class="flex items-start justify-between gap-3">
    <div style="display:grid; gap:.45rem; min-width:0;">
      <div class="tag-row">
        <span class="pill active">{categoryLabel[recipe.category] ?? recipe.category}</span>
        <span class="pill">{recipe.chain.length} steps</span>
      </div>
      <button onclick={onOpen} class="text-left" style="min-width:0;">
        <h3 style="font-size:1.1rem; line-height:1.08; letter-spacing:-.03em; font-weight:650; color:var(--color-text);">{recipe.title}</h3>
      </button>
      <p class="section-copy" style="font-size:.88rem;">{recipe.goal}</p>
    </div>
    <button onclick={onToggleFav} class="btn btn-ghost" style="padding:.45rem .55rem; font-size:1rem; min-width:auto;">{isFav ? '★' : '☆'}</button>
  </div>

  <div style="display:grid; gap:.55rem;">
    {#each recipe.chain.slice(0, 3) as step, index}
      <div class="recipe-step">
        <div class="mono muted" style="font-size:10px; text-transform:uppercase; letter-spacing:.14em; margin-bottom:.35rem;">#{index + 1}</div>
        <div style="font-size:.92rem; font-weight:600; color:var(--color-text);">{step.plugin}</div>
        <div class="small-note">{step.role}</div>
      </div>
    {/each}
  </div>

  <div class="flex items-center justify-between gap:1rem; border-top:1px solid var(--color-line); padding-top:.8rem;">
    <div class="tag-row">
      {#each recipe.tags.slice(0, 4) as tag}
        <span class="pill">{tag}</span>
      {/each}
    </div>
    <button class="btn btn-secondary" style="padding:.64rem .9rem; font-size:.83rem;" onclick={onOpen}>Open</button>
  </div>
</article>
