import { supabase } from "@/lib/supabase/client";
import type {
  AccountStatus,
  AuditLog,
  CourseStatus,
  Enrollment,
  Json,
  PlatformSetting,
  Profile,
} from "@/lib/supabase/database.types";
import { toAdminBackendError } from "./errors";
import {
  type CourseWithCounts,
  type ProfileWithEnrollment,
  toAdminUser,
  toCourseCard,
} from "./mappers";
import type { AdminUser, SeriesPoint } from "@/lib/data";
import type { Course } from "@/components/admin/CourseCard";

export type DashboardMetrics = {
  usersTotal: number;
  activeAccess: number;
  pendingUsers: number;
  expiredAccess: number;
  blockedUsers: number;
  coursesTotal: number;
  publishedCourses: number;
  enrollmentsTotal: number;
  completedLessons: number;
  newUsersSeries: Record<"7" | "30" | "90", SeriesPoint[]>;
  activeStudentsSeries: SeriesPoint[];
  recentActivity: AuditLog[];
};

export type AnalyticsMetrics = {
  students: number;
  averageProgress: number;
  completedLessons: number;
  weekdayActivity: SeriesPoint[];
  retentionSeries: SeriesPoint[];
  popularLessons: { title: string; views: number }[];
};

export type CourseStructure = {
  course: Course | null;
  sections: {
    id: string;
    title: string;
    lessons: { id: string; title: string; duration: string; published: boolean }[];
  }[];
};

async function countProfilesByStatus(status: AccountStatus): Promise<number> {
  const { count, error } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("account_status", status);

  if (error) throw toAdminBackendError(error, "Не удалось посчитать пользователей.");
  return count ?? 0;
}

async function countTable(
  table: "profiles" | "courses" | "enrollments" | "lesson_progress",
): Promise<number> {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
  if (error) throw toAdminBackendError(error, "Не удалось загрузить метрики.");
  return count ?? 0;
}

async function countCoursesByStatus(status: CourseStatus): Promise<number> {
  const { count, error } = await supabase
    .from("courses")
    .select("*", { count: "exact", head: true })
    .eq("status", status);

  if (error) throw toAdminBackendError(error, "Не удалось посчитать курсы.");
  return count ?? 0;
}

async function countActiveEnrollments(): Promise<number> {
  const { count, error } = await supabase
    .from("enrollments")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  if (error) throw toAdminBackendError(error, "Не удалось посчитать доступы.");
  return count ?? 0;
}

async function countExpiredEnrollments(): Promise<number> {
  const { count, error } = await supabase
    .from("enrollments")
    .select("*", { count: "exact", head: true })
    .or(`status.in.(expired,revoked),expires_at.lt.${new Date().toISOString()}`);

  if (error) throw toAdminBackendError(error, "Не удалось посчитать истекшие доступы.");
  return count ?? 0;
}

async function countCompletedLessons(): Promise<number> {
  const { count, error } = await supabase
    .from("lesson_progress")
    .select("*", { count: "exact", head: true })
    .eq("completed", true);

  if (error) throw toAdminBackendError(error, "Не удалось посчитать прогресс.");
  return count ?? 0;
}

async function registrationsFor(days: 7 | 30 | 90): Promise<SeriesPoint[]> {
  const since = new Date(Date.now() - (days - 1) * 86_400_000);
  since.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("profiles")
    .select("created_at")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  if (error) throw toAdminBackendError(error, "Не удалось загрузить регистрацию пользователей.");

  const buckets = new Map<string, number>();
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(Date.now() - index * 86_400_000);
    const key = date.toISOString().slice(0, 10);
    buckets.set(key, 0);
  }

  for (const row of data ?? []) {
    const key = row.created_at.slice(0, 10);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return Array.from(buckets.entries()).map(([label, value]) => ({
    label: label.slice(5),
    value,
  }));
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const [
    usersTotal,
    activeAccess,
    pendingUsers,
    expiredAccess,
    blockedUsers,
    coursesTotal,
    publishedCourses,
    enrollmentsTotal,
    completedLessons,
    seven,
    thirty,
    ninety,
    activeStudentsSeries,
    recentActivity,
  ] = await Promise.all([
    countTable("profiles"),
    countActiveEnrollments(),
    countProfilesByStatus("pending"),
    countExpiredEnrollments(),
    countProfilesByStatus("blocked"),
    countTable("courses"),
    countCoursesByStatus("published"),
    countTable("enrollments"),
    countCompletedLessons(),
    registrationsFor(7),
    registrationsFor(30),
    registrationsFor(90),
    activeStudentsByMonth(),
    getRecentActivity(),
  ]);

  return {
    usersTotal,
    activeAccess,
    pendingUsers,
    expiredAccess,
    blockedUsers,
    coursesTotal,
    publishedCourses,
    enrollmentsTotal,
    completedLessons,
    newUsersSeries: { "7": seven, "30": thirty, "90": ninety },
    activeStudentsSeries,
    recentActivity,
  };
}

