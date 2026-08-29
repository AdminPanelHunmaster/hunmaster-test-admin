-- HunMaster Security Center and Emergency Mode.
-- Containment is enforced in PostgreSQL. It never deletes application data,
-- changes passwords, or performs application-level encryption.

insert into public.platform_settings (key, value)
values (
  'security',
  jsonb_build_object(
    'emergencyMode', false,
    'incidentStartedAt', null,
    'incidentStartedBy', null,
    'incidentReason', null,
    'incidentComment', null,
    'deployment', null
  )
)
on conflict (key) do nothing;

create or replace function private.is_emergency_mode()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select value ->> 'emergencyMode' = 'true'
      from public.platform_settings
      where key = 'security'
    ),
    false
  );
$$;

create or replace function private.has_verified_mfa(_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.mfa_factors
    where user_id = _user_id
      and status::text = 'verified'
  );
$$;

create or replace function private.has_recent_password_auth(_max_age_seconds integer default 600)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from jsonb_array_elements(coalesce(auth.jwt() -> 'amr', '[]'::jsonb)) entry
    where entry ->> 'method' = 'password'
      and entry ->> 'timestamp' ~ '^[0-9]+$'
      and (entry ->> 'timestamp')::bigint >=
        extract(epoch from clock_timestamp())::bigint - greatest(_max_age_seconds, 60)
  );
$$;

