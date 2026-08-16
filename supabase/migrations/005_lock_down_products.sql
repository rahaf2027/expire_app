-- ============================================================================
-- 005 — Replace the wide-open product policies with branch-scoped ones
-- ============================================================================
-- Before this migration both tables carried a single policy:
--     FOR ALL TO public USING (true) WITH CHECK (true)
-- RLS was enabled but permitted everything, so anyone holding the anon key —
-- which ships inside the JavaScript bundle — could read and write every
-- branch's inventory.
-- ============================================================================

drop policy if exists "Allow all operations on products"      on public.products;
drop policy if exists "Allow all operations on activity_logs" on public.activity_logs;

revoke all on public.products      from anon;
revoke all on public.activity_logs from anon;

grant select, insert, update, delete on public.products      to authenticated;
grant select, insert, update, delete on public.activity_logs to authenticated;

-- ============================================================================
-- products
-- ============================================================================
drop policy if exists products_select on public.products;
create policy products_select on public.products
  for select to authenticated
  using (branch_id in (select * from public.my_branch_ids()));

drop policy if exists products_insert on public.products;
create policy products_insert on public.products
  for insert to authenticated
  with check (branch_id in (select * from public.my_branch_ids()));

-- The app "deletes" an active product by flipping its status to 'trash', which
-- is an UPDATE rather than a DELETE. Without the status guard below, an
-- employee blocked from DELETE could still bin every product in the branch.
drop policy if exists products_update on public.products;
create policy products_update on public.products
  for update to authenticated
  using (branch_id in (select * from public.my_branch_ids()))
  with check (
    branch_id in (select * from public.my_branch_ids())
    and (status <> 'trash' or public.my_can_delete())
  );

drop policy if exists products_delete on public.products;
create policy products_delete on public.products
  for delete to authenticated
  using (
    branch_id in (select * from public.my_branch_ids())
    and public.my_can_delete()
  );

-- ============================================================================
-- activity_logs — append-only for everyone; only chef and above may prune
-- ============================================================================
drop policy if exists activity_logs_select on public.activity_logs;
create policy activity_logs_select on public.activity_logs
  for select to authenticated
  using (branch_id in (select * from public.my_branch_ids()));

drop policy if exists activity_logs_insert on public.activity_logs;
create policy activity_logs_insert on public.activity_logs
  for insert to authenticated
  with check (branch_id in (select * from public.my_branch_ids()));

-- Logs are an audit trail: nobody edits them in place.
drop policy if exists activity_logs_delete on public.activity_logs;
create policy activity_logs_delete on public.activity_logs
  for delete to authenticated
  using (
    branch_id in (select * from public.my_branch_ids())
    and public.my_can_delete()
  );
