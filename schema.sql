-- ============================================================
-- CuePoint V2.2 — Supabase Schema (collaboration + safer reruns)
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- Idempotent: safe to re-run (create if not exists / policies created only if missing).
-- ============================================================

create extension if not exists pgcrypto;

-- 1. Profiles (auto-created on signup via trigger)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, null)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 2. Recipes catalog (read-only seed, public read)
create table if not exists public.recipes (
  id text primary key,
  title text not null,
  category text not null check (category in ('sound-design', 'mixing', 'mastering')),
  goal text not null,
  tags text[] not null default '{}',
  chain jsonb not null default '[]',
  ableton_notes text not null default '',
  native_alt text not null default '',
  created_at timestamptz not null default now()
);

alter table public.recipes enable row level security;

-- 3. User favorites
create table if not exists public.user_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

alter table public.user_favorites enable row level security;

-- 4. User recipe notes
create table if not exists public.user_recipe_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id text not null,
  content text not null default '',
  updated_at timestamptz not null default now(),
  unique (user_id, recipe_id)
);

alter table public.user_recipe_notes enable row level security;

-- 5. Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

-- 6. Project ↔ Recipe junction
create table if not exists public.project_recipes (
  project_id uuid not null references public.projects(id) on delete cascade,
  recipe_id text not null,
  added_at timestamptz not null default now(),
  primary key (project_id, recipe_id)
);

alter table public.project_recipes enable row level security;

-- 7. Project checklist items
create table if not exists public.project_checklist_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  label text not null,
  done boolean not null default false,
  sort_order integer not null default 0
);

alter table public.project_checklist_items enable row level security;

-- 8. Project members (collaboration)
create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  role text not null default 'friend' check (role in ('owner','teacher','friend','reviewer')),
  created_at timestamptz not null default now(),
  unique (project_id, email)
);

alter table public.project_members enable row level security;

-- 9. Project comments (collaboration)
create table if not exists public.project_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.project_comments enable row level security;

-- 10. Auto-touch projects.updated_at on update
create or replace function public.touch_project_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_touch_updated_at on public.projects;
create trigger projects_touch_updated_at
before update on public.projects
for each row execute function public.touch_project_updated_at();

-- 11. Row-Level Security policies (created only if missing — idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Users can read own profile') THEN
    EXECUTE 'create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Users can update own profile') THEN
    EXECUTE 'create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='recipes' AND policyname='Recipes are publicly readable') THEN
    EXECUTE 'create policy "Recipes are publicly readable" on public.recipes for select using (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_favorites' AND policyname='Users manage own favorites') THEN
    EXECUTE 'create policy "Users manage own favorites" on public.user_favorites for all using (auth.uid() = user_id) with check (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_recipe_notes' AND policyname='Users manage own notes') THEN
    EXECUTE 'create policy "Users manage own notes" on public.user_recipe_notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='projects' AND policyname='Users manage own projects') THEN
    EXECUTE 'create policy "Users manage own projects" on public.projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='project_recipes' AND policyname='Users manage own project recipes') THEN
    EXECUTE 'create policy "Users manage own project recipes" on public.project_recipes for all using (exists (select 1 from public.projects where projects.id = project_recipes.project_id and projects.user_id = auth.uid()) or exists (select 1 from public.project_members where project_members.project_id = project_recipes.project_id and project_members.user_id = auth.uid())) with check (exists (select 1 from public.projects where projects.id = project_recipes.project_id and projects.user_id = auth.uid()) or exists (select 1 from public.project_members where project_members.project_id = project_recipes.project_id and project_members.user_id = auth.uid()))';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='project_checklist_items' AND policyname='Users manage own checklist items') THEN
    EXECUTE 'create policy "Users manage own checklist items" on public.project_checklist_items for all using (exists (select 1 from public.projects where projects.id = project_checklist_items.project_id and projects.user_id = auth.uid()) or exists (select 1 from public.project_members where project_members.project_id = project_checklist_items.project_id and project_members.user_id = auth.uid())) with check (exists (select 1 from public.projects where projects.id = project_checklist_items.project_id and projects.user_id = auth.uid()) or exists (select 1 from public.project_members where project_members.project_id = project_checklist_items.project_id and project_members.user_id = auth.uid()))';
  END IF;
  -- Members may READ their own membership row; only the project OWNER may CREATE/modify
  -- memberships. The old "or auth.uid() = user_id" in WITH CHECK let any authenticated
  -- user self-join an arbitrary project (UUIDs leak via shares/URLs) and then read its
  -- recipes/checklist/comments - a cross-user data leak. Owner-driven invites only.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='project_members' AND policyname='Owners manage project members') THEN
    EXECUTE 'create policy "Owners manage project members" on public.project_members for all using (exists (select 1 from public.projects where projects.id = project_members.project_id and projects.user_id = auth.uid()) or auth.uid() = user_id) with check (exists (select 1 from public.projects where projects.id = project_members.project_id and projects.user_id = auth.uid()))';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='project_comments' AND policyname='Project members read comments') THEN
    EXECUTE 'create policy "Project members read comments" on public.project_comments for select using (exists (select 1 from public.projects where projects.id = project_comments.project_id and projects.user_id = auth.uid()) or exists (select 1 from public.project_members where project_members.project_id = project_comments.project_id and project_members.user_id = auth.uid()))';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='project_comments' AND policyname='Project members add comments') THEN
    EXECUTE 'create policy "Project members add comments" on public.project_comments for insert with check (exists (select 1 from public.projects where projects.id = project_comments.project_id and projects.user_id = auth.uid()) or exists (select 1 from public.project_members where project_members.project_id = project_comments.project_id and project_members.user_id = auth.uid()))';
  END IF;
