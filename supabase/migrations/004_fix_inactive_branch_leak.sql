-- ============================================================================
-- 004 — Fix: a deactivated user still saw their assigned branches
-- ============================================================================
-- my_role() returns NULL for a signed-out or deactivated user. In the CASE
-- below, `CASE NULL WHEN 'master_admin' ...` matches no WHEN arm and falls
-- through to ELSE, which checked branch_members without ever re-testing
-- is_active. Deactivating an account therefore did not revoke branch access.
--
-- Guarding on my_role() IS NOT NULL makes the whole function fail closed.
-- ============================================================================

create or replace function public.my_branch_ids()
returns setof text
language sql stable security definer set search_path = public
as $$
  select b.id
  from public.branches b
  where b.is_active
    and public.my_role() is not null
    and case public.my_role()
          when 'master_admin' then true
          when 'master_chef'  then b.owner_id = auth.uid()
          else b.id in (
            select bm.branch_id from public.branch_members bm where bm.user_id = auth.uid()
          )
        end
$$;
