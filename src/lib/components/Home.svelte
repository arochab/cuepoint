<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Route } from '../types/index.js';
  import Auth from './Auth.svelte';

  let { user, projects = [], onNavigate }: {
    user: { email?: string } | null;
    projects?: { id: string }[];
    onNavigate: (route: Route) => void;
  } = $props();

  // Immersive Three.js hero (Cue + bubbles + reactive rings + parallax). Lazy-loaded.
  // The scene now lives ONLY inside the hero box (not pinned behind the whole page),
  // so the sections below sit on flat surfaces - Cue stays the hero, nothing else
  // floats over the 3D world.
  let heroCanvas: HTMLCanvasElement;
  let heroApi: { dispose: () => void } | null = null;
  onMount(() => {
    let killed = false;
    (async () => {
      try {
        const { initHomeScene } = await import('../cue/homeScene.js');
        if (killed) return;
        heroApi = initHomeScene(heroCanvas);
      } catch (e) { console.error('Home 3D failed', e); }
    })();
    return () => { killed = true; };
  });
  onDestroy(() => { try { heroApi?.dispose(); } catch { /* ignore */ } });

  // The idea, in Claude Design's words: a calm studio engineer, not a dashboard, not a toy.
  const principles = [
    { n: '01', k: 'ONE THING', t: 'Decisive, never a list.', c: 'No 40-metric report. One clear priority, in plain words, every time.' },
    { n: '02', k: 'IMMERSIVE', t: 'One thing on screen.', c: 'Full-bleed, dark, focused. Cue is the hero; everything else recedes.' },
    { n: '03', k: 'HONEST', t: 'Warm, never harsh.', c: '"Not yet" beats "needs work". A mentor\'s tone, encouraging, exact.' }
  ];
</script>

<!-- HERO - Cue is the star: the 3D world fills the stage, the title frames it from
     the top (skewed, lighter), the lede + single CTA anchor the bottom. The 3D is
     contained to this box only. -->
<section class="hero">
  <!-- Cue fills the stage; the liquid-serif title sits OVER it, semi-transparent so
       the glass reads through the letterforms. One composition, intentional overlap. -->
  <div class="hero-cue"><canvas bind:this={heroCanvas} style="display:block;width:100%;height:100%;"></canvas></div>

  <div class="hero-block">
    <div class="home-eyebrow">A STUDIO EAR, IN YOUR BROWSER</div>
    <h1 class="hero-title">
      <span class="line">hear it<span class="dot">.</span></span>
      <span class="line">fix it<span class="dot">.</span></span>
    </h1>
    <p class="hero-lede">Drop a bounce. Cue tells you the one thing to fix first.<br>No jargon. Free, and your audio never leaves your browser.</p>
    <button class="btn btn-primary" style="padding:0.95rem 1.7rem;font-size:1rem;" onclick={() => onNavigate('analyzer')}>
      Listen to my mix
    </button>
  </div>
</section>