export async function listUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*, enrollments(*, courses(id,title))")
    .order("created_at", { ascending: false });

  if (error) throw toAdminBackendError(error, "Не удалось загрузить пользователей.");
  return ((data ?? []) as ProfileWithEnrollment[]).map(toAdminUser);
}

export async function listRawProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw toAdminBackendError(error, "Не удалось загрузить профили.");
  return data ?? [];
}

export async function updateUserAccessStatus(
  userId: string,
  status: AdminUser["status"],
): Promise<void> {
  if (status === "blocked") {
    await updateProfile(userId, { account_status: "blocked", is_active: false });
    await writeAuditLog("user.blocked", "profile", userId);
    return;
  }

  if (status === "pending") {
    await updateProfile(userId, { account_status: "pending", is_active: true });
    await writeAuditLog("user.marked_pending", "profile", userId);
    return;
  }

  if (status === "expired") {
    const { error } = await supabase
      .from("enrollments")
      .update({ status: "expired" })
      .eq("user_id", userId)
      .eq("status", "active");
    if (error) throw toAdminBackendError(error, "Не удалось отключить доступ.");
    await writeAuditLog("enrollment.expired", "profile", userId);
    return;
  }

  await updateProfile(userId, { account_status: "active", is_active: true });
  await writeAuditLog("user.activated", "profile", userId);
}

async function updateProfile(
  userId: string,
  values: Partial<Pick<Profile, "account_status" | "is_active" | "role">>,
): Promise<void> {
  const { error } = await supabase.from("profiles").update(values).eq("id", userId);
  if (error) throw toAdminBackendError(error, "Не удалось обновить профиль.");
}

export async function grantCourseAccess(
  userId: string,
  courseId: string,
  days: number | null,
): Promise<Enrollment> {
  const { data: currentUser, error: userError } = await supabase.auth.getUser();
  if (userError) throw toAdminBackendError(userError, "Не удалось определить администратора.");

  const expiresAt = days === null ? null : new Date(Date.now() + days * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("enrollments")
    .upsert(
      {
        user_id: userId,
        course_id: courseId,
        status: "active",
        granted_by: currentUser.user?.id ?? null,
        granted_at: new Date().toISOString(),
        expires_at: expiresAt,
      },
      { onConflict: "user_id,course_id" },
    )
    .select("*")
    .single();

  if (error) throw toAdminBackendError(error, "Не удалось назначить курс.");
  await updateProfile(userId, { account_status: "active", is_active: true });
  await writeAuditLog("enrollment.granted", "enrollment", data.id, { userId, courseId, expiresAt });
  return data;
}

export async function revokeUserAccess(userId: string): Promise<void> {
  const { error } = await supabase
    .from("enrollments")
    .update({ status: "revoked" })
    .eq("user_id", userId)
    .eq("status", "active");

  if (error) throw toAdminBackendError(error, "Не удалось отозвать доступ.");
  await writeAuditLog("enrollment.revoked", "profile", userId);
}

export async function listCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("*, course_sections(count), lessons(count), enrollments(count)")
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw toAdminBackendError(error, "Не удалось загрузить курсы.");
  return ((data ?? []) as CourseWithCounts[]).map(toCourseCard);
}

export async function setCoursePublished(courseId: string, published: boolean): Promise<void> {
  const { error } = await supabase
    .from("courses")
    .update({ status: published ? "published" : "draft" })
    .eq("id", courseId);

  if (error) throw toAdminBackendError(error, "Не удалось изменить статус курса.");
  await writeAuditLog(published ? "course.published" : "course.unpublished", "course", courseId);
}

