-- HunMaster Courses uses the same Supabase/PostgreSQL backend as HunMaster Admin.
-- This migration is additive/tightening only: it does not create a separate course schema.

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists last_seen_at timestamptz;

create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username))
  where username is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_username_format_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_username_format_check
      check (username is null or username ~ '^[a-z0-9_]{3,30}$')
      not valid;
  end if;
end $$;

create or replace function public.username_available(_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    _username ~ '^[a-z0-9_]{3,30}$'
    and not exists (
      select 1
      from public.profiles p
      where lower(p.username) = lower(_username)
    );
$$;

grant execute on function public.username_available(text) to anon, authenticated;

create or replace function public.active_enrollment_for_course(_course_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.enrollments e
    where e.course_id = _course_id
      and e.user_id = auth.uid()
      and e.status = 'active'
      and (e.expires_at is null or e.expires_at > now())
  );
$$;

grant execute on function public.active_enrollment_for_course(uuid) to authenticated;

drop policy if exists "courses_select_available" on public.courses;
create policy "courses_select_available" on public.courses
for select using (
  public.is_admin(auth.uid())
  or (
    status = 'published'
    and public.active_enrollment_for_course(courses.id)
  )
);

drop policy if exists "course_sections_select_available" on public.course_sections;
create policy "course_sections_select_available" on public.course_sections
for select using (
  public.is_admin(auth.uid())
  or exists (
    select 1
    from public.courses c
    where c.id = course_sections.course_id
      and c.status = 'published'
      and public.active_enrollment_for_course(c.id)
  )
);

drop policy if exists "lessons_select_available" on public.lessons;
create policy "lessons_select_available" on public.lessons
for select using (
  public.is_admin(auth.uid())
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

drop policy if exists "lesson_blocks_select_available" on public.lesson_blocks;
create policy "lesson_blocks_select_available" on public.lesson_blocks
for select using (
  public.is_admin(auth.uid())
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

drop policy if exists "quizzes_select_available" on public.quizzes;
create policy "quizzes_select_available" on public.quizzes
for select using (
  public.is_admin(auth.uid())
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

drop policy if exists "quiz_questions_select_available" on public.quiz_questions;
create policy "quiz_questions_select_available" on public.quiz_questions
for select using (
  public.is_admin(auth.uid())
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

drop policy if exists "quiz_answers_select_available" on public.quiz_answers;
create policy "quiz_answers_select_available" on public.quiz_answers
for select using (
  public.is_admin(auth.uid())
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

drop policy if exists "assignments_select_available" on public.assignments;
create policy "assignments_select_available" on public.assignments
for select using (
  public.is_admin(auth.uid())
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
