-- Keep the privileged write bypass scoped to the single protected UPSERT.
-- set_config(..., true) is transaction-local, so it must be explicitly reset
-- before the owner RPC returns to its caller.

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
  perform set_config('hunmaster.security_recovery', 'off', true);

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
exception
  when others then
    perform set_config('hunmaster.security_recovery', 'off', true);
    raise;
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
  perform set_config('hunmaster.security_recovery', 'off', true);

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
exception
  when others then
    perform set_config('hunmaster.security_recovery', 'off', true);
    raise;
end;
$$;
