-- ============================================================================
-- 002 — Permission helpers + privileged RPCs
-- ============================================================================
-- Every helper is SECURITY DEFINER so that RLS policies which call them do not
-- recurse back through the policies on profiles/branches.
--
-- All of them fail closed: a signed-out or deactivated user gets NULL / no rows.
-- ============================================================================

-- ─── Who am I? ──────────────────────────────────────────────────────────────
create or replace function public.my_role()
returns user_role
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and is_active
$$;

-- The organisation (master_chef) a user belongs to.
-- master_chef belongs to itself; master_admin belongs to no org.
create or replace function public.my_org()
returns uuid
language sql stable security definer set search_path = public
as $$
  select case when role = 'master_chef' then id else owner_id end
  from public.profiles where id = auth.uid() and is_active
$$;

-- Every branch the caller may touch.
create or replace function public.my_branch_ids()
returns setof text
language sql stable security definer set search_path = public
as $$
  select b.id
  from public.branches b
  where b.is_active
    and case public.my_role()
          when 'master_admin' then true
          when 'master_chef'  then b.owner_id = auth.uid()
          else b.id in (
            select bm.branch_id from public.branch_members bm where bm.user_id = auth.uid()
          )
        end
$$;

-- Deletion is the one thing an employee may never do.
create or replace function public.my_can_delete()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public.my_role() in ('master_admin', 'master_chef', 'chef'), false)
$$;

-- Managing branches and users.
create or replace function public.my_can_manage()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public.my_role() in ('master_admin', 'master_chef'), false)
$$;

-- ============================================================================
-- create_branch — master_chef / master_admin only
-- ============================================================================
create or replace function public.create_branch(p_id text, p_name text)
returns public.branches
language plpgsql security definer set search_path = public
as $$
declare
  v_role  user_role := public.my_role();
  v_row   public.branches;
  v_id    text := lower(regexp_replace(trim(coalesce(p_id, '')), '\s+', '-', 'g'));
begin
  if v_role is null then
    raise exception 'Not authenticated';
  end if;
  if not public.my_can_manage() then
    raise exception 'Only a master chef or master admin can create branches';
  end if;
  if v_id = '' then
    raise exception 'Branch id is required';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Branch name is required';
  end if;
  if exists (select 1 from public.branches where id = v_id) then
    raise exception 'A branch with the id "%" already exists', v_id;
  end if;

  insert into public.branches (id, name, owner_id, created_by)
  values (v_id, trim(p_name), auth.uid(), auth.uid())
  returning * into v_row;

  return v_row;
end $$;

-- ============================================================================
-- create_app_user — provisions an account with a chosen password.
--
-- Writing to auth.users from a SECURITY DEFINER function keeps the
-- service_role key out of the browser entirely. The caller only ever holds the
-- anon key plus their own JWT; every privilege check happens here.
-- ============================================================================
create or replace function public.create_app_user(
  p_email      text,
  p_password   text,
  p_full_name  text,
  p_role       user_role,
  p_branch_ids text[] default '{}'
)
returns uuid
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_caller      uuid      := auth.uid();
  v_caller_role user_role := public.my_role();
  v_email       text      := lower(trim(coalesce(p_email, '')));
  v_new         uuid      := gen_random_uuid();
  v_owner       uuid;
  b             text;
begin
  if v_caller_role is null then
    raise exception 'Not authenticated';
  end if;
  if not public.my_can_manage() then
    raise exception 'Only a master chef or master admin can create users';
  end if;

  -- A master chef may not mint peers or superiors.
  if v_caller_role = 'master_chef' and p_role not in ('chef', 'employee') then
    raise exception 'A master chef can only create chef or employee accounts';
  end if;

  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'A valid email address is required';
  end if;
  if length(coalesce(p_password, '')) < 8 then
    raise exception 'Password must be at least 8 characters';
  end if;
  if exists (select 1 from auth.users where email = v_email) then
    raise exception 'An account with this email already exists';
  end if;

  -- Branch assignments must be branches the caller actually controls.
  foreach b in array coalesce(p_branch_ids, '{}') loop
    if not exists (select 1 from public.my_branch_ids() as bid where bid = b) then
      raise exception 'Branch "%" is not yours to assign', b;
    end if;
  end loop;

  if p_role in ('chef', 'employee')
     and coalesce(array_length(p_branch_ids, 1), 0) = 0 then
    raise exception 'A chef or employee must be assigned to at least one branch';
  end if;

  v_owner := case
    when p_role in ('master_admin', 'master_chef') then null
    when v_caller_role = 'master_chef'             then v_caller
    else (select owner_id from public.branches where id = p_branch_ids[1])
  end;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data
  ) values (
    '00000000-0000-0000-0000-000000000000', v_new, 'authenticated', 'authenticated',
    v_email, extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', coalesce(trim(p_full_name), ''))
  );

  -- GoTrue needs a matching identity row or password sign-in fails.
  insert into auth.identities (
    id, user_id, provider_id, provider, identity_data,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_new, v_new::text, 'email',
    jsonb_build_object(
      'sub', v_new::text, 'email', v_email,
      'email_verified', true, 'phone_verified', false
    ),
    now(), now(), now()
  );

  insert into public.profiles (id, email, full_name, role, owner_id, created_by)
  values (v_new, v_email, coalesce(trim(p_full_name), ''), p_role, v_owner, v_caller);

  foreach b in array coalesce(p_branch_ids, '{}') loop
    insert into public.branch_members (user_id, branch_id)
    values (v_new, b)
    on conflict do nothing;
  end loop;

  return v_new;