<!-- ACCESS / next step - on a flat surface, OUT of the 3D hero (signed-out only). -->
{#if user}
  <section class="band">
    <div class="band-inner" style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">
      {#if projects.length > 0}<button class="btn btn-secondary" onclick={() => onNavigate('projects')}>Open projects</button>{/if}
      <button class="btn btn-secondary" onclick={() => onNavigate('analyzer')}>Check a mix</button>
    </div>
  </section>
{:else}
  <section class="band" id="get-access">
    <div class="band-inner" style="width:min(420px,100%);margin:0 auto;"><Auth /></div>
  </section>
{/if}

<!-- THE IDEA - flat #0E1116 surface, hairline cards, no 3D behind. -->
<section class="idea">
  <div class="idea-inner">
    <div class="home-eyebrow" style="margin-bottom:14px;">00 / THE IDEA</div>
    <h2 class="idea-title">A producer's tool that feels like a calm studio engineer. Not a dashboard, not a toy.</h2>
    <div class="principles">
      {#each principles as p (p.n)}
        <div class="principle">
          <div class="mono" style="font-size:11px;letter-spacing:0.14em;color:var(--color-cyan);">{p.n} / {p.k}</div>
          <div style="font-weight:700;font-size:1.05rem;margin-top:8px;">{p.t}</div>
          <p style="color:var(--color-text-secondary);font-size:0.92rem;line-height:1.5;margin-top:6px;">{p.c}</p>
        </div>
      {/each}
    </div>
  </div>
</section>

<style>
  /* Hero stage = a single contained viewport-tall box. Cue fills it; text frames it. */
  /* Overlay composition: Cue fills the stage, the liquid-serif title floats over it. */
  .hero {
    position: relative;
    height: 100dvh;
    min-height: 620px;
    overflow: hidden;
    background: radial-gradient(64% 56% at 50% 42%, #1b2128 0%, #11151a 52%, #080a0d 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .hero-cue { position: absolute; inset: 0; z-index: 0; }

  .hero-block {
    position: relative; z-index: 2;
    width: 100%; max-width: 880px; margin: 0 auto;
    display: flex; flex-direction: column; align-items: center; text-align: center;
    padding: 0 24px; gap: 22px;
    pointer-events: none;
  }
  .hero-block > * { pointer-events: auto; }
  .home-eyebrow {
    font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.24em;
    color: var(--color-text-muted); margin: 0;
  }
  /* Hero title = Claude Design's validated "Hero Title Specimen" recipe, reproduced
     EXACTLY: Fredoka 600 lowercase, glass-fill 12%, 1.2px gloss rim, layered shadow.
     The letterforms read as frosted glass over Cue - part of the droplet, not a slab. */
  .hero-title {
    margin: 0;
    text-align: center;
    font-family: var(--font-hero);
    font-weight: 600;
    font-size: clamp(58px, 11.5vw, 152px);
    line-height: 0.88;
    letter-spacing: -0.02em;
    text-transform: lowercase;
    color: rgba(255, 255, 255, 0.12);                         /* glass fill 12% */
    -webkit-text-stroke: 1.2px rgba(255, 255, 255, 0.5);      /* 1.2px gloss rim */
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.25), 0 3px 22px rgba(0, 0, 0, 0.5);
  }
  .hero-title .line { display: block; white-space: nowrap; }
  /* the cyan cue-point: solid dot, no rim, glowing */
  .hero-title .dot {
    color: #2FCDE6;
    -webkit-text-stroke: 0;
    text-shadow: 0 0 18px rgba(47, 205, 230, 0.7);
  }
  .hero-lede {
    font-size: clamp(14px, 1.9vw, 17px); color: var(--color-text-secondary);
    max-width: 460px; margin: 0; line-height: 1.5;
    text-shadow: 0 2px 30px rgba(8,10,13,0.9);
  }

  /* Flat band between hero and the idea grid - hosts auth / next-step. */
  .band { background: var(--color-ink); padding: clamp(40px, 7vh, 72px) 0; }
  .band-inner { width: min(1080px, calc(100vw - 36px)); margin: 0 auto; padding: 0 18px; }

  /* The idea = flat surface, no 3D, hairline cards (the Claude Design "positioning" block). */
  .idea { background: var(--color-paper); border-top: 1px solid var(--color-hairline); padding: clamp(60px, 10vh, 100px) 0; }
  .idea-inner { max-width: 1080px; margin: 0 auto; padding: 0 24px; }
  .idea-title {
    font-family: var(--font-display); font-weight: 700; font-size: clamp(24px, 4vw, 42px);
    letter-spacing: -0.01em; line-height: 1.15; margin: 0 0 32px; max-width: 22ch;
  }
  .principles { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1px;
    background: var(--color-hairline); border: 1px solid var(--color-hairline); border-radius: 20px; overflow: hidden; }
  .principle { background: var(--color-paper); padding: 30px 28px; }
</style>
