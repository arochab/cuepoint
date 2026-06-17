<script lang="ts">
  import { supabase } from '../supabase/client.js';

  let email = $state('');
  let status = $state<'idle' | 'sending' | 'sent' | 'error'>('idle');
  let errorMsg = $state('');
  let showEmail = $state(false);

  // Primary path: Google (one tap, no email round-trip). PKCE is default in supabase-js v2.
  async function handleGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) { status = 'error'; errorMsg = error.message; }
  }

  async function handleSubmit() {
    if (!email.trim() || status === 'sending') return;
    status = 'sending';
    errorMsg = '';
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin } });
    if (error) {
      status = 'error';
      errorMsg = error.message;
    } else {
      status = 'sent';
    }
  }
</script>

<div class="surface-strong" style="border-radius:var(--radius-xl); padding:1.2rem; display:grid; gap:.85rem; min-height: 248px; align-content:start;">
  <div>
    <div class="eyebrow">Get access</div>
    <h3 class="section-title" style="margin-top:.65rem; max-width:14ch;">Save your tracks and let Cue remember your progress.</h3>
    <p class="section-copy" style="margin-top:.45rem; font-size:.92rem;">One tap with Google. No password, no spam.</p>
  </div>

  {#if status === 'sent'}
    <div class="card-quiet" style="padding:1rem; border-radius:var(--radius-md); display:grid; gap:.35rem;">
      <div class="eyebrow">Check inbox</div>
      <p class="section-copy">We sent a link to <strong style="color:var(--color-text)">{email}</strong>.</p>
    </div>
  {:else}
    <div style="display:grid; gap:.7rem; align-content:start;">
      <button class="btn btn-primary" style="width:100%;" onclick={handleGoogle}>Continue with Google</button>
      {#if showEmail}
        <input type="email" placeholder="you@email.com" bind:value={email} onkeydown={(event: KeyboardEvent) => event.key === 'Enter' && handleSubmit()} />
        <button class="btn btn-secondary" style="width:100%;" onclick={handleSubmit} disabled={!email.trim() || status === 'sending'}>
          {status === 'sending' ? 'Sending magic link…' : 'Send magic link'}
        </button>
      {:else}
        <button class="btn btn-ghost" style="width:100%; font-size:.84rem;" onclick={() => showEmail = true}>or use email instead</button>
      {/if}
      {#if status === 'error'}
        <p class="small-note" style="color:var(--color-coral)">{errorMsg}</p>
      {/if}
    </div>
  {/if}
</div>
