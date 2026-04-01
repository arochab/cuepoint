<script lang="ts">
  import type { RecipeCategory } from '../types/index.js';
  import { recipes } from '../data/recipes.js';
  import RecipeCard from './RecipeCard.svelte';

  let { favorites, onOpenRecipe, onToggleFav }: {
    favorites: string[];
    onOpenRecipe: (id: string) => void;
    onToggleFav: (id: string) => void;
  } = $props();

  let search = $state('');
  let category = $state<RecipeCategory | 'all'>('all');
  let tag = $state('');
  let favsOnly = $state(false);

  const allTags = $derived([...new Set(recipes.flatMap((recipe) => recipe.tags))].sort());
  const filtered = $derived.by(() => {
    const q = search.toLowerCase().trim();
    return recipes.filter((recipe) => {
      if (q) {
        const haystack = [recipe.title, recipe.goal, recipe.native_alt, ...recipe.tags, ...recipe.chain.map((step) => step.plugin)].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (category !== 'all' && recipe.category !== category) return false;
      if (tag && !recipe.tags.includes(tag)) return false;
      if (favsOnly && !favorites.includes(recipe.id)) return false;
      return true;
    });
  });
</script>

<section class="page-container fade-up" style="display:grid; gap:1rem;">
  <div class="surface" style="border-radius:28px; padding:1.25rem 1.3rem; display:grid; gap:.7rem;">
    <div class="eyebrow">Recipe library</div>
    <h1 class="display-title" style="font-size: clamp(2rem, 2.7vw, 3.3rem); max-width:12ch;">Production routes you can actually start from.</h1>
    <p class="hero-copy">Search by job, plugin, or texture. Start from a strong chain, then adapt it to the track instead of rebuilding every move from zero.</p>
    <div class="tag-row">
      <span class="pill">{recipes.length} total routes</span>
      <span class="pill">{filtered.length} matching</span>
      <span class="pill">{favorites.length} saved</span>
    </div>
  </div>

  <div class="recipe-layout">
    <aside class="surface" style="border-radius:22px; padding: .95rem; align-self:start; position: sticky; top: 98px; display:grid; gap:.85rem;">
      <div class="eyebrow">Filters</div>
      <div style="display:grid; gap:.5rem;">
        <div class="mono muted" style="font-size:10px; text-transform:uppercase; letter-spacing:.14em;">Search</div>
        <input type="text" placeholder="Kick, Diva, vocal, mono…" bind:value={search} />
      </div>

      <div style="display:grid; gap:.45rem;">
        <div class="mono muted" style="font-size:10px; text-transform:uppercase; letter-spacing:.14em;">Category</div>
        <button class="btn {category === 'all' ? 'btn-primary' : 'btn-secondary'}" style="justify-content:flex-start;" onclick={() => category = 'all'}>All recipes</button>
        <button class="btn {category === 'sound-design' ? 'btn-primary' : 'btn-secondary'}" style="justify-content:flex-start;" onclick={() => category = 'sound-design'}>Sound design</button>
        <button class="btn {category === 'mixing' ? 'btn-primary' : 'btn-secondary'}" style="justify-content:flex-start;" onclick={() => category = 'mixing'}>Mixing</button>
        <button class="btn {category === 'mastering' ? 'btn-primary' : 'btn-secondary'}" style="justify-content:flex-start;" onclick={() => category = 'mastering'}>Mastering</button>
      </div>

      <div style="display:grid; gap:.5rem;">
        <div class="mono muted" style="font-size:10px; text-transform:uppercase; letter-spacing:.14em;">Tag</div>
        <select bind:value={tag}>
          <option value="">All tags</option>
          {#each allTags as entry}
            <option value={entry}>{entry}</option>
          {/each}
        </select>
      </div>

      <button class="btn {favsOnly ? 'btn-primary' : 'btn-secondary'}" onclick={() => favsOnly = !favsOnly} style="justify-content:space-between;">
        <span>Favorites only</span>
        <span>{favsOnly ? 'On' : 'Off'}</span>
      </button>
    </aside>

    <div class="recipe-grid">
      {#each filtered as recipe (recipe.id)}
        <RecipeCard recipe={recipe} isFav={favorites.includes(recipe.id)} onOpen={() => onOpenRecipe(recipe.id)} onToggleFav={() => onToggleFav(recipe.id)} />
      {/each}
      {#if filtered.length === 0}
        <div class="surface-strong" style="border-radius:24px; padding:1.25rem; grid-column:1 / -1; display:grid; gap:.55rem;">
          <div class="eyebrow">No match</div>
          <h3 class="section-title">Nothing fits this filter set yet.</h3>
          <p class="section-copy">Broaden the search, remove a tag, or switch category. The library is designed to narrow quickly.</p>
        </div>
      {/if}
    </div>
  </div>
</section>
