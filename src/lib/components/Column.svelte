<script lang="ts">
  // THE COLUMN — the single non-card layout primitive for the "Silence" redesign.
  // One centered editorial column on full-bleed Slate. Where the old app drew a card,
  // this draws NOTHING. A built-in reset (in app.css .column) makes it impossible for a
  // stray legacy class to reintroduce a border/radius/shadow rectangle inside it.
  //
  // align="center" (default) vertically centers the one object; align="top" is for the
  // fix worklist that needs to scroll from the top.
  let { align = 'center', children }: {
    align?: 'center' | 'top';
    children?: import('svelte').Snippet;
  } = $props();
</script>

<div class="column" class:top={align === 'top'}>
  {@render children?.()}
</div>
