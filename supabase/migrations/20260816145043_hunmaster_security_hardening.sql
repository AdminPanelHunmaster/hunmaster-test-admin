create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_user_role(user_id uuid default auth.uid())
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.role
      from public.profiles p
      where p.id = case
        when (select auth.uid()) is null then null
        when user_id = (select auth.uid()) then user_id
        when exists (
          select 1
          from public.profiles caller
          where caller.id = (select auth.uid())
            and caller.role in ('admin'::public.app_role, 'owner'::public.app_role)
        ) then user_id
        else (select auth.uid())
      end
    ),
    'student'::public.app_role
  );
$$;

create or replace function public.is_admin(user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role(user_id) in ('admin'::public.app_role, 'owner'::public.app_role);
$$;

create or replace function public.is_owner(user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role(user_id) = 'owner'::public.app_role;
$$;

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.current_user_role(uuid) from public, anon, authenticated;
revoke execute on function public.is_admin(uuid) from public, anon, authenticated;
revoke execute on function public.is_owner(uuid) from public, anon, authenticated;
revoke execute on function public.prevent_unsafe_profile_changes() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.sync_user_role() from public, anon, authenticated;

grant execute on function public.username_available(text) to anon, authenticated;
grant execute on function public.active_enrollment_for_course(uuid) to authenticated;
