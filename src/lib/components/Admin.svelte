<script lang="ts">
  import { onMount } from 'svelte';
  import { adminListUsers, adminGetLimits, adminRecentUsage, adminGrantCredits, adminSetBanned } from '../utils/db.js';
  import type { AdminUserRow, AdminUsageRow, AdminLimits } from '../types/index.js';
  import { toast } from '../utils/toast.svelte.js';

  // Admin dashboard - users, credits, API cost, usage, light moderation. Every write goes
  // through an audited SECURITY DEFINER RPC; this component never writes money/role directly.
  // The route is also guarded in App.svelte (only mounted for is_admin users) - defense in depth.

  let users = $state<AdminUserRow[]>([]);
  let usage = $state<AdminUsageRow[]>([]);
  let limits = $state<AdminLimits | null>(null);
  let loading = $state(true);
  let q = $state('');

  const totalUsers = $derived(users.length);
  const paidish = $derived(users.filter(u => u.credits > 0 || u.credits === -1).length);
  const todaySpend = $derived(limits?.daily_spend_usd ?? 0);
  const cap = $derived(limits?.daily_cap_usd ?? 0);
  const monthCost = $derived(usage.reduce((s, u) => s + (u.cost_usd ?? 0), 0));
  const filtered = $derived(
    q.trim() ? users.filter(u => u.email.toLowerCase().includes(q.trim().toLowerCase())) : users
  );

  async function load() {
    loading = true;
    try {
      const [u, l, g] = await Promise.all([adminListUsers(), adminGetLimits(), adminRecentUsage(100)]);
      users = u; limits = l; usage = g;
    } catch {
      toast('Could not load admin data. Are the V4 tables migrated?');
    } finally {
      loading = false;
    }
  }

  async function grant(u: AdminUserRow, credits: number) {
    if (await adminGrantCredits(u.id, credits)) { toast('Credits updated.', 'success', 2500); load(); }
    else toast('Grant failed (not authorized?).');
  }
  async function toggleBan(u: AdminUserRow) {
    const reason = u.banned ? undefined : 'admin action';
    if (await adminSetBanned(u.id, !u.banned, reason)) { toast(u.banned ? 'Unbanned.' : 'Banned.', 'success', 2500); load(); }
    else toast('Action failed.');
  }

  function money(n: number) { return '$' + (Math.round(n * 100) / 100).toFixed(2); }
  function fmtCredits(n: number) { return n === -1 ? '∞' : String(n); }

  onMount(load);
</script>

