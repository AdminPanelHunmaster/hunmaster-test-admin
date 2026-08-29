create or replace function private.can_access_lesson(
  _lesson_id uuid,
  _user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.lessons l
    join public.courses c on c.id = l.course_id
    join public.enrollments e on e.course_id = c.id
    where l.id = _lesson_id
      and l.status = 'published'
      and c.status = 'published'
      and e.user_id = _user_id
      and e.status = 'active'
      and (e.expires_at is null or e.expires_at > now())
  );
$$;

revoke execute on function private.can_access_lesson(uuid, uuid) from public, anon, authenticated;
grant execute on function private.can_access_lesson(uuid, uuid) to authenticated;

drop policy if exists "lesson_progress_select_own_or_admin" on public.lesson_progress;
drop policy if exists "lesson_progress_upsert_own" on public.lesson_progress;
drop policy if exists "lesson_progress_insert_own_active_lesson" on public.lesson_progress;
drop policy if exists "lesson_progress_update_own_active_lesson" on public.lesson_progress;
drop policy if exists "lesson_progress_delete_admin" on public.lesson_progress;

create policy "lesson_progress_select_own_or_admin" on public.lesson_progress
for select using (user_id = (select auth.uid()) or private.is_admin((select auth.uid())));

create policy "lesson_progress_insert_own_active_lesson" on public.lesson_progress
for insert with check (
  private.is_admin((select auth.uid()))
  or (
    user_id = (select auth.uid())
    and private.can_access_lesson(lesson_id, (select auth.uid()))
  )
);

create policy "lesson_progress_update_own_active_lesson" on public.lesson_progress
for update
using (
  private.is_admin((select auth.uid()))
  or user_id = (select auth.uid())
)
with check (
  private.is_admin((select auth.uid()))
  or (
    user_id = (select auth.uid())
    and private.can_access_lesson(lesson_id, (select auth.uid()))
  )
);

create policy "lesson_progress_delete_admin" on public.lesson_progress
for delete using (private.is_admin((select auth.uid())));

drop policy if exists "authenticated_read_private_course_media" on storage.objects;
create policy "authenticated_read_private_course_media" on storage.objects
for select using (
  private.is_admin((select auth.uid()))
  or (
    bucket_id = 'lesson-media'
    and exists (
      select 1
      from public.enrollments e
      where e.course_id::text = (storage.foldername(objects.name))[1]
        and e.user_id = (select auth.uid())
        and e.status = 'active'
        and (e.expires_at is null or e.expires_at > now())
    )
  )
  or (
    bucket_id = 'assignments'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  )
);
