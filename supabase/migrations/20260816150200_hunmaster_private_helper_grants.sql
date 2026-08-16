grant usage on schema private to anon, authenticated;
grant execute on function private.current_user_role(uuid) to anon, authenticated;
grant execute on function private.is_admin(uuid) to anon, authenticated;
grant execute on function private.is_owner(uuid) to anon, authenticated;

revoke execute on function public.current_user_role(uuid) from public, anon, authenticated;
revoke execute on function public.is_admin(uuid) from public, anon, authenticated;
revoke execute on function public.is_owner(uuid) from public, anon, authenticated;
revoke execute on function public.prevent_unsafe_profile_changes() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.sync_user_role() from public, anon, authenticated;