end $$;

-- ============================================================================
-- set_user_active / set_user_role / set_user_branches — management panel
-- ============================================================================
create or replace function public.set_user_active(p_user_id uuid, p_active boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_caller_role user_role := public.my_role();
  v_target_role user_role;
  v_target_owner uuid;
begin
  if not public.my_can_manage() then
    raise exception 'Insufficient privileges';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot deactivate your own account';
  end if;

  select role, owner_id into v_target_role, v_target_owner
  from public.profiles where id = p_user_id;

  if v_target_role is null then
    raise exception 'User not found';
  end if;
  if v_caller_role = 'master_chef'
     and (v_target_owner is distinct from auth.uid() or v_target_role not in ('chef','employee')) then
    raise exception 'That user is not in your organisation';
  end if;

  update public.profiles
  set is_active = p_active, updated_at = now()
  where id = p_user_id;
end $$;

create or replace function public.set_user_role(p_user_id uuid, p_role user_role)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_caller_role  user_role := public.my_role();
  v_target_role  user_role;
  v_target_owner uuid;
begin
  if not public.my_can_manage() then
    raise exception 'Insufficient privileges';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot change your own role';
  end if;

  select role, owner_id into v_target_role, v_target_owner
  from public.profiles where id = p_user_id;

  if v_target_role is null then
    raise exception 'User not found';
  end if;
  if v_caller_role = 'master_chef' then
    if v_target_owner is distinct from auth.uid() or v_target_role not in ('chef','employee') then
      raise exception 'That user is not in your organisation';
    end if;
    if p_role not in ('chef', 'employee') then
      raise exception 'A master chef can only assign the chef or employee role';
    end if;
  end if;

  update public.profiles
  set role = p_role, updated_at = now()
  where id = p_user_id;
end $$;

create or replace function public.set_user_branches(p_user_id uuid, p_branch_ids text[])
returns void
language plpgsql security definer set search_path = public
as $$
declare
  b text;
begin
  if not public.my_can_manage() then
    raise exception 'Insufficient privileges';
  end if;

  foreach b in array coalesce(p_branch_ids, '{}') loop
    if not exists (select 1 from public.my_branch_ids() as bid where bid = b) then
      raise exception 'Branch "%" is not yours to assign', b;
    end if;
  end loop;

  delete from public.branch_members
  where user_id = p_user_id
    and branch_id in (select * from public.my_branch_ids());

  foreach b in array coalesce(p_branch_ids, '{}') loop
    insert into public.branch_members (user_id, branch_id)
    values (p_user_id, b)
    on conflict do nothing;
  end loop;
end $$;

-- ============================================================================
-- delete_app_user / delete_all_managed_users — account deletion
-- ============================================================================
create or replace function public.delete_app_user(p_user_id uuid)
returns void
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_caller_role  user_role := public.my_role();
  v_target_role  user_role;
  v_target_owner uuid;
begin
  if not public.my_can_manage() then
    raise exception 'Insufficient privileges';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'You cannot delete your own account';
  end if;

  select role, owner_id into v_target_role, v_target_owner
  from public.profiles where id = p_user_id;

  if v_target_role is null then
    raise exception 'User not found';
  end if;

  if v_caller_role = 'master_chef' then
    if v_target_owner is distinct from auth.uid() or v_target_role not in ('chef','employee') then
      raise exception 'That user is not in your organisation';
    end if;
  end if;

  delete from public.branch_members where user_id = p_user_id;
  delete from public.profiles where id = p_user_id;
  delete from auth.identities where user_id = p_user_id;
  delete from auth.users where id = p_user_id;
end $$;

create or replace function public.delete_all_managed_users()
returns integer
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_caller_role   user_role := public.my_role();
  v_deleted_count integer := 0;
  r record;
begin
  if not public.my_can_manage() then
    raise exception 'Insufficient privileges';
  end if;

  for r in (
    select id, role, owner_id from public.profiles
    where id != auth.uid()
      and (
        v_caller_role = 'master_admin'
        or (v_caller_role = 'master_chef' and owner_id = auth.uid() and role in ('chef', 'employee'))
      )
  ) loop
    delete from public.branch_members where user_id = r.id;
    delete from public.profiles where id = r.id;
    delete from auth.identities where user_id = r.id;
    delete from auth.users where id = r.id;
    v_deleted_count := v_deleted_count + 1;
  end loop;

  return v_deleted_count;
end $$;

-- ============================================================================
-- update_branch / delete_branch / restore_branch — branch management
-- ============================================================================
create or replace function public.update_branch(p_id text, p_name text)
returns public.branches
language plpgsql security definer set search_path = public
as $$
declare
  v_role user_role := public.my_role();
  v_row  public.branches;
  v_name text := trim(coalesce(p_name, ''));
begin
  if v_role is null then
    raise exception 'Not authenticated';
  end if;
  if not public.my_can_manage() then
    raise exception 'Only a master chef or master admin can edit branches';
  end if;
  if v_name = '' then
    raise exception 'Branch name cannot be empty';
  end if;

  if v_role = 'master_chef' then
    if not exists (select 1 from public.branches where id = p_id and owner_id = auth.uid()) then
      raise exception 'Branch "%" does not belong to your organisation', p_id;
    end if;
  end if;

  update public.branches
  set name = v_name
  where id = p_id
  returning * into v_row;

  if v_row is null then
    raise exception 'Branch "%" not found', p_id;
  end if;

  return v_row;
end $$;

create or replace function public.delete_branch(p_id text, p_permanent boolean default false)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_role user_role := public.my_role();
begin
  if v_role is null then
    raise exception 'Not authenticated';
  end if;
  if not public.my_can_manage() then
    raise exception 'Only a master chef or master admin can delete branches';
  end if;

  if v_role = 'master_chef' then
    if not exists (select 1 from public.branches where id = p_id and owner_id = auth.uid()) then
      raise exception 'Branch "%" does not belong to your organisation', p_id;
    end if;
  end if;

  if p_permanent then
    delete from public.branch_members where branch_id = p_id;
    delete from public.products where branch_id = p_id;
    delete from public.branches where id = p_id;
  else
    update public.branches
    set is_active = false
    where id = p_id;
  end if;
end $$;

create or replace function public.restore_branch(p_id text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_role user_role := public.my_role();
begin
  if v_role is null then
    raise exception 'Not authenticated';
  end if;
  if not public.my_can_manage() then
    raise exception 'Only a master chef or master admin can restore branches';
  end if;

  if v_role = 'master_chef' then
    if not exists (select 1 from public.branches where id = p_id and owner_id = auth.uid()) then
      raise exception 'Branch "%" does not belong to your organisation', p_id;
    end if;
  end if;

  update public.branches
  set is_active = true
  where id = p_id;
end $$;

create or replace function public.fetch_all_managed_branches()
returns setof public.branches
language plpgsql security definer set search_path = public
as $$
declare
  v_role user_role := public.my_role();
begin
  if v_role is null then
    raise exception 'Not authenticated';
  end if;

  if v_role = 'master_admin' then
    return query select * from public.branches order by created_at desc;
  elsif v_role = 'master_chef' then
    return query select * from public.branches where owner_id = auth.uid() order by created_at desc;
  else
    return query select * from public.branches where is_active = true and id in (
      select bm.branch_id from public.branch_members bm where bm.user_id = auth.uid()
    ) order by created_at desc;
  end if;
end $$;

-- ─── Expose RPCs to signed-in users only ────────────────────────────────────
revoke all on function public.create_branch(text, text)                                    from public, anon;
revoke all on function public.create_app_user(text, text, text, user_role, text[])         from public, anon;
revoke all on function public.set_user_active(uuid, boolean)                               from public, anon;
revoke all on function public.set_user_role(uuid, user_role)                               from public, anon;
revoke all on function public.set_user_branches(uuid, text[])                              from public, anon;
revoke all on function public.delete_app_user(uuid)                                        from public, anon;
revoke all on function public.delete_all_managed_users()                                  from public, anon;
revoke all on function public.update_branch(text, text)                                    from public, anon;
revoke all on function public.delete_branch(text, boolean)                                 from public, anon;
revoke all on function public.restore_branch(text)                                         from public, anon;
revoke all on function public.fetch_all_managed_branches()                                 from public, anon;

grant execute on function public.create_branch(text, text)                            to authenticated;
grant execute on function public.create_app_user(text, text, text, user_role, text[]) to authenticated;
grant execute on function public.set_user_active(uuid, boolean)                       to authenticated;
grant execute on function public.set_user_role(uuid, user_role)                       to authenticated;
grant execute on function public.set_user_branches(uuid, text[])                      to authenticated;
grant execute on function public.delete_app_user(uuid)                                to authenticated;
grant execute on function public.delete_all_managed_users()                          to authenticated;
grant execute on function public.update_branch(text, text)                            to authenticated;
grant execute on function public.delete_branch(text, boolean)                         to authenticated;
grant execute on function public.restore_branch(text)                                 to authenticated;
grant execute on function public.fetch_all_managed_branches()                         to authenticated;
