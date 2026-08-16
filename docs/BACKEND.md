# HunMaster Backend

HunMaster Admin now uses Supabase Auth, PostgreSQL tables, Row Level Security, Storage buckets, and a typed TypeScript service layer.

## Architecture

- Frontend: React, TanStack Router, TanStack Query, TypeScript.
- Backend: Supabase Auth plus PostgreSQL.
- Data access: `src/services/adminBackend.ts`.
- Auth/session: `src/hooks/useAuth.tsx`, `src/services/auth.ts`.
- Supabase client and types: `src/lib/supabase`.
- Database migrations: `supabase/migrations`.

The frontend uses the public Supabase anon key only. Never expose `SUPABASE_SERVICE_ROLE_KEY` in Vite, Vercel client env, or browser code.

## Tables

The migration creates `profiles`, `user_roles`, `courses`, `course_sections`, `lessons`, `lesson_blocks`, `enrollments`, `lesson_progress`, quizzes, assignments, `announcements`, `admin_audit_log`, and `platform_settings`.

Storage buckets: `avatars`, `course-covers`, `lesson-media`, and `assignments`.

## Environment

Create `.env.local` for local development:

```sh
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Use the same variable names in Vercel. Do not add service-role secrets to frontend env.

## Apply Migrations

With Supabase CLI:

```sh
supabase link --project-ref your-project-ref
supabase db push
```

Or run `supabase/migrations/20260816103000_hunmaster_admin_backend.sql` in Supabase SQL Editor.

## First Owner

1. Create the first account through Supabase Auth.
2. In Supabase SQL Editor, promote that user once:

```sql
update public.profiles
set role = 'owner', account_status = 'active', is_active = true
where email = 'owner@example.com';
```

## RLS

RLS is enabled on all private tables.

- Users can read their own profile, enrollments, progress, quiz attempts, and assignment submissions.
- Students cannot change their own `role`, `account_status`, or `is_active`.
- Admin and owner roles are checked in PostgreSQL by `public.is_admin()` and `public.current_user_role()`.
- Admins can manage courses, sections, lessons, blocks, enrollments, announcements, settings, and audit log entries.
- Private storage media is restricted to admins, enrolled users for `lesson-media`, and owner folders for assignment uploads.

## Admin Integration

The admin UI now uses real Supabase services for dashboard counts, users, access management, courses, course structure, analytics, and settings. If Supabase env is missing, the app shows a setup state instead of fake data.

## Local Development

```sh
npm run dev
npm run lint
npm run build
```

This repository currently does not define a test runner script.

## Deployment

1. Apply database migration to the target Supabase project.
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel.
3. Create or promote the first owner.
4. Deploy the existing Vercel/Lovable frontend.
