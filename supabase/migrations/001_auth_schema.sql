-- ============================================================================
-- 001 — Auth schema: roles, profiles, branches, branch membership
-- ============================================================================
-- branches.id is TEXT (not uuid) on purpose: products.branch_id already holds
-- slugs like 'main-branch'. Keeping TEXT lets us adopt the existing 118 rows
-- without a data migration.
-- ============================================================================

-- ─── Role hierarchy ─────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('master_admin', 'master_chef', 'chef', 'employee');
  end if;
end $$;

-- ─── profiles: one row per auth.users row ───────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text        not null unique,
  full_name   text        not null default '',
  role        user_role   not null default 'employee',
  -- Which master_chef's organisation this user belongs to.
  -- NULL for master_admin (platform owner) and for master_chef themselves.
  owner_id    uuid        references public.profiles(id) on delete cascade,
  is_active   boolean     not null default true,
  created_by  uuid        references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists profiles_owner_idx on public.profiles(owner_id);
create index if not exists profiles_role_idx  on public.profiles(role);

-- ─── branches ───────────────────────────────────────────────────────────────
create table if not exists public.branches (
  id          text        primary key,
  name        text        not null,
  owner_id    uuid        not null references public.profiles(id) on delete cascade,
  is_active   boolean     not null default true,
  created_by  uuid        references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists branches_owner_idx on public.branches(owner_id);

-- ─── branch_members: which chefs/employees can reach which branch ───────────
-- master_chef reach is derived from branches.owner_id, so they need no rows here.
create table if not exists public.branch_members (
  user_id    uuid        not null references public.profiles(id)  on delete cascade,
  branch_id  text        not null references public.branches(id)  on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, branch_id)
);

create index if not exists branch_members_branch_idx on public.branch_members(branch_id);

-- ─── Tie activity logs to a real account, not a free-text name ──────────────
alter table public.activity_logs
  add column if not exists user_id uuid references public.profiles(id) on delete set null;

-- ============================================================================
-- Backfill: adopt every branch_id already present in products.
-- owner_id is left dangling until bootstrap (003) assigns the master_chef, so
-- the FK is added only after that step. Here we insert with a placeholder that
-- 003 will correct.
-- ============================================================================
create table if not exists public._pending_branch_backfill (
  branch_id text primary key
);

insert into public._pending_branch_backfill (branch_id)
select distinct branch_id from public.products
where branch_id is not null and branch_id <> ''
on conflict do nothing;

insert into public._pending_branch_backfill (branch_id)
select distinct branch_id from public.activity_logs
where branch_id is not null and branch_id <> ''
on conflict do nothing;
