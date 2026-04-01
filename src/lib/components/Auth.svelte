<script lang="ts">
  import { supabase } from '../supabase/client.js';

  let email = $state('');
  let status = $state<'idle' | 'sending' | 'sent' | 'error'>('idle');
  let errorMsg = $state('');

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

<div class="surface-strong" style="border-radius:24px; padding:1.2rem; display:grid; gap:.85rem; min-height: 248px; align-content:start;">
  <div>
    <div class="eyebrow">Get access</div>
    <h3 class="section-title" style="margin-top:.65rem; max-width:14ch;">Bring your mixes, notes, and project memory together.</h3>
    <p class="section-copy" style="margin-top:.45rem; font-size:.92rem;">A magic link will be sent to your email. No password, no setup friction.</p>
  </div>

  {#if status === 'sent'}
    <div class="card-quiet" style="padding:1rem; border-radius:16px; display:grid; gap:.35rem;">
      <div class="eyebrow">Check inbox</div>
      <p class="section-copy">We sent a link to <strong style="color:var(--color-text)">{email}</strong>.</p>
    </div>
  {:else}
    <div style="display:grid; gap:.7rem; align-content:start;">
      <input type="email" placeholder="you@email.com" bind:value={email} onkeydown={(event: KeyboardEvent) => event.key === 'Enter' && handleSubmit()} />
      <button class="btn btn-primary" style="width:100%;" onclick={handleSubmit} disabled={!email.trim() || status === 'sending'}>
        {status === 'sending' ? 'Sending magic link…' : 'Send magic link'}
      </button>
      {#if status === 'error'}
        <p class="small-note" style="color:var(--color-warn)">{errorMsg}</p>
      {/if}
    </div>
  {/if}
</div>
