-- Kapman Toolkit V2.2 — schema extension for collaboration and safer reruns

create extension if not exists pgcrypto;

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

create table if not exists public.user_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

alter table public.user_favorites enable row level security;

create table if not exists public.user_recipe_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id text not null,
  content text not null default '',
  updated_at timestamptz not null default now(),
  unique (user_id, recipe_id)
);

alter table public.user_recipe_notes enable row level security;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create table if not exists public.project_recipes (
  project_id uuid not null references public.projects(id) on delete cascade,
  recipe_id text not null,
  added_at timestamptz not null default now(),
  primary key (project_id, recipe_id)
);

alter table public.project_recipes enable row level security;

create table if not exists public.project_checklist_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  label text not null,
  done boolean not null default false,
  sort_order integer not null default 0
);

alter table public.project_checklist_items enable row level security;

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

create table if not exists public.project_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.project_comments enable row level security;

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

-- Policies created only if missing
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
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='project_members' AND policyname='Owners manage project members') THEN
    EXECUTE 'create policy "Owners manage project members" on public.project_members for all using (exists (select 1 from public.projects where projects.id = project_members.project_id and projects.user_id = auth.uid()) or auth.uid() = user_id) with check (exists (select 1 from public.projects where projects.id = project_members.project_id and projects.user_id = auth.uid()) or auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='project_comments' AND policyname='Project members read comments') THEN
    EXECUTE 'create policy "Project members read comments" on public.project_comments for select using (exists (select 1 from public.projects where projects.id = project_comments.project_id and projects.user_id = auth.uid()) or exists (select 1 from public.project_members where project_members.project_id = project_comments.project_id and project_members.user_id = auth.uid()))';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='project_comments' AND policyname='Project members add comments') THEN
    EXECUTE 'create policy "Project members add comments" on public.project_comments for insert with check (exists (select 1 from public.projects where projects.id = project_comments.project_id and projects.user_id = auth.uid()) or exists (select 1 from public.project_members where project_members.project_id = project_comments.project_id and project_members.user_id = auth.uid()))';
  END IF;
END $$;
