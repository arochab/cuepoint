<script lang="ts">
  import Cue from './Cue.svelte';
  import type { MixScore } from '../reco/score.js';
  import type { GenreId } from '../reco/genres.js';

  // Shareable Mix Score card - VERTICAL 9:16 story format, built to be screenshotted.
  // Dark "night-pool" Ink surface so the 3D Cue droplet glows (consistent with the app).
  let { mix, genre, fileName }: { mix: MixScore; genre: GenreId | null; fileName: string } = $props();

  // Map to Claude Design verdict word + brand colours.
  const VERDICT_WORD: Record<string, string> = { ship: 'SEND IT', almost: 'ONE THING', work: 'NOT YET' };
  const VERDICT_HEX: Record<string, string> = { ship: '#C9F23C', almost: '#2FCDE6', work: '#F73CB0' };
  const verdictColor = $derived(VERDICT_HEX[mix.verdict]);
  const verdictWord = $derived(VERDICT_WORD[mix.verdict]);
  const cueMood = $derived(mix.verdict === 'ship' ? 'happy' : mix.verdict === 'almost' ? 'thinking' : 'worried');
  const line = $derived(
    mix.verdict === 'ship' ? 'Cue says this one is ready to share.'
    : mix.verdict === 'almost' ? 'One fix away from ready.'
    : 'Cue found the one thing to fix first.'
  );
</script>

<div
  style="width:280px; aspect-ratio:9/16; background:radial-gradient(64% 56% at 50% 38%, #1b2128 0%, #11151a 52%, #080a0d 100%);
         border:1px solid var(--color-hairline); border-radius:18px; box-shadow:var(--shadow-pop); padding:1.4rem 1.2rem;
         display:grid; grid-template-rows:auto 1fr auto; gap:.4rem; overflow:hidden;"
>
  <div style="display:flex; align-items:center; justify-content:space-between;">
    <span class="mono" style="font-size:11px; letter-spacing:0.3em; color:#cfd5db;">CUEPOINT</span>
    <span class="mono" style="font-size:9px; letter-spacing:.14em; text-transform:uppercase; color:var(--color-text-muted);">{genre ?? 'mix'} check</span>
  </div>

  <div style="display:grid; place-items:center; gap:.5rem; align-content:center; position:relative;">
    <div style="width:150px; height:150px;"><Cue size={150} mood={cueMood} interactive={false} autoRotate={true} /></div>
    <div style="text-align:center; margin-top:-.4rem;">
      <div class="mono" style="font-weight:500; line-height:1; color:#ECEDEE;"><span style="font-size:3.4rem;">{mix.score}</span><span style="font-size:1.2rem; color:#6f7880;">/100</span></div>
    </div>
    <div style="font-family:var(--font-display); font-weight:700; font-size:1.9rem; letter-spacing:-0.01em; color:{verdictColor};">{verdictWord}</div>
    <p style="text-align:center; font-size:.82rem; font-weight:500; color:var(--color-text-secondary); max-width:22ch; line-height:1.35;">{line}</p>
  </div>

  <div style="text-align:center;">
    <div class="mono" style="font-size:9px; letter-spacing:0.12em; color:var(--color-text-muted);">CUEPOINT.APP · FREE MIX CHECK</div>
  </div>
</div>

<p class="mono" style="font-size:.7rem; text-align:center; max-width:30ch; color:var(--color-text-muted); letter-spacing:0.04em;">Screenshot it and tag your track. Cue rides along.</p>