export async function getCourseStructure(courseId: string): Promise<CourseStructure> {
  const [coursesResult, sectionsResult, lessonsResult] = await Promise.all([
    supabase
      .from("courses")
      .select("*, course_sections(count), lessons(count), enrollments(count)")
      .eq("id", courseId)
      .maybeSingle(),
    supabase
      .from("course_sections")
      .select("*")
      .eq("course_id", courseId)
      .order("position", { ascending: true }),
    supabase
      .from("lessons")
      .select("*")
      .eq("course_id", courseId)
      .order("position", { ascending: true }),
  ]);

  if (coursesResult.error)
    throw toAdminBackendError(coursesResult.error, "Не удалось загрузить курс.");
  if (sectionsResult.error)
    throw toAdminBackendError(sectionsResult.error, "Не удалось загрузить модули.");
  if (lessonsResult.error)
    throw toAdminBackendError(lessonsResult.error, "Не удалось загрузить уроки.");

  const lessons = lessonsResult.data ?? [];
  return {
    course: coursesResult.data ? toCourseCard(coursesResult.data as CourseWithCounts) : null,
    sections: (sectionsResult.data ?? []).map((section) => ({
      id: section.id,
      title: section.title,
      lessons: lessons
        .filter((lesson) => lesson.section_id === section.id)
        .map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          duration: "—",
          published: lesson.status === "published",
        })),
    })),
  };
}

export async function getSettings(): Promise<PlatformSetting[]> {
  const { data, error } = await supabase.from("platform_settings").select("*").order("key");
  if (error) throw toAdminBackendError(error, "Не удалось загрузить настройки.");
  return data ?? [];
}

export async function saveSetting(key: string, value: Json): Promise<void> {
  const { data: currentUser, error: userError } = await supabase.auth.getUser();
  if (userError) throw toAdminBackendError(userError, "Не удалось определить администратора.");

  const { error } = await supabase
    .from("platform_settings")
    .upsert({ key, value, updated_by: currentUser.user?.id ?? null }, { onConflict: "key" });

  if (error) throw toAdminBackendError(error, "Не удалось сохранить настройку.");
  await writeAuditLog("platform_settings.updated", "platform_settings", key, { key });
}

export async function getAnalyticsMetrics(): Promise<AnalyticsMetrics> {
  const [students, completedLessons, progress, weekdayActivity, retentionSeries] =
    await Promise.all([
      countTable("profiles"),
      countCompletedLessons(),
      averageProgress(),
      completionsByWeekday(),
      activeStudentsByMonth(),
    ]);

  return {
    students,
    averageProgress: progress,
    completedLessons,
    weekdayActivity,
    retentionSeries,
    popularLessons: [],
  };
}

async function averageProgress(): Promise<number> {
  const { data, error } = await supabase.from("lesson_progress").select("progress");
  if (error) throw toAdminBackendError(error, "Не удалось загрузить прогресс.");
  if (!data?.length) return 0;
  return Math.round(data.reduce((sum, row) => sum + row.progress, 0) / data.length);
}

async function completionsByWeekday(): Promise<SeriesPoint[]> {
  const since = new Date(Date.now() - 6 * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("lesson_progress")
    .select("updated_at")
    .gte("updated_at", since)
    .eq("completed", true);

  if (error) throw toAdminBackendError(error, "Не удалось загрузить активность.");

  const labels = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const counts = new Map(labels.map((label) => [label, 0]));
  for (const row of data ?? []) {
    const label = labels[new Date(row.updated_at).getDay()] ?? "—";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([label, value]) => ({ label, value }));
}

async function activeStudentsByMonth(): Promise<SeriesPoint[]> {
  const since = new Date(Date.now() - 180 * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("profiles")
    .select("last_seen_at")
    .gte("last_seen_at", since)
    .not("last_seen_at", "is", null);

  if (error) throw toAdminBackendError(error, "Не удалось загрузить активных учеников.");

  const buckets = new Map<string, number>();
  for (const row of data ?? []) {
    if (!row.last_seen_at) continue;
    const label = row.last_seen_at.slice(0, 7);
    buckets.set(label, (buckets.get(label) ?? 0) + 1);
  }

  return Array.from(buckets.entries()).map(([label, value]) => ({ label, value }));
}

async function getRecentActivity(): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from("admin_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) throw toAdminBackendError(error, "Не удалось загрузить журнал действий.");
  return data ?? [];
}

async function writeAuditLog(
  action: string,
  entityType: string,
  entityId?: string | null,
  metadata?: Json,
): Promise<void> {
  const { data: currentUser, error: userError } = await supabase.auth.getUser();
  if (userError) throw toAdminBackendError(userError, "Не удалось определить администратора.");

  const { error } = await supabase.from("admin_audit_log").insert({
    admin_id: currentUser.user?.id ?? null,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    metadata: metadata ?? {},
  });

  if (error) throw toAdminBackendError(error, "Не удалось записать аудит.");
}
