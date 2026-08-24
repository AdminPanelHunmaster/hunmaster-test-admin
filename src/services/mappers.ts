import type { AdminUser, UserStatus } from "@/lib/data";
import type { CourseRow, Enrollment, Profile } from "@/lib/supabase/database.types";
import type { Course } from "@/components/admin/CourseCard";

export type EnrollmentWithCourse = Enrollment & {
  courses: Pick<CourseRow, "id" | "title"> | null;
};

export type ProfileWithEnrollment = Profile & {
  enrollments: EnrollmentWithCourse[];
};

export type CourseWithCounts = CourseRow & {
  course_sections: { count: number }[];
  lessons: { count: number }[];
  enrollments: { count: number }[];
};

export function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("ru-RU").format(new Date(value));
}

export function resolveUserStatus(profile: Profile, enrollment?: Enrollment | null): UserStatus {
  if (!profile.is_active || profile.account_status === "blocked") return "blocked";
  if (profile.role === "admin" || profile.role === "owner") return "active";
  if (profile.account_status === "pending") return "pending";
  if (!enrollment) return "pending";
  if (enrollment.status === "revoked" || enrollment.status === "expired") return "expired";
  if (enrollment.expires_at && new Date(enrollment.expires_at).getTime() < Date.now())
    return "expired";
  return "active";
}

export function toAdminUser(profile: ProfileWithEnrollment, progress = 0): AdminUser {
  const enrollment =
    profile.enrollments.find((item) => item.status === "active") ?? profile.enrollments[0];
  return {
    id: profile.id,
    name: profile.full_name ?? profile.username ?? profile.email,
    username: profile.username ?? "—",
    email: profile.email,
    telegram: profile.telegram ?? "",
    role: profile.role,
    accountStatus: profile.account_status,
    course: enrollment?.courses?.title ?? "—",
    status: resolveUserStatus(profile, enrollment),
    registeredAt: formatDate(profile.created_at),
    accessUntil: formatDate(enrollment?.expires_at) || null,
    accessFrom: formatDate(enrollment?.granted_at) || null,
    lastLogin: formatDate(profile.last_seen_at),
    progress,
  };
}

export function toCourseCard(course: CourseWithCounts): Course {
  return {
    id: course.id,
    title: course.title,
    subtitle: course.description ?? "—",
    published: course.status === "published",
    modules: course.course_sections[0]?.count ?? 0,
    lessons: course.lessons[0]?.count ?? 0,
    students: course.enrollments[0]?.count ?? 0,
  };
}