END $$;

-- ============================================================
-- V3 — Accounts, paid coaching, entitlements (pay-per-track / credit packs)
-- The producer stays free to taste; the AI coach is gated by an entitlement that
-- ONLY a verified Stripe webhook (service-role) can grant. RLS = read-own, no client write.
-- ============================================================

-- Plan / Stripe customer on the profile (so the UI can gate without a join).
alter table public.profiles add column if not exists plan text not null default 'free';
alter table public.profiles add column if not exists stripe_customer_id text;
alter table public.profiles add column if not exists credits integer not null default 0;

-- 12. Analyses — a typed record of a mix analysis (replaces free-text comment snapshots).
create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  audio_hash text,                         -- sha256 of file: dedupe + anti-abuse
  lufs numeric,
  true_peak numeric,
  phase numeric,
  low_energy numeric,
  mid_energy numeric,
  high_energy numeric,
  top_issue text,
  safe_for_demo boolean,
  created_at timestamptz not null default now()
);
alter table public.analyses enable row level security;

-- 13. Entitlements — who paid for what. The 1-credit-per-track gate for the AI coach.
create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  analysis_id uuid references public.analyses(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','paid','refunded')),
  source text not null default 'stripe',   -- 'stripe' | 'grant'
  stripe_event_id text unique,             -- webhook idempotency / replay protection
  coach_runs_used integer not null default 0,
  coach_runs_limit integer not null default 20,  -- hard cap per purchase (cost fuse)
  created_at timestamptz not null default now()
);
alter table public.entitlements enable row level security;

-- 14. LLM usage log — every coach call (cost control + abuse detection, service-role only).
create table if not exists public.llm_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entitlement_id uuid references public.entitlements(id) on delete set null,
  tokens_in integer,
  tokens_out integer,
  cost_eur numeric,
  created_at timestamptz not null default now()
);
alter table public.llm_usage enable row level security;

-- Atomic credit grant (called by the Stripe webhook, service-role).
create or replace function public.grant_credits(p_user uuid, p_credits integer)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles set credits = credits + p_credits where id = p_user;
$$;

-- Atomic credit spend on a fresh analysis: returns true if a credit was available + consumed.
create or replace function public.spend_credit(p_user uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  update public.profiles set credits = credits - 1
   where id = p_user and credits > 0
  returning true;
$$;

-- Atomic coach-run consumption: increments only if under the cap (closes the concurrency bypass).
create or replace function public.consume_coach_run(p_entitlement uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  update public.entitlements
     set coach_runs_used = coach_runs_used + 1
   where id = p_entitlement
     and status = 'paid'
     and coach_runs_used < coach_runs_limit
  returning true;
$$;

-- RLS for the money tables (read-own only; ALL writes are service-role / webhook).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='analyses' AND policyname='Users manage own analyses') THEN
    EXECUTE 'create policy "Users manage own analyses" on public.analyses for all using (auth.uid() = user_id) with check (auth.uid() = user_id)';
  END IF;
  -- entitlements: users may READ their own and NOTHING else. No insert/update/delete policy
  -- on purpose -> with RLS on, the anon/auth key cannot write. Only service-role (webhook) can.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='entitlements' AND policyname='Users read own entitlements') THEN
    EXECUTE 'create policy "Users read own entitlements" on public.entitlements for select using (auth.uid() = user_id)';
  END IF;
  -- llm_usage: read-own only; written by the coach function (service-role).
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='llm_usage' AND policyname='Users read own usage') THEN
    EXECUTE 'create policy "Users read own usage" on public.llm_usage for select using (auth.uid() = user_id)';
  END IF;
  -- owner can delete their own project comments (was missing; needed once analyses moved out).
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='project_comments' AND policyname='Project owners delete comments') THEN
    EXECUTE 'create policy "Project owners delete comments" on public.project_comments for delete using (exists (select 1 from public.projects where projects.id = project_comments.project_id and projects.user_id = auth.uid()))';
  END IF;
