-- Re-apply private RLS helper policies after the Courses shared-access migration.
-- The Courses migration has a later historical timestamp than the first hardening migrations,
-- so this final migration preserves the secure policy state for fresh environments.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.current_user_role(user_id uuid default auth.uid())
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

create or replace function private.is_admin(user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select private.current_user_role(user_id) in ('admin'::public.app_role, 'owner'::public.app_role);
$$;

create or replace function private.is_owner(user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select private.current_user_role(user_id) = 'owner'::public.app_role;
$$;

revoke execute on all functions in schema private from public, anon, authenticated;

create or replace function public.prevent_unsafe_profile_changes()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;

  if private.is_admin((select auth.uid())) then
    return new;
  end if;

  if new.role is distinct from old.role
    or new.account_status is distinct from old.account_status
    or new.is_active is distinct from old.is_active then
    raise exception 'Only administrators can change role or access status.';
  end if;

  return new;
end;
$$;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
for select using (id = (select auth.uid()) or private.is_admin((select auth.uid())));

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin" on public.profiles
for update using (id = (select auth.uid()) or private.is_admin((select auth.uid())))
with check (id = (select auth.uid()) or private.is_admin((select auth.uid())));

drop policy if exists "profiles_insert_admin" on public.profiles;
create policy "profiles_insert_admin" on public.profiles
for insert with check (private.is_admin((select auth.uid())));

drop policy if exists "user_roles_select_admin" on public.user_roles;
create policy "user_roles_select_admin" on public.user_roles
for select using (user_id = (select auth.uid()) or private.is_admin((select auth.uid())));

drop policy if exists "user_roles_write_owner" on public.user_roles;
create policy "user_roles_write_owner" on public.user_roles
for all using (private.is_owner((select auth.uid())))
with check (private.is_owner((select auth.uid())));

drop policy if exists "courses_select_available" on public.courses;
create policy "courses_select_available" on public.courses
for select using (
  private.is_admin((select auth.uid()))
  or (
    status = 'published'
    and public.active_enrollment_for_course(courses.id)
  )
);

drop policy if exists "courses_admin_write" on public.courses;
create policy "courses_admin_write" on public.courses
for all using (private.is_admin((select auth.uid())))
with check (private.is_admin((select auth.uid())));

drop policy if exists "course_sections_select_available" on public.course_sections;
create policy "course_sections_select_available" on public.course_sections
for select using (
  private.is_admin((select auth.uid()))
  or exists (
    select 1
    from public.courses c
    where c.id = course_sections.course_id
      and c.status = 'published'
      and public.active_enrollment_for_course(c.id)
  )
);

drop policy if exists "course_sections_admin_write" on public.course_sections;
create policy "course_sections_admin_write" on public.course_sections
for all using (private.is_admin((select auth.uid())))
with check (private.is_admin((select auth.uid())));

drop policy if exists "lessons_select_available" on public.lessons;
create policy "lessons_select_available" on public.lessons
for select using (
  private.is_admin((select auth.uid()))
  or (
    status = 'published'
    and exists (
      select 1
      from public.courses c
      where c.id = lessons.course_id
        and c.status = 'published'
        and public.active_enrollment_for_course(c.id)
    )
  )
);

drop policy if exists "lessons_admin_write" on public.lessons;
create policy "lessons_admin_write" on public.lessons
for all using (private.is_admin((select auth.uid())))
with check (private.is_admin((select auth.uid())));

drop policy if exists "lesson_blocks_select_available" on public.lesson_blocks;
create policy "lesson_blocks_select_available" on public.lesson_blocks
for select using (
  private.is_admin((select auth.uid()))
  or exists (
    select 1
    from public.lessons l
    join public.courses c on c.id = l.course_id
    where l.id = lesson_blocks.lesson_id
      and l.status = 'published'
      and c.status = 'published'
      and public.active_enrollment_for_course(c.id)
  )
);

drop policy if exists "lesson_blocks_admin_write" on public.lesson_blocks;
create policy "lesson_blocks_admin_write" on public.lesson_blocks
for all using (private.is_admin((select auth.uid())))
with check (private.is_admin((select auth.uid())));

drop policy if exists "enrollments_select_own_or_admin" on public.enrollments;
create policy "enrollments_select_own_or_admin" on public.enrollments
for select using (user_id = (select auth.uid()) or private.is_admin((select auth.uid())));

drop policy if exists "enrollments_admin_write" on public.enrollments;
create policy "enrollments_admin_write" on public.enrollments
for all using (private.is_admin((select auth.uid())))
with check (private.is_admin((select auth.uid())));

drop policy if exists "lesson_progress_select_own_or_admin" on public.lesson_progress;
create policy "lesson_progress_select_own_or_admin" on public.lesson_progress
for select using (user_id = (select auth.uid()) or private.is_admin((select auth.uid())));

drop policy if exists "lesson_progress_upsert_own" on public.lesson_progress;
create policy "lesson_progress_upsert_own" on public.lesson_progress
for all using (user_id = (select auth.uid()) or private.is_admin((select auth.uid())))
with check (user_id = (select auth.uid()) or private.is_admin((select auth.uid())));

drop policy if exists "quizzes_select_available" on public.quizzes;
create policy "quizzes_select_available" on public.quizzes
for select using (
  private.is_admin((select auth.uid()))
  or exists (
    select 1
    from public.lessons l
    join public.courses c on c.id = l.course_id
    where l.id = quizzes.lesson_id
      and l.status = 'published'
      and c.status = 'published'
      and public.active_enrollment_for_course(c.id)
  )
);

drop policy if exists "quizzes_admin_write" on public.quizzes;
create policy "quizzes_admin_write" on public.quizzes
for all using (private.is_admin((select auth.uid())))
with check (private.is_admin((select auth.uid())));

drop policy if exists "quiz_questions_select_available" on public.quiz_questions;
create policy "quiz_questions_select_available" on public.quiz_questions
for select using (
  private.is_admin((select auth.uid()))
  or exists (
    select 1
    from public.quizzes q
    join public.lessons l on l.id = q.lesson_id
    join public.courses c on c.id = l.course_id
    where q.id = quiz_questions.quiz_id
      and l.status = 'published'
      and c.status = 'published'
      and public.active_enrollment_for_course(c.id)
  )
);

drop policy if exists "quiz_questions_admin_write" on public.quiz_questions;
create policy "quiz_questions_admin_write" on public.quiz_questions
for all using (private.is_admin((select auth.uid())))
with check (private.is_admin((select auth.uid())));

drop policy if exists "quiz_answers_select_available" on public.quiz_answers;
create policy "quiz_answers_select_available" on public.quiz_answers
for select using (
  private.is_admin((select auth.uid()))
  or exists (
    select 1
    from public.quiz_questions qq
    join public.quizzes q on q.id = qq.quiz_id
    join public.lessons l on l.id = q.lesson_id
    join public.courses c on c.id = l.course_id
    where qq.id = quiz_answers.question_id
      and l.status = 'published'
      and c.status = 'published'
      and public.active_enrollment_for_course(c.id)
  )
);

drop policy if exists "quiz_answers_admin_write" on public.quiz_answers;
create policy "quiz_answers_admin_write" on public.quiz_answers
for all using (private.is_admin((select auth.uid())))
with check (private.is_admin((select auth.uid())));

drop policy if exists "quiz_attempts_own_or_admin" on public.quiz_attempts;
create policy "quiz_attempts_own_or_admin" on public.quiz_attempts
for all using (user_id = (select auth.uid()) or private.is_admin((select auth.uid())))
with check (user_id = (select auth.uid()) or private.is_admin((select auth.uid())));

drop policy if exists "assignments_select_available" on public.assignments;
create policy "assignments_select_available" on public.assignments
for select using (
  private.is_admin((select auth.uid()))
  or (
    status = 'published'
    and exists (
      select 1
      from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = assignments.lesson_id
        and l.status = 'published'
        and c.status = 'published'
        and public.active_enrollment_for_course(c.id)
    )
  )
);

drop policy if exists "assignments_admin_write" on public.assignments;
create policy "assignments_admin_write" on public.assignments
for all using (private.is_admin((select auth.uid())))
with check (private.is_admin((select auth.uid())));

drop policy if exists "assignment_submissions_own_or_admin" on public.assignment_submissions;
create policy "assignment_submissions_own_or_admin" on public.assignment_submissions
for all using (user_id = (select auth.uid()) or private.is_admin((select auth.uid())))
with check (user_id = (select auth.uid()) or private.is_admin((select auth.uid())));

drop policy if exists "announcements_select_available" on public.announcements;
create policy "announcements_select_available" on public.announcements
for select using (
  private.is_admin((select auth.uid()))
  or published_at is not null
);

drop policy if exists "announcements_admin_write" on public.announcements;
create policy "announcements_admin_write" on public.announcements
for all using (private.is_admin((select auth.uid())))
with check (private.is_admin((select auth.uid())));

drop policy if exists "admin_audit_select_admin" on public.admin_audit_log;
create policy "admin_audit_select_admin" on public.admin_audit_log
for select using (private.is_admin((select auth.uid())));

drop policy if exists "admin_audit_insert_admin" on public.admin_audit_log;
create policy "admin_audit_insert_admin" on public.admin_audit_log
for insert with check (private.is_admin((select auth.uid())));

drop policy if exists "platform_settings_admin_all" on public.platform_settings;
create policy "platform_settings_admin_all" on public.platform_settings
for all using (private.is_admin((select auth.uid())))
with check (private.is_admin((select auth.uid())));

drop policy if exists "authenticated_read_private_course_media" on storage.objects;
create policy "authenticated_read_private_course_media" on storage.objects
for select using (
  private.is_admin((select auth.uid()))
  or (
    bucket_id = 'lesson-media'
    and exists (
      select 1 from public.enrollments e
      where e.course_id::text = (storage.foldername(name))[1]
        and e.user_id = (select auth.uid())
        and e.status in ('active', 'completed')
        and (e.expires_at is null or e.expires_at > now())
    )
  )
  or (
    bucket_id = 'assignments'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "admins_manage_all_media" on storage.objects;
create policy "admins_manage_all_media" on storage.objects
for all using (private.is_admin((select auth.uid())))
with check (private.is_admin((select auth.uid())));

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
