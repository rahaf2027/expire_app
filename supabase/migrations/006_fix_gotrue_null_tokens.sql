-- ============================================================================
-- 006 — Fix: sign-in returned 500 "Database error querying schema"
-- ============================================================================
-- GoTrue is written in Go and scans auth.users' token columns into plain
-- (non-pointer) strings. A NULL in any of them fails the row scan, and the
-- whole sign-in request dies with a 500 before any password check happens.
--
-- Rows created through the GoTrue API get '' for these columns. Rows we insert
-- ourselves default to NULL, so every SQL-provisioned account was unable to
-- sign in. They must be empty strings.
-- ============================================================================

update auth.users
set confirmation_token         = coalesce(confirmation_token, ''),
    recovery_token             = coalesce(recovery_token, ''),
    email_change               = coalesce(email_change, ''),
    email_change_token_new     = coalesce(email_change_token_new, ''),
    email_change_token_current = coalesce(email_change_token_current, ''),
    phone_change               = coalesce(phone_change, ''),
    phone_change_token         = coalesce(phone_change_token, ''),
    reauthentication_token     = coalesce(reauthentication_token, '')
where confirmation_token         is null
   or recovery_token             is null
   or email_change               is null
   or email_change_token_new     is null
   or email_change_token_current is null
   or phone_change               is null
   or phone_change_token         is null
   or reauthentication_token     is null;

-- ─── Teach create_app_user to write them from the start ─────────────────────
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
    raw_app_meta_data, raw_user_meta_data,
    -- '' not NULL: see the header comment.
    confirmation_token, recovery_token, email_change,
    email_change_token_new, email_change_token_current,
    phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_new, 'authenticated', 'authenticated',
    v_email, extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', coalesce(trim(p_full_name), '')),
    '', '', '', '', '', '', '', ''
  );

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

revoke all on function public.create_app_user(text, text, text, user_role, text[]) from public, anon;
grant execute on function public.create_app_user(text, text, text, user_role, text[]) to authenticated;