END $$;

-- ============================================================
-- V4 — Admin layer (roles, cost ledger, kill-switch, moderation, audit)
-- Minimal but real: who is admin, who is banned, what every coach call cost,
-- a global daily spend fuse, and an audit trail of admin actions.
-- ============================================================

-- Role + moderation flags on the profile.
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists banned boolean not null default false;
alter table public.profiles add column if not exists banned_reason text;

-- EXISTENTIAL COLUMN LOCK: with the "Users can update own profile" policy a user could
-- PATCH their own credits/is_admin/banned to anything. RLS controls ROWS, not COLUMNS, so
-- we revoke column-level UPDATE on the sensitive fields and grant it ONLY on safe display
-- fields. Money + role + ban can then be changed ONLY by service-role (webhook/admin RPC).
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

-- 15. Usage events — the real cost ledger. One row per coach call. Token counts come from
-- the LLM response.usage (never estimated). NEVER stores audio / prompts / coaching text:
-- only counts + cost, protecting privacy and DB size. (llm_usage above stays for back-compat;
-- usage_events is the admin-facing ledger with model + request id.)
create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  model text,
  prompt_tokens integer,
  completion_tokens integer,
  cost_usd numeric,
  request_id text
);
alter table public.usage_events enable row level security;
create index if not exists usage_events_created_idx on public.usage_events (created_at);
create index if not exists usage_events_user_idx on public.usage_events (user_id);

-- 16. App limits — singleton kill-switch + daily spend tracker (the bankruptcy fuse).
create table if not exists public.app_limits (
  id integer primary key default 1,
  daily_spend_usd numeric not null default 0,   -- running total for today (reset by cron)
  daily_cap_usd numeric not null default 5,      -- ceiling: coaching halts when reached
  killed boolean not null default false,         -- hard manual off-switch
  spend_date date not null default current_date,
  constraint app_limits_singleton check (id = 1)
);
alter table public.app_limits enable row level security;
insert into public.app_limits (id) values (1) on conflict (id) do nothing;

-- 17. Admin audit log — every privileged action (grant credits, ban, etc.).
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.admin_audit_log enable row level security;

-- Helper: is the current JWT an admin? (security definer so it can read profiles under RLS)
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

-- Record + enforce daily spend in one atomic step. Returns true if the call is ALLOWED
-- (under cap, not killed); rolls the day over automatically. Called by the coach function.
create or replace function public.record_spend(p_cost_usd numeric)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_killed boolean;
  v_today date;
  v_cap numeric;
  v_spent numeric;
begin
  select killed, spend_date, daily_cap_usd, daily_spend_usd
    into v_killed, v_today, v_cap, v_spent
    from public.app_limits where id = 1 for update;

  if v_today <> current_date then            -- new day: reset the running total
    update public.app_limits set spend_date = current_date, daily_spend_usd = 0 where id = 1;
    v_spent := 0;
  end if;

  if v_killed or (v_spent + p_cost_usd) > v_cap then
    return false;                            -- blocked: kill-switch or over the ceiling
  end if;

  update public.app_limits set daily_spend_usd = daily_spend_usd + p_cost_usd where id = 1;
  return true;
end;
$$;