create or replace function private.has_elevated_auth(_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    _user_id is not null
    and private.is_admin(_user_id)
    and private.has_recent_password_auth(600)
    and (
      not private.has_verified_mfa(_user_id)
      or coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
    );
$$;

create or replace function private.assert_elevated_owner()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not private.is_owner(v_user_id) then
    raise exception using errcode = '42501', message = 'Owner access required.';
  end if;

  if not private.has_recent_password_auth(600) then
    raise exception using errcode = '42501', message = 'Recent password re-authentication required.';
  end if;

  if private.has_verified_mfa(v_user_id)
     and coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2' then
    raise exception using errcode = '42501', message = 'MFA verification required.';
  end if;
end;
$$;

revoke all on function private.is_emergency_mode() from public, anon;
revoke all on function private.has_verified_mfa(uuid) from public, anon, authenticated;
revoke all on function private.has_recent_password_auth(integer) from public, anon, authenticated;
revoke all on function private.has_elevated_auth(uuid) from public, anon, authenticated;
revoke all on function private.assert_elevated_owner() from public, anon, authenticated;
grant execute on function private.is_emergency_mode() to authenticated;

-- Close helper-function exposure inherited from PostgreSQL's default PUBLIC
-- EXECUTE grant. These helpers remain callable by authenticated RLS policies.
revoke all on function private.current_user_role(uuid) from public, anon;
revoke all on function private.is_admin(uuid) from public, anon;
revoke all on function private.is_owner(uuid) from public, anon;
grant execute on function private.current_user_role(uuid) to authenticated;
grant execute on function private.is_admin(uuid) to authenticated;
grant execute on function private.is_owner(uuid) to authenticated;

revoke all on function public.username_available(text) from public, anon, authenticated;
revoke all on function public.active_enrollment_for_course(uuid) from public, anon;
grant execute on function public.active_enrollment_for_course(uuid) to authenticated;

-- Database-level profile privilege enforcement. Admins may manage access but
-- only owners may change roles or modify another owner. Profile email remains
-- owned by Supabase Auth and cannot be rewritten through the Data API.
create or replace function public.prevent_unsafe_profile_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role public.app_role;
begin
  if private.is_emergency_mode()
     and coalesce(current_setting('hunmaster.security_recovery', true), '') <> 'on' then
    if tg_op <> 'UPDATE'
       or new.role is distinct from old.role
       or new.account_status is distinct from old.account_status
       or new.is_active is distinct from old.is_active
       or new.email is distinct from old.email
       or new.username is distinct from old.username
       or new.telegram is distinct from old.telegram then
      raise exception using errcode = '42501',
        message = 'Operation blocked while HunMaster Emergency Mode is active.';
    end if;
  end if;

  if v_actor is null then
    return new;
  end if;

  v_actor_role := private.current_user_role(v_actor);

  if new.email is distinct from old.email then
    raise exception using errcode = '42501',
      message = 'Profile email is managed by Supabase Auth.';
  end if;

  if new.role is distinct from old.role then
    if v_actor_role <> 'owner'::public.app_role then
      raise exception using errcode = '42501', message = 'Only owners can change roles.';
    end if;

    if old.role = 'owner'::public.app_role
       and new.role <> 'owner'::public.app_role
       and (select count(*) from public.profiles where role = 'owner' and is_active) <= 1 then
      raise exception using errcode = '23514', message = 'The last active owner cannot be demoted.';
    end if;
  end if;

  if old.role = 'owner'::public.app_role
     and v_actor_role <> 'owner'::public.app_role
     and (
       new.account_status is distinct from old.account_status
       or new.is_active is distinct from old.is_active
     ) then
    raise exception using errcode = '42501', message = 'Only owners can modify another owner.';
  end if;

  if v_actor_role not in ('admin'::public.app_role, 'owner'::public.app_role)
     and (
       new.role is distinct from old.role
       or new.account_status is distinct from old.account_status
       or new.is_active is distinct from old.is_active
     ) then
    raise exception using errcode = '42501',
      message = 'Only administrators can change role or access status.';
  end if;

  return new;
end;
$$;

create or replace function private.enforce_emergency_mutation_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.is_emergency_mode()
     and coalesce(current_setting('hunmaster.security_recovery', true), '') <> 'on' then
    raise exception using errcode = '42501',
      message = 'Operation blocked while HunMaster Emergency Mode is active.';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function private.enforce_emergency_profile_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_emergency_mode()
     or coalesce(current_setting('hunmaster.security_recovery', true), '') = 'on' then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op <> 'UPDATE'
     or new.role is distinct from old.role
     or new.account_status is distinct from old.account_status
     or new.is_active is distinct from old.is_active
     or new.email is distinct from old.email
     or new.username is distinct from old.username
     or new.telegram is distinct from old.telegram then
    raise exception using errcode = '42501',
      message = 'Operation blocked while HunMaster Emergency Mode is active.';
  end if;

  return new;
end;
$$;

create or replace function private.protect_security_setting()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text := case when tg_op = 'DELETE' then old.key else new.key end;
begin
  if v_key = 'security'
     and coalesce(current_setting('hunmaster.security_recovery', true), '') <> 'on' then
    raise exception using errcode = '42501',
      message = 'Security state can only be changed through the protected owner workflow.';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'courses', 'course_sections', 'lessons', 'lesson_blocks', 'enrollments',
    'user_roles', 'platform_settings', 'announcements', 'assignments',
    'quizzes', 'quiz_questions', 'quiz_answers'
  ]
  loop
    execute format('drop trigger if exists enforce_emergency_mutation_block on public.%I', v_table);
    execute format(
      'create trigger enforce_emergency_mutation_block before insert or update or delete on public.%I for each row execute function private.enforce_emergency_mutation_block()',
      v_table
    );

    execute format('drop policy if exists emergency_insert_guard on public.%I', v_table);
    execute format('drop policy if exists emergency_update_guard on public.%I', v_table);
    execute format('drop policy if exists emergency_delete_guard on public.%I', v_table);
    execute format(
      'create policy emergency_insert_guard on public.%I as restrictive for insert to authenticated with check (not private.is_emergency_mode())',
      v_table
    );
    execute format(
      'create policy emergency_update_guard on public.%I as restrictive for update to authenticated using (not private.is_emergency_mode()) with check (not private.is_emergency_mode())',
      v_table
    );
    execute format(
      'create policy emergency_delete_guard on public.%I as restrictive for delete to authenticated using (not private.is_emergency_mode())',
      v_table
    );
  end loop;
end $$;

drop trigger if exists enforce_emergency_profile_block on public.profiles;
create trigger enforce_emergency_profile_block
before insert or update or delete on public.profiles
for each row execute function private.enforce_emergency_profile_block();

drop trigger if exists protect_security_setting on public.platform_settings;
create trigger protect_security_setting
before insert or update or delete on public.platform_settings
for each row execute function private.protect_security_setting();

-- Media writes are also contained for browser clients. Existing signed media
-- and course content remain readable under their established policies.
drop policy if exists emergency_storage_insert_guard on storage.objects;
create policy emergency_storage_insert_guard on storage.objects
as restrictive for insert to authenticated
with check (not private.is_emergency_mode());

drop policy if exists emergency_storage_update_guard on storage.objects;
create policy emergency_storage_update_guard on storage.objects
as restrictive for update to authenticated
using (not private.is_emergency_mode())
with check (not private.is_emergency_mode());

drop policy if exists emergency_storage_delete_guard on storage.objects;
create policy emergency_storage_delete_guard on storage.objects
as restrictive for delete to authenticated
using (not private.is_emergency_mode());

