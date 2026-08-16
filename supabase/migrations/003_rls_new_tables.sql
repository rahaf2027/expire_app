-- ============================================================================
-- 003 — RLS on the new tables
-- ============================================================================
-- products / activity_logs are deliberately left alone here; they are locked
-- down in 004 once the frontend can actually sign in.
-- ============================================================================

alter table public.profiles       enable row level security;
alter table public.branches       enable row level security;
alter table public.branch_members enable row level security;

-- ─── Table grants ───────────────────────────────────────────────────────────
-- anon gets nothing: everything here requires a session.
revoke all on public.profiles       from anon;
revoke all on public.branches       from anon;
revoke all on public.branch_members from anon;

grant select                         on public.profiles       to authenticated;
grant select, insert, update, delete on public.branches       to authenticated;
grant select                         on public.branch_members to authenticated;

-- ============================================================================
-- profiles
-- ============================================================================
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.my_role() = 'master_admin'
    or (public.my_role() = 'master_chef' and owner_id = auth.uid())
  );

-- No INSERT, UPDATE or DELETE policy by design.
--
-- Accounts are created only through create_app_user() and changed only through
-- set_user_role() / set_user_active(), which enforce the role hierarchy. A
-- self-update policy is deliberately omitted: pinning role/is_active to their
-- current values would require a subquery on profiles from inside a policy on
-- profiles, which recurses. If self-service name editing is wanted later it
-- belongs in a SECURITY DEFINER RPC, not a policy.

-- ============================================================================
-- branches
-- ============================================================================
drop policy if exists branches_select on public.branches;
create policy branches_select on public.branches
  for select to authenticated
  using (id in (select * from public.my_branch_ids()));

drop policy if exists branches_insert on public.branches;
create policy branches_insert on public.branches
  for insert to authenticated
  with check (
    public.my_can_manage()
    and (public.my_role() = 'master_admin' or owner_id = auth.uid())
  );

drop policy if exists branches_update on public.branches;
create policy branches_update on public.branches
  for update to authenticated
  using (
    public.my_can_manage()
    and (public.my_role() = 'master_admin' or owner_id = auth.uid())
  )
  with check (
    public.my_can_manage()
    and (public.my_role() = 'master_admin' or owner_id = auth.uid())
  );

drop policy if exists branches_delete on public.branches;
create policy branches_delete on public.branches
  for delete to authenticated
  using (
    public.my_can_manage()
    and (public.my_role() = 'master_admin' or owner_id = auth.uid())
  );

-- ============================================================================
-- branch_members — read-only from the client; writes go through the RPCs
-- ============================================================================
drop policy if exists branch_members_select on public.branch_members;
create policy branch_members_select on public.branch_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or branch_id in (select * from public.my_branch_ids())
  );