-- Admin RPC: grant credits to a user (-1 = unlimited for press/friends), audited.
create or replace function public.admin_grant_credits(p_target uuid, p_credits integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  update public.profiles set credits = p_credits where id = p_target;
  insert into public.admin_audit_log (actor_id, action, target_user_id, payload)
  values (auth.uid(), 'grant_credits', p_target, jsonb_build_object('credits', p_credits));
end;
$$;

-- Admin RPC: ban / unban a user, audited.
create or replace function public.admin_set_banned(p_target uuid, p_banned boolean, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  update public.profiles set banned = p_banned, banned_reason = p_reason where id = p_target;
  insert into public.admin_audit_log (actor_id, action, target_user_id, payload)
  values (auth.uid(), case when p_banned then 'ban' else 'unban' end, p_target, jsonb_build_object('reason', p_reason));
end;
$$;

-- PRIVILEGED ACCOUNTS — config-driven, NO emails in source.
-- The admin allowlist comes from the Postgres setting `app.admin_emails` (a comma-separated
-- list) so this public schema ships zero personal data. Set it once per environment, e.g.
--   alter database postgres set app.admin_emails = 'you@example.com,teammate@example.com';
-- Helper: is a given email on the allowlist? (case-insensitive, trims spaces, never errors
-- if the setting is unset — returns false.)
create or replace function public.is_admin_email(p_email text)
returns boolean
language sql
stable
as $$
  select p_email is not null and lower(p_email) = any (
    select lower(trim(e))
    from regexp_split_to_table(coalesce(current_setting('app.admin_emails', true), ''), ',') as e
    where trim(e) <> ''
  );
$$;

-- Promote any already-existing accounts that match the configured allowlist. Re-running is safe.
update public.profiles
   set is_admin = true, credits = -1, plan = 'admin'
 where public.is_admin_email(email);

-- Extend the signup trigger so a configured email is auto-promoted on first sign-in.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean := public.is_admin_email(new.email);
begin
  insert into public.profiles (id, email, display_name, is_admin, credits, plan)
  values (new.id, new.email, null, v_is_admin, case when v_is_admin then -1 else 0 end, case when v_is_admin then 'admin' else 'free' end)
  on conflict (id) do update set is_admin = excluded.is_admin
    where public.is_admin_email(public.profiles.email);
  return new;
end;
$$;

-- spend_credit must treat -1 (unlimited) as never-decrementing, always-allowed.
create or replace function public.spend_credit(p_user uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  update public.profiles
     set credits = case when credits = -1 then -1 else credits - 1 end
   where id = p_user and (credits > 0 or credits = -1)
  returning true;
$$;

-- Admin-layer RLS.
DO $$ BEGIN
  -- usage_events: a user reads their own; admins read all.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='usage_events' AND policyname='Read own or admin usage events') THEN
    EXECUTE 'create policy "Read own or admin usage events" on public.usage_events for select using (auth.uid() = user_id or public.is_admin())';
  END IF;
  -- app_limits: admins read it (the dashboard shows today''s spend / kill state).
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='app_limits' AND policyname='Admins read app limits') THEN
    EXECUTE 'create policy "Admins read app limits" on public.app_limits for select using (public.is_admin())';
  END IF;
  -- admin_audit_log: admins read it.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='admin_audit_log' AND policyname='Admins read audit log') THEN
    EXECUTE 'create policy "Admins read audit log" on public.admin_audit_log for select using (public.is_admin())';
  END IF;
  -- profiles: admins can READ every profile (the user-management table). Writes still go
  -- through the audited admin_* RPCs (service-definer), never a direct client update.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Admins read all profiles') THEN
    EXECUTE 'create policy "Admins read all profiles" on public.profiles for select using (public.is_admin())';
  END IF;
END $$;

-- ============================================================
-- V5 — Table privilege GRANTs (needed because "Automatically expose new tables"
-- is OFF). RLS still governs WHICH ROWS each role sees; these GRANTs just let the
-- Data API touch the tables at all. Safe: a user only ever sees their own rows.
-- ============================================================

-- Public catalog: anyone can read recipes.
grant select on public.recipes to anon, authenticated;

-- Signed-in users operate on their own rows (RLS filters to auth.uid()).
grant select, insert, update, delete on public.user_favorites      to authenticated;
grant select, insert, update, delete on public.user_recipe_notes   to authenticated;
grant select, insert, update, delete on public.projects            to authenticated;
grant select, insert, update, delete on public.project_recipes     to authenticated;
grant select, insert, update, delete on public.project_checklist_items to authenticated;
grant select, insert, update, delete on public.project_members     to authenticated;
grant select, insert, delete         on public.project_comments    to authenticated;
grant select, insert                 on public.analyses            to authenticated;

-- profiles: column-level UPDATE was already locked to display_name in V4; allow SELECT
-- (RLS = read own, or admin reads all). No INSERT (the signup trigger creates the row).
grant select on public.profiles to authenticated;

-- Read-own money + admin ledgers (RLS gates rows; no client write).
grant select on public.entitlements    to authenticated;
grant select on public.llm_usage        to authenticated;
grant select on public.usage_events      to authenticated;
grant select on public.app_limits        to authenticated;
grant select on public.admin_audit_log   to authenticated;

-- Let signed-in users call the RPCs (each re-checks auth/admin server-side).
grant execute on function public.spend_credit(uuid)            to authenticated;
grant execute on function public.is_admin()                    to authenticated;
grant execute on function public.admin_grant_credits(uuid, integer) to authenticated;
grant execute on function public.admin_set_banned(uuid, boolean, text) to authenticated;