-- The audit log is append-only from the client: no update, delete or truncate
-- grants and no RLS policies for those operations.
revoke update, delete, truncate on public.admin_audit_log from anon, authenticated;

create or replace function private.sanitize_audit_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    new.admin_id := auth.uid();
  end if;

  if coalesce(new.metadata, '{}'::jsonb)::text ~*
     '"(password|access[_-]?token|refresh[_-]?token|private[_-]?key|secret[_-]?key)"[[:space:]]*:' then
    raise exception using errcode = '22023',
      message = 'Sensitive authentication material is forbidden in audit metadata.';
  end if;

  return new;
end;
$$;

drop trigger if exists sanitize_audit_insert on public.admin_audit_log;
create trigger sanitize_audit_insert
before insert on public.admin_audit_log
for each row execute function private.sanitize_audit_insert();

create or replace function private.audit_profile_security_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role then
    insert into public.admin_audit_log (admin_id, action, entity_type, entity_id, metadata)
    values (
      auth.uid(),
      'user.role_changed',
      'profile',
      new.id,
      jsonb_build_object('from', old.role, 'to', new.role)
    );
  end if;

  if new.account_status is distinct from old.account_status
     or new.is_active is distinct from old.is_active then
    insert into public.admin_audit_log (admin_id, action, entity_type, entity_id, metadata)
    values (
      auth.uid(),
      case when new.is_active and new.account_status <> 'blocked' then 'user.access_restored' else 'user.access_restricted' end,
      'profile',
      new.id,
      jsonb_build_object(
        'accountStatus', new.account_status,
        'isActive', new.is_active
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists audit_profile_security_change on public.profiles;
create trigger audit_profile_security_change
after update of role, account_status, is_active on public.profiles
for each row execute function private.audit_profile_security_change();

create index if not exists idx_admin_audit_log_admin_id
on public.admin_audit_log(admin_id);

create index if not exists idx_platform_settings_updated_by
on public.platform_settings(updated_by);

create or replace function public.security_get_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_security jsonb;
  v_total_tables integer;
  v_unprotected_tables jsonb;
  v_anon_unrestricted_writes integer;
  v_public_definer_functions integer;
  v_mutable_audit_policies integer;
  v_admin_count integer;
  v_owner_count integer;
  v_current_sessions integer;
  v_platform_sessions integer;
  v_verified_factors integer;
  v_last_audit_at timestamptz;
begin
  if v_user_id is null or not private.is_admin(v_user_id) then
    raise exception using errcode = '42501', message = 'Admin access required.';
  end if;

  select value into v_security
  from public.platform_settings
  where key = 'security';

  select count(*) into v_total_tables
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r';

  select coalesce(jsonb_agg(c.relname order by c.relname), '[]'::jsonb)
  into v_unprotected_tables
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;

  select count(*) into v_anon_unrestricted_writes
  from pg_catalog.pg_policies
  where schemaname = 'public'
    and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
    and roles && array['anon'::name, 'public'::name]
    and (
      lower(coalesce(qual, '')) in ('true', '(true)')
      or lower(coalesce(with_check, '')) in ('true', '(true)')
    );

  select count(*) into v_public_definer_functions
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'private')
    and p.prosecdef
    and pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE');

  select count(*) into v_mutable_audit_policies
  from pg_catalog.pg_policies
  where schemaname = 'public'
    and tablename = 'admin_audit_log'
    and cmd in ('UPDATE', 'DELETE', 'ALL');

  select count(*) filter (where role = 'admin'), count(*) filter (where role = 'owner')
  into v_admin_count, v_owner_count
  from public.profiles
  where is_active;

  select count(*) into v_current_sessions
  from auth.sessions
  where user_id = v_user_id and (not_after is null or not_after > now());

  if private.is_owner(v_user_id) then
    select count(*) into v_platform_sessions
    from auth.sessions
    where not_after is null or not_after > now();
  end if;

  select count(*) into v_verified_factors
  from auth.mfa_factors
  where user_id = v_user_id and status::text = 'verified';

  select max(created_at) into v_last_audit_at
  from public.admin_audit_log
  where action = 'security.audit_completed';

  return jsonb_build_object(
    'emergency', coalesce(v_security, jsonb_build_object('emergencyMode', false)),
    'database', jsonb_build_object(
      'publicTableCount', v_total_tables,
      'unprotectedTables', v_unprotected_tables,
      'anonymousUnrestrictedWrites', v_anon_unrestricted_writes,
      'anonymousSecurityDefinerFunctions', v_public_definer_functions,
      'mutableAuditPolicies', v_mutable_audit_policies
    ),
    'authentication', jsonb_build_object(
      'activeAdminCount', v_admin_count,
      'activeOwnerCount', v_owner_count,
      'currentUserSessions', v_current_sessions,
      'platformSessions', v_platform_sessions,
      'verifiedMfaFactors', v_verified_factors,
      'currentAal', coalesce(auth.jwt() ->> 'aal', 'aal1')
    ),
    'lastSecurityAuditAt', v_last_audit_at,
    'checkedAt', now()
  );
end;
$$;

create or replace function public.security_get_my_sessions()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_current_session uuid := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  v_result jsonb;
begin
  if v_user_id is null or not private.is_admin(v_user_id) then
    raise exception using errcode = '42501', message = 'Admin access required.';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'createdAt', s.created_at,
        'updatedAt', s.updated_at,
        'refreshedAt', s.refreshed_at,
        'notAfter', s.not_after,
        'aal', s.aal,
        'userAgent', nullif(left(s.user_agent, 240), ''),
        'isCurrent', s.id = v_current_session
      ) order by (s.id = v_current_session) desc, s.updated_at desc
    ),
    '[]'::jsonb
  ) into v_result
  from auth.sessions s
  where s.user_id = v_user_id
    and (s.not_after is null or s.not_after > now());

  return v_result;
