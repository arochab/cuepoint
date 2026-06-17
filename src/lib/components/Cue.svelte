<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { CueVerdict } from '../cue/cueScene.js';

  // Cue - the real-time 3D liquid-glass droplet (Claude Design brand system, ported verbatim
  // in cueScene.ts). Premium, faceless, alive: emotes through colour + inner glow + motion.
  // This Svelte wrapper just mounts the WebGL scene into a canvas and maps our app moods to
  // Cue's verdict states. Keeps the same prop API the rest of the app already passes.
  type Mood = 'idle' | 'listening' | 'happy' | 'worried' | 'thinking';

  let {
    size = 0,                 // 0 = fill parent (full-bleed stage); >0 = fixed square px
    mood = 'idle' as Mood,
    interactive = false,
    autoRotate = true
  }: { size?: number; mood?: Mood; interactive?: boolean; autoRotate?: boolean } = $props();

  // Map our verbs to Claude Design's verdict state machine.
  const MOOD_TO_VERDICT: Record<Mood, CueVerdict> = {
    idle: 'idle', listening: 'analyzing', thinking: 'one', happy: 'send', worried: 'not'
  };

  let canvas: HTMLCanvasElement;
  // The Three.js engine (~1MB) is loaded ON DEMAND when Cue first mounts, so the initial
  // page stays light. Type is the module's return shape.
  let api: { setVerdict: (v: CueVerdict) => void; dispose: () => void } | null = null;
  let failed = $state(false);

  $effect(() => {
    if (api) api.setVerdict(MOOD_TO_VERDICT[mood]);
  });

  onMount(() => {
    let disposed = false;
    (async () => {
      try {
        const { initCueScene } = await import('../cue/cueScene.js');
        if (disposed) return;
        api = initCueScene(canvas, { verdict: MOOD_TO_VERDICT[mood], interactive, autoRotate });
      } catch (e) {
        console.error('Cue 3D failed to init', e);
        failed = true;
      }
    })();
    return () => { disposed = true; };
  });
  onDestroy(() => { try { api?.dispose(); } catch { /* ignore */ } });
</script>

<div
  class="cue-stage"
  style={size > 0 ? `width:${size}px;height:${size}px;` : 'width:100%;height:100%;'}
  aria-label="Cue, mood {mood}"
  role="img"
>
  <canvas bind:this={canvas} style="display:block;width:100%;height:100%;touch-action:none;"></canvas>
  {#if failed}
    <!-- WebGL unavailable: a quiet on-brand fallback dot so the layout never breaks. -->
    <div class="cue-fallback"></div>
  {/if}
</div>

<style>
  .cue-stage { position: relative; display: block; }
  .cue-fallback {
    position: absolute; inset: 0; margin: auto; width: 40%; height: 40%;
    border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
    background: radial-gradient(circle at 38% 30%, #bfe9f3, #2FCDE6 55%, #0c5e72);
  }
</style>
