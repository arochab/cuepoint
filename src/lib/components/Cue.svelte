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

  // "Silence" reduced-motion path: skip WebGL entirely and render the static fallback dot
  // (tinted to the verdict colour). No rAF, no autoRotate — honours the user's OS setting.
  const reduceMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Tint the fallback dot to the current mood so even the no-WebGL path carries meaning.
  const MOOD_HEX: Record<Mood, string> = {
    idle: '#36C9D6', listening: '#36C9D6', thinking: '#36C9D6', happy: '#C9F23C', worried: '#F73CB0'
  };
  const dotColor = $derived(MOOD_HEX[mood]);

  $effect(() => {
    if (api) api.setVerdict(MOOD_TO_VERDICT[mood]);
  });

  onMount(() => {
    if (reduceMotion) { failed = true; return; }  // render the static dot, skip WebGL
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
  {#if !failed}
    <canvas bind:this={canvas} style="display:block;width:100%;height:100%;touch-action:none;"></canvas>
  {:else}
    <!-- WebGL off or reduced-motion: a quiet on-brand fallback dot, tinted to the mood. -->
    <div class="cue-fallback" style="--dot:{dotColor};"></div>
  {/if}
</div>

<style>
  .cue-stage { position: relative; display: block; }
  .cue-fallback {
    position: absolute; inset: 0; margin: auto; width: 40%; height: 40%;
    border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
    background: radial-gradient(circle at 38% 30%, color-mix(in srgb, var(--dot) 40%, white), var(--dot) 55%, color-mix(in srgb, var(--dot) 60%, black));
  }
</style>