end;
$$;

create or replace function public.security_set_emergency_mode(
  p_enabled boolean,
  p_reason text,
  p_comment text,
  p_deployment text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_current jsonb;
  v_next jsonb;
  v_allowed_reasons constant text[] := array[
    'suspected_compromise', 'suspicious_activity', 'credential_leak',
    'traffic_attack', 'unknown', 'other', 'resolved'
  ];
begin
  perform private.assert_elevated_owner();
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('hunmaster.security.emergency'));

  if p_reason is null or not (p_reason = any(v_allowed_reasons)) then
    raise exception using errcode = '22023', message = 'Choose a valid incident reason.';
  end if;
  if length(coalesce(p_comment, '')) > 1000 then
    raise exception using errcode = '22023', message = 'Incident comment is too long.';
  end if;
  if length(coalesce(p_deployment, '')) > 240 then
    raise exception using errcode = '22023', message = 'Deployment identifier is too long.';
  end if;

  select value into v_current
  from public.platform_settings
  where key = 'security';

  if coalesce(v_current ->> 'emergencyMode', 'false')::boolean = p_enabled then
    raise exception using errcode = '22023',
      message = case when p_enabled then 'Emergency Mode is already active.' else 'Emergency Mode is already disabled.' end;
  end if;

  if p_enabled then
    v_next := jsonb_build_object(
      'emergencyMode', true,
      'incidentStartedAt', now(),
      'incidentStartedBy', v_user_id,
      'incidentReason', p_reason,
      'incidentComment', nullif(btrim(coalesce(p_comment, '')), ''),
      'deployment', nullif(left(coalesce(p_deployment, ''), 240), ''),
      'restrictions', jsonb_build_array(
        'registration', 'profile_security', 'admin_mutations', 'enrollments',
        'courses', 'lessons', 'settings', 'media_writes'
      )
    );
  else
    if length(btrim(coalesce(p_comment, ''))) < 10 then
      raise exception using errcode = '22023', message = 'Add an incident resolution comment.';
    end if;
    v_next := jsonb_build_object(
      'emergencyMode', false,
      'incidentStartedAt', null,
      'incidentStartedBy', null,
      'incidentReason', null,
      'incidentComment', null,
      'deployment', null,
      'lastIncident', coalesce(v_current, '{}'::jsonb) || jsonb_build_object(
        'resolvedAt', now(),
        'resolvedBy', v_user_id,
        'resolutionComment', btrim(p_comment)
      )
    );
  end if;

  perform set_config('hunmaster.security_recovery', 'on', true);
  insert into public.platform_settings (key, value, updated_by, updated_at)
  values ('security', v_next, v_user_id, now())
  on conflict (key) do update
    set value = excluded.value,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at;

  insert into public.admin_audit_log (admin_id, action, entity_type, entity_id, metadata)
  values (
    v_user_id,
    case when p_enabled then 'security.incident_started' else 'security.incident_resolved' end,
    'security_incident',
    null,
    jsonb_build_object(
      'reason', p_reason,
      'comment', nullif(btrim(coalesce(p_comment, '')), ''),
      'deployment', nullif(left(coalesce(p_deployment, ''), 240), '')
    )
  );

  return v_next;
