-- Keep HunMaster Admin and HunMaster Learn on one real, DB-backed course entity.
-- The title/description match the existing A1 catalogue in HunMaster Learn.
insert into public.courses (
  slug,
  title,
  description,
  status,
  difficulty,
  position
)
values (
  'a1',
  'Венгерский A1',
  'База: алфавит, приветствия, числа, первые диалоги.',
  'published',
  'beginner',
  1
)
on conflict (slug) do update
set title = excluded.title,
    description = excluded.description,
    status = excluded.status,
    difficulty = excluded.difficulty,
    position = excluded.position;

-- Grant/reactivate/extend is one transaction. SECURITY INVOKER keeps the
-- existing admin RLS policies in force for every table touched by the RPC.
create or replace function public.admin_grant_course_access(
  p_user_id uuid,
  p_course_id uuid,
  p_days integer default null
)
returns public.enrollments
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  v_admin_id uuid := (select auth.uid());
  v_expires_at timestamptz;
  v_enrollment public.enrollments;
begin
  if v_admin_id is null or not private.is_admin(v_admin_id) then
    raise exception using errcode = '42501', message = 'Admin access required.';
  end if;

  if p_days is not null and p_days not in (30, 90, 180, 365) then
    raise exception using errcode = '22023', message = 'Unsupported access duration.';
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception using errcode = 'P0002', message = 'User profile not found.';
  end if;

  if not exists (
    select 1 from public.courses where id = p_course_id and status = 'published'
  ) then
    raise exception using errcode = 'P0002', message = 'Published course not found.';
  end if;

  v_expires_at := case
    when p_days is null then null
    else now() + make_interval(days => p_days)
  end;

  insert into public.enrollments (
    user_id,
    course_id,
    status,
    granted_by,
    granted_at,
    expires_at
  )
  values (
    p_user_id,
    p_course_id,
    'active',
    v_admin_id,
    now(),
    v_expires_at
  )
  on conflict (user_id, course_id) do update
  set status = 'active',
      granted_by = excluded.granted_by,
      granted_at = excluded.granted_at,
      expires_at = excluded.expires_at,
      updated_at = now()
  returning * into v_enrollment;

  update public.profiles
  set account_status = 'active',
      is_active = true,
      updated_at = now()
  where id = p_user_id;

  insert into public.admin_audit_log (
    admin_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    v_admin_id,
    'enrollment.granted',
    'enrollment',
    v_enrollment.id,
    jsonb_build_object(
      'userId', p_user_id,
      'courseId', p_course_id,
      'expiresAt', v_expires_at
    )
  );

  return v_enrollment;
end;
$$;

create or replace function public.admin_end_user_access(
  p_user_id uuid,
  p_status public.enrollment_status default 'revoked'
)
returns integer
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  v_admin_id uuid := (select auth.uid());
  v_affected integer := 0;
begin
  if v_admin_id is null or not private.is_admin(v_admin_id) then
    raise exception using errcode = '42501', message = 'Admin access required.';
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception using errcode = 'P0002', message = 'User profile not found.';
  end if;

  if p_status not in ('revoked'::public.enrollment_status, 'expired'::public.enrollment_status) then
    raise exception using errcode = '22023', message = 'Unsupported final access status.';
  end if;

  update public.enrollments
  set status = p_status,
      updated_at = now()
  where user_id = p_user_id
    and status = 'active';

  get diagnostics v_affected = row_count;

  update public.profiles
  set account_status = 'pending',
      is_active = true,
      updated_at = now()
  where id = p_user_id
    and role not in ('admin'::public.app_role, 'owner'::public.app_role)
    and account_status <> 'blocked';

  insert into public.admin_audit_log (
    admin_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    v_admin_id,
    case when p_status = 'expired' then 'enrollment.expired' else 'enrollment.revoked' end,
    'profile',
    p_user_id,
    jsonb_build_object('affectedEnrollments', v_affected)
  );

  return v_affected;
end;
$$;

revoke execute on function public.admin_grant_course_access(uuid, uuid, integer)
  from public, anon;
revoke execute on function public.admin_end_user_access(uuid, public.enrollment_status)
  from public, anon;

grant execute on function public.admin_grant_course_access(uuid, uuid, integer)
  to authenticated;
grant execute on function public.admin_end_user_access(uuid, public.enrollment_status)
  to authenticated;
