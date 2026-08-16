create extension if not exists "pgcrypto";

do $$ begin
  create type public.app_role as enum ('student', 'moderator', 'teacher', 'admin', 'owner');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.account_status as enum ('pending', 'active', 'blocked');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.course_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.difficulty_level as enum ('beginner', 'elementary', 'intermediate', 'advanced');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.lesson_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.lesson_block_type as enum ('text', 'heading', 'image', 'video', 'audio', 'vocabulary', 'exercise', 'quiz');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.enrollment_status as enum ('active', 'completed', 'revoked', 'expired');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.assignment_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.submission_status as enum ('submitted', 'reviewed', 'returned');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  username text unique,
  full_name text,
  telegram text,
  avatar_url text,
  role public.app_role not null default 'student',
  account_status public.account_status not null default 'pending',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create table if not exists public.user_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role public.app_role not null default 'student',
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  cover_url text,
  status public.course_status not null default 'draft',
  price numeric(12, 2) not null default 0 check (price >= 0),
  currency text not null default 'EUR',
  difficulty public.difficulty_level not null default 'beginner',
  position integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_sections (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, position)
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  section_id uuid references public.course_sections(id) on delete set null,
  title text not null,
  slug text not null,
  description text,
  content jsonb not null default '{}'::jsonb,
  video_url text,
  position integer not null default 0,
  status public.lesson_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, slug)
);

create table if not exists public.lesson_blocks (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  type public.lesson_block_type not null,
  content jsonb not null default '{}'::jsonb,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lesson_id, position)
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status public.enrollment_status not null default 'active',
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  progress integer not null default 0 check (progress between 0 and 100),
  completed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  title text not null,
  description text,
  passing_score integer not null default 70 check (passing_score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  prompt text not null,
  type text not null default 'single_choice',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  body text not null,
  is_correct boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  score integer not null default 0 check (score between 0 and 100),
  answers jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  title text not null,
  instructions text not null,
  status public.assignment_status not null default 'draft',
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text,
  file_url text,
  status public.submission_status not null default 'submitted',
  grade integer check (grade between 0 and 100),
  feedback text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (assignment_id, user_id)
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  course_id uuid references public.courses(id) on delete cascade,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_account_status on public.profiles(account_status);
create index if not exists idx_profiles_last_seen_at on public.profiles(last_seen_at);
create index if not exists idx_courses_status on public.courses(status);
create index if not exists idx_course_sections_course_id on public.course_sections(course_id);
create index if not exists idx_lessons_course_id on public.lessons(course_id);
create index if not exists idx_lessons_section_id on public.lessons(section_id);
create index if not exists idx_lesson_blocks_lesson_id on public.lesson_blocks(lesson_id);
create index if not exists idx_enrollments_user_id on public.enrollments(user_id);
create index if not exists idx_enrollments_course_id on public.enrollments(course_id);
create index if not exists idx_enrollments_status on public.enrollments(status);
create index if not exists idx_lesson_progress_user_id on public.lesson_progress(user_id);
create index if not exists idx_lesson_progress_lesson_id on public.lesson_progress(lesson_id);
create index if not exists idx_admin_audit_log_created_at on public.admin_audit_log(created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
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
  select coalesce((select role from public.profiles where id = user_id), 'student'::public.app_role);
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

create or replace function public.prevent_unsafe_profile_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if public.is_admin(auth.uid()) then
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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'student')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create or replace function public.sync_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role, granted_by)
  values (new.id, new.role, auth.uid())
  on conflict (user_id) do update
    set role = excluded.role,
        granted_by = excluded.granted_by;
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_courses_updated_at on public.courses;
create trigger set_courses_updated_at before update on public.courses
for each row execute function public.set_updated_at();

drop trigger if exists set_course_sections_updated_at on public.course_sections;
create trigger set_course_sections_updated_at before update on public.course_sections
for each row execute function public.set_updated_at();

drop trigger if exists set_lessons_updated_at on public.lessons;
create trigger set_lessons_updated_at before update on public.lessons
for each row execute function public.set_updated_at();

drop trigger if exists set_lesson_blocks_updated_at on public.lesson_blocks;
create trigger set_lesson_blocks_updated_at before update on public.lesson_blocks
for each row execute function public.set_updated_at();