end;
$$;

create or replace function public.security_run_audit(
  p_source_secret_findings integer default 0,
  p_client_secret_env_findings integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_overview jsonb;
  v_summary jsonb;
begin
  if v_user_id is null or not private.is_admin(v_user_id) then
    raise exception using errcode = '42501', message = 'Admin access required.';
  end if;
  if p_source_secret_findings not between 0 and 10000
     or p_client_secret_env_findings not between 0 and 10000 then
    raise exception using errcode = '22023', message = 'Invalid audit input.';
  end if;

  v_overview := public.security_get_overview();
  v_summary := jsonb_build_object(
    'completedAt', now(),
    'database', v_overview -> 'database',
    'authentication', v_overview -> 'authentication',
    'sourceSecretFindings', p_source_secret_findings,
    'clientSecretEnvFindings', p_client_secret_env_findings
  );

  perform set_config('hunmaster.security_recovery', 'on', true);
  insert into public.platform_settings (key, value, updated_by, updated_at)
  values ('security.audit', v_summary, v_user_id, now())
  on conflict (key) do update
    set value = excluded.value,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at;

  insert into public.admin_audit_log (admin_id, action, entity_type, entity_id, metadata)
  values (
    v_user_id,
    'security.audit_completed',
    'security_audit',
    null,
    jsonb_build_object(
      'sourceSecretFindings', p_source_secret_findings,
      'clientSecretEnvFindings', p_client_secret_env_findings,
      'unprotectedTableCount', jsonb_array_length(v_overview -> 'database' -> 'unprotectedTables'),
      'anonymousUnrestrictedWrites', v_overview -> 'database' -> 'anonymousUnrestrictedWrites'
    )
  );

  return v_summary;
end;
$$;

create or replace function public.security_revoke_my_session(p_session_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_deleted integer;
begin
  if v_user_id is null or not private.has_elevated_auth(v_user_id) then
    raise exception using errcode = '42501',
      message = 'Recent re-authentication and MFA, when configured, are required.';
  end if;

  insert into public.admin_audit_log (admin_id, action, entity_type, entity_id, metadata)
  values (v_user_id, 'security.session_revoke_requested', 'auth_session', p_session_id, '{}'::jsonb);

  delete from auth.sessions
  where id = p_session_id and user_id = v_user_id;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

create or replace function public.security_revoke_platform_sessions(p_scope text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_current_session uuid := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  v_deleted integer;
begin
  perform private.assert_elevated_owner();
  if not private.is_emergency_mode() then
    raise exception using errcode = '42501',
      message = 'Platform-wide session revocation is only available in Emergency Mode.';
  end if;
  if p_scope not in ('all', 'except_current_owner') then
    raise exception using errcode = '22023', message = 'Invalid session revocation scope.';
  end if;
  if exists (
    select 1 from public.admin_audit_log
    where admin_id = v_user_id
      and action = 'security.platform_sessions_revoked'
      and created_at > now() - interval '2 minutes'
  ) then
    raise exception using errcode = '42900', message = 'Session revocation is temporarily rate limited.';
  end if;

  insert into public.admin_audit_log (admin_id, action, entity_type, entity_id, metadata)
  values (
    v_user_id,
    'security.platform_sessions_revoked',
    'auth_session',
    null,
    jsonb_build_object('scope', p_scope)
  );

  if p_scope = 'except_current_owner' then
    delete from auth.sessions where id <> v_current_session;
  else
    delete from auth.sessions;
  end if;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.security_get_overview() from public, anon;
revoke all on function public.security_get_my_sessions() from public, anon;
revoke all on function public.security_set_emergency_mode(boolean, text, text, text) from public, anon;
revoke all on function public.security_run_audit(integer, integer) from public, anon;
revoke all on function public.security_revoke_my_session(uuid) from public, anon;
revoke all on function public.security_revoke_platform_sessions(text) from public, anon;

grant execute on function public.security_get_overview() to authenticated;
grant execute on function public.security_get_my_sessions() to authenticated;
grant execute on function public.security_set_emergency_mode(boolean, text, text, text) to authenticated;
grant execute on function public.security_run_audit(integer, integer) to authenticated;
grant execute on function public.security_revoke_my_session(uuid) to authenticated;
grant execute on function public.security_revoke_platform_sessions(text) to authenticated;