<section class="page-container fade-up" style="padding-top:1.2rem; display:grid; gap:1.1rem;">
  <div style="display:flex; align-items:baseline; gap:.8rem; flex-wrap:wrap;">
    <h1 class="verdict-word" style="font-size:clamp(1.8rem,5vw,2.6rem); color:var(--color-ink); -webkit-text-stroke:0; text-shadow:none;">ADMIN</h1>
    <span class="scene-eyebrow">CuePoint control room</span>
  </div>

  {#if loading}
    <div class="surface" style="padding:1.2rem; display:inline-flex; gap:.6rem; align-items:center;"><span class="spinner"></span> Loading...</div>
  {:else}
    <!-- KPI strip -->
    <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:.7rem;">
      {#each [['Users', String(totalUsers)], ['With credits', String(paidish)], ['Today spend', money(todaySpend) + ' / ' + money(cap)], ['Recent calls cost', money(monthCost)]] as [k, v]}
        <div class="card" style="padding:1rem 1.1rem;">
          <div class="eyebrow">{k}</div>
          <div style="font-family:var(--font-sub); font-weight:800; font-size:1.5rem; margin-top:.2rem;">{v}</div>
        </div>
      {/each}
    </div>

    {#if limits?.killed}
      <div class="card" style="padding:.9rem 1.1rem; background:var(--color-magenta); color:var(--color-paper); border-color:var(--color-ink);">
        <strong>Coaching is KILLED.</strong> The global kill-switch is on - no AI calls will run.
      </div>
    {/if}

    <!-- Users table -->
    <div class="surface" style="padding:1.1rem; display:grid; gap:.8rem;">
      <div style="display:flex; gap:.6rem; align-items:center; flex-wrap:wrap;">
        <div class="eyebrow">Users</div>
        <input placeholder="search email..." bind:value={q} style="width:auto; flex:1; min-width:180px; max-width:280px; padding:.5rem .7rem; border:2px solid var(--color-ink); border-radius:var(--radius-sm);" />
        <button class="chip" onclick={load}>Refresh</button>
      </div>

      <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse; font-size:.86rem; min-width:560px;">
          <thead>
            <tr style="text-align:left; border-bottom:2px solid var(--color-ink);">
              <th style="padding:.5rem .4rem;">Email</th>
              <th style="padding:.5rem .4rem;">Plan</th>
              <th style="padding:.5rem .4rem; text-align:right;">Credits</th>
              <th style="padding:.5rem .4rem;">Flags</th>
              <th style="padding:.5rem .4rem; text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each filtered as u (u.id)}
              <tr style="border-bottom:1px solid var(--color-line);">
                <td style="padding:.55rem .4rem; max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{u.email}</td>
                <td style="padding:.55rem .4rem;">{u.plan}</td>
                <td style="padding:.55rem .4rem; text-align:right; font-weight:700;">{fmtCredits(u.credits)}</td>
                <td style="padding:.55rem .4rem;">
                  {#if u.is_admin}<span class="pill active" style="font-size:.62rem;">admin</span>{/if}
                  {#if u.banned}<span class="pill pill-warn" style="font-size:.62rem;">banned</span>{/if}
                </td>
                <td style="padding:.55rem .4rem; text-align:right; white-space:nowrap;">
                  <button class="chip" style="padding:.3rem .6rem; font-size:.72rem;" onclick={() => grant(u, u.credits + 5)}>+5</button>
                  <button class="chip" style="padding:.3rem .6rem; font-size:.72rem;" onclick={() => grant(u, -1)}>∞</button>
                  <button class="chip" style="padding:.3rem .6rem; font-size:.72rem;" onclick={() => toggleBan(u)}>{u.banned ? 'unban' : 'ban'}</button>
                </td>
              </tr>
            {/each}
            {#if filtered.length === 0}
              <tr><td colspan="5" style="padding:.8rem .4rem; color:var(--color-text-muted);">No users.</td></tr>
            {/if}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Recent API cost ledger -->
    <div class="surface" style="padding:1.1rem; display:grid; gap:.7rem;">
      <div class="eyebrow">Recent coach calls (cost ledger)</div>
      {#if usage.length === 0}
        <p class="small-note">No coach calls logged yet.</p>
      {:else}
        <div style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; font-size:.82rem; min-width:480px;">
            <thead>
              <tr style="text-align:left; border-bottom:2px solid var(--color-ink);">
                <th style="padding:.4rem;">When</th>
                <th style="padding:.4rem;">Model</th>
                <th style="padding:.4rem; text-align:right;">In</th>
                <th style="padding:.4rem; text-align:right;">Out</th>
                <th style="padding:.4rem; text-align:right;">Cost</th>
              </tr>
            </thead>
            <tbody>
              {#each usage.slice(0, 30) as row (row.id)}
                <tr style="border-bottom:1px solid var(--color-line);">
                  <td style="padding:.4rem; white-space:nowrap;">{new Date(row.created_at).toLocaleString()}</td>
                  <td style="padding:.4rem;">{row.model ?? '-'}</td>
                  <td style="padding:.4rem; text-align:right;">{row.prompt_tokens ?? '-'}</td>
                  <td style="padding:.4rem; text-align:right;">{row.completion_tokens ?? '-'}</td>
                  <td style="padding:.4rem; text-align:right;">{row.cost_usd != null ? money(row.cost_usd) : '-'}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  {/if}
</section>