drop trigger if exists set_enrollments_updated_at on public.enrollments;
create trigger set_enrollments_updated_at before update on public.enrollments
for each row execute function public.set_updated_at();

drop trigger if exists set_profile_security on public.profiles;
create trigger set_profile_security before update on public.profiles
for each row execute function public.prevent_unsafe_profile_changes();

drop trigger if exists sync_profile_role on public.profiles;
create trigger sync_profile_role after insert or update of role on public.profiles
for each row execute function public.sync_user_role();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.courses enable row level security;
alter table public.course_sections enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_blocks enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_answers enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.announcements enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.platform_settings enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
for select using (id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin" on public.profiles
for update using (id = auth.uid() or public.is_admin(auth.uid()))
with check (id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "profiles_insert_admin" on public.profiles;
create policy "profiles_insert_admin" on public.profiles
for insert with check (public.is_admin(auth.uid()));

drop policy if exists "user_roles_select_admin" on public.user_roles;
create policy "user_roles_select_admin" on public.user_roles
for select using (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "user_roles_write_owner" on public.user_roles;
create policy "user_roles_write_owner" on public.user_roles
for all using (public.is_owner(auth.uid()))
with check (public.is_owner(auth.uid()));

drop policy if exists "courses_select_available" on public.courses;
create policy "courses_select_available" on public.courses
for select using (
  status = 'published'
  or public.is_admin(auth.uid())
  or exists (
    select 1 from public.enrollments e
    where e.course_id = courses.id
      and e.user_id = auth.uid()
      and e.status in ('active', 'completed')
      and (e.expires_at is null or e.expires_at > now())
  )
);

drop policy if exists "courses_admin_write" on public.courses;
create policy "courses_admin_write" on public.courses
for all using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "course_sections_select_available" on public.course_sections;
create policy "course_sections_select_available" on public.course_sections
for select using (
  public.is_admin(auth.uid())
  or exists (
    select 1 from public.courses c
    where c.id = course_sections.course_id
      and c.status = 'published'
  )
  or exists (
    select 1 from public.enrollments e
    where e.course_id = course_sections.course_id
      and e.user_id = auth.uid()
      and e.status in ('active', 'completed')
      and (e.expires_at is null or e.expires_at > now())
  )
);

drop policy if exists "course_sections_admin_write" on public.course_sections;
create policy "course_sections_admin_write" on public.course_sections
for all using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "lessons_select_available" on public.lessons;
create policy "lessons_select_available" on public.lessons
for select using (
  public.is_admin(auth.uid())
  or (
    status = 'published'
    and exists (select 1 from public.courses c where c.id = lessons.course_id and c.status = 'published')
  )
  or exists (
    select 1 from public.enrollments e
    where e.course_id = lessons.course_id
      and e.user_id = auth.uid()
      and e.status in ('active', 'completed')
      and (e.expires_at is null or e.expires_at > now())
  )
);

drop policy if exists "lessons_admin_write" on public.lessons;
create policy "lessons_admin_write" on public.lessons
for all using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

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
  )
);

drop policy if exists "lesson_blocks_admin_write" on public.lesson_blocks;
create policy "lesson_blocks_admin_write" on public.lesson_blocks
for all using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "enrollments_select_own_or_admin" on public.enrollments;
create policy "enrollments_select_own_or_admin" on public.enrollments
for select using (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "enrollments_admin_write" on public.enrollments;
create policy "enrollments_admin_write" on public.enrollments
for all using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "lesson_progress_select_own_or_admin" on public.lesson_progress;
create policy "lesson_progress_select_own_or_admin" on public.lesson_progress
for select using (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "lesson_progress_upsert_own" on public.lesson_progress;
create policy "lesson_progress_upsert_own" on public.lesson_progress
for all using (user_id = auth.uid() or public.is_admin(auth.uid()))
with check (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "quizzes_select_available" on public.quizzes;
create policy "quizzes_select_available" on public.quizzes
for select using (
  public.is_admin(auth.uid())
  or exists (select 1 from public.lessons l where l.id = quizzes.lesson_id and l.status = 'published')
);

drop policy if exists "quizzes_admin_write" on public.quizzes;
create policy "quizzes_admin_write" on public.quizzes
for all using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "quiz_questions_select_available" on public.quiz_questions;
create policy "quiz_questions_select_available" on public.quiz_questions
for select using (
  public.is_admin(auth.uid())
  or exists (
    select 1 from public.quizzes q
    join public.lessons l on l.id = q.lesson_id
    where q.id = quiz_questions.quiz_id and l.status = 'published'
  )
);

drop policy if exists "quiz_questions_admin_write" on public.quiz_questions;
create policy "quiz_questions_admin_write" on public.quiz_questions
for all using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "quiz_answers_select_available" on public.quiz_answers;
create policy "quiz_answers_select_available" on public.quiz_answers
for select using (
  public.is_admin(auth.uid())
  or exists (
    select 1 from public.quiz_questions qq
    join public.quizzes q on q.id = qq.quiz_id
    join public.lessons l on l.id = q.lesson_id
    where qq.id = quiz_answers.question_id and l.status = 'published'
  )
);

drop policy if exists "quiz_answers_admin_write" on public.quiz_answers;
create policy "quiz_answers_admin_write" on public.quiz_answers
for all using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "quiz_attempts_own_or_admin" on public.quiz_attempts;
create policy "quiz_attempts_own_or_admin" on public.quiz_attempts
for all using (user_id = auth.uid() or public.is_admin(auth.uid()))
with check (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "assignments_select_available" on public.assignments;
create policy "assignments_select_available" on public.assignments
for select using (
  public.is_admin(auth.uid())
  or exists (select 1 from public.lessons l where l.id = assignments.lesson_id and l.status = 'published')
);

drop policy if exists "assignments_admin_write" on public.assignments;
create policy "assignments_admin_write" on public.assignments
for all using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "assignment_submissions_own_or_admin" on public.assignment_submissions;
create policy "assignment_submissions_own_or_admin" on public.assignment_submissions
for all using (user_id = auth.uid() or public.is_admin(auth.uid()))
with check (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "announcements_select_available" on public.announcements;
create policy "announcements_select_available" on public.announcements
for select using (
  public.is_admin(auth.uid())
  or published_at is not null
);

drop policy if exists "announcements_admin_write" on public.announcements;
create policy "announcements_admin_write" on public.announcements
for all using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "admin_audit_select_admin" on public.admin_audit_log;
create policy "admin_audit_select_admin" on public.admin_audit_log
for select using (public.is_admin(auth.uid()));

drop policy if exists "admin_audit_insert_admin" on public.admin_audit_log;
create policy "admin_audit_insert_admin" on public.admin_audit_log
for insert with check (public.is_admin(auth.uid()));

drop policy if exists "platform_settings_admin_all" on public.platform_settings;
create policy "platform_settings_admin_all" on public.platform_settings
for all using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('course-covers', 'course-covers', true),
  ('lesson-media', 'lesson-media', false),
  ('assignments', 'assignments', false)
on conflict (id) do nothing;

drop policy if exists "public_read_public_media" on storage.objects;
create policy "public_read_public_media" on storage.objects
for select using (bucket_id in ('avatars', 'course-covers'));

drop policy if exists "authenticated_read_private_course_media" on storage.objects;
create policy "authenticated_read_private_course_media" on storage.objects
for select using (
  public.is_admin(auth.uid())
  or (
    bucket_id = 'lesson-media'
    and exists (
      select 1 from public.enrollments e
      where e.course_id::text = (storage.foldername(name))[1]
        and e.user_id = auth.uid()
        and e.status in ('active', 'completed')
        and (e.expires_at is null or e.expires_at > now())
    )
  )
  or (
    bucket_id = 'assignments'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "users_manage_own_avatar" on storage.objects;
create policy "users_manage_own_avatar" on storage.objects
for all using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
) with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "admins_manage_all_media" on storage.objects;
create policy "admins_manage_all_media" on storage.objects
for all using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

insert into public.platform_settings (key, value)
values (
  'general',
  '{"projectName":"HunMaster","telegramUrl":"","facebookUrl":"","supportEmail":""}'::jsonb
)
on conflict (key) do nothing;
