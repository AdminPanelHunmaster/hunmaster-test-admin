alter table public.profiles
drop constraint if exists profiles_username_format_check;

alter table public.profiles
add constraint profiles_username_format_check
check (
  username is null
  or (
    username = lower(username)
    and username ~ '^[a-z0-9_]{3,30}$'
  )
);

create unique index if not exists profiles_username_lower_unique
on public.profiles (lower(username))
where username is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata_username text := lower(nullif(trim(new.raw_user_meta_data ->> 'username'), ''));
begin
  if metadata_username is not null and metadata_username !~ '^[a-z0-9_]{3,30}$' then
    raise exception 'Invalid username.';
  end if;

  insert into public.profiles (id, email, username, full_name, role, account_status, is_active)
  values (
    new.id,
    coalesce(new.email, ''),
    metadata_username,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    'student',
    'pending',
    true
  )
  on conflict (id) do update
  set
    email = excluded.email,
    username = coalesce(public.profiles.username, excluded.username),
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    updated_at = now();

  insert into public.user_roles (user_id, role)
  values (new.id, 'student')
  on conflict (user_id) do nothing;

  return new;
end;
$$;
