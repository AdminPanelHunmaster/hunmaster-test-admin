import { supabase } from "@/lib/supabase/client";
import type {
  CourseStatus,
  Json,
  LessonBlockType,
  LessonRow,
  LessonStatus,
} from "@/lib/supabase/database.types";
import {
  blockContentSchema,
  databaseTypeForKind,
  lessonDraftSchema,
  normalizePositions,
  parseBlockContent,
  serializeBlockContent,
  type EditorBlock,
  type LessonDraft,
} from "@/features/lessons/lesson-blocks";
import { toAdminBackendError } from "./errors";

export type LessonCatalogItem = {
  id: string;
  courseId: string;
  courseTitle: string;
  courseStatus: CourseStatus;
  sectionId: string | null;
  sectionTitle: string | null;
  title: string;
  slug: string;
  description: string;
  position: number;
  status: LessonStatus;
  updatedAt: string;
  blockCount: number;
  progressCount: number;
};

export type LessonCourseOption = {
  id: string;
  title: string;
  status: CourseStatus;
  sections: { id: string; title: string; position: number }[];
};

export type LessonEditorData = {
  lesson: Omit<LessonDraft, "id"> & { id: string; createdAt: string; updatedAt: string };
  blocks: EditorBlock[];
};

type LessonSaveAction =
  "lesson.updated" | "lesson.published" | "lesson.unpublished" | "lesson.duplicated" | null;

export async function listLessonCatalog(): Promise<LessonCatalogItem[]> {
  const { data, error } = await supabase
    .from("lessons")
    .select(
      "id, course_id, section_id, title, slug, description, position, status, updated_at, course:courses(id,title,status), section:course_sections(id,title), lesson_blocks(count), lesson_progress(count)",
    )
    .order("position", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) throw toAdminBackendError(error, "Не удалось загрузить уроки.");

  return (
    (data ?? []) as unknown as Array<{
      id: string;
      course_id: string;
      section_id: string | null;
      title: string;
      slug: string;
      description: string | null;
      position: number;
      status: LessonStatus;
      updated_at: string;
      course: { id: string; title: string; status: CourseStatus } | null;
      section: { id: string; title: string } | null;
      lesson_blocks: { count: number }[];
      lesson_progress: { count: number }[];
    }>
  ).map((row) => ({
    id: row.id,
    courseId: row.course_id,
    courseTitle: row.course?.title ?? "Курс удалён",
    courseStatus: row.course?.status ?? "archived",
    sectionId: row.section_id,
    sectionTitle: row.section?.title ?? null,
    title: row.title,
    slug: row.slug,
    description: row.description ?? "",
    position: row.position,
    status: row.status,
    updatedAt: row.updated_at,
    blockCount: row.lesson_blocks[0]?.count ?? 0,
    progressCount: row.lesson_progress[0]?.count ?? 0,
  }));
}

export async function listLessonCourseOptions(): Promise<LessonCourseOption[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("id,title,status,course_sections(id,title,position)")
    .order("position", { ascending: true })
    .order("title", { ascending: true });

  if (error) throw toAdminBackendError(error, "Не удалось загрузить курсы и разделы.");

  return (
    (data ?? []) as unknown as Array<{
      id: string;
      title: string;
      status: CourseStatus;
      course_sections: { id: string; title: string; position: number }[];
    }>
  ).map((course) => ({
    id: course.id,
    title: course.title,
    status: course.status,
    sections: [...course.course_sections].sort(
      (a, b) => a.position - b.position || a.title.localeCompare(b.title),
    ),
  }));
}

export async function getLessonEditorData(lessonId: string): Promise<LessonEditorData> {
  const [lessonResult, blocksResult] = await Promise.all([
    supabase.from("lessons").select("*").eq("id", lessonId).maybeSingle(),
    supabase
      .from("lesson_blocks")
      .select("id,type,content,position")
      .eq("lesson_id", lessonId)
      .order("position", { ascending: true }),
  ]);

  if (lessonResult.error)
    throw toAdminBackendError(lessonResult.error, "Не удалось загрузить урок.");
  if (blocksResult.error)
    throw toAdminBackendError(blocksResult.error, "Не удалось загрузить блоки урока.");
  if (!lessonResult.data) throw new Error("Урок не найден или недоступен.");

  const lesson = lessonResult.data;
  return {
    lesson: {
      id: lesson.id,
      courseId: lesson.course_id,
      sectionId: lesson.section_id,
      title: lesson.title,
      slug: lesson.slug,
      description: lesson.description ?? "",
      position: lesson.position,
      status: lesson.status === "published" ? "published" : "draft",
      videoUrl: lesson.video_url ?? "",
      content:
        lesson.content && typeof lesson.content === "object" && !Array.isArray(lesson.content)
          ? (lesson.content as Record<string, unknown>)
          : {},
      createdAt: lesson.created_at,
      updatedAt: lesson.updated_at,
    },
    blocks: normalizePositions(
      (blocksResult.data ?? []).map((block) => ({
        id: block.id,
        type: block.type,
        content: parseBlockContent(block.type, block.content),
        position: block.position,
      })),
    ),
  };
}

export async function saveLesson(
  lessonInput: LessonDraft,
  blockInput: EditorBlock[],
  action: LessonSaveAction,
  metadata: Record<string, Json | undefined> = {},
): Promise<LessonEditorData> {
  const lesson = lessonDraftSchema.parse(lessonInput);
  const blocks = normalizePositions(blockInput).map((block) => {
    const content = blockContentSchema.parse(block.content);
    return {
      id: block.id,
      type: databaseTypeForKind(content.kind),
      content: serializeBlockContent(content),
      position: block.position,
    };
  });

  const { data, error } = await supabase.rpc("admin_save_lesson", {
    p_lesson: {
      id: lesson.id,
      course_id: lesson.courseId,
      section_id: lesson.sectionId,
      title: lesson.title,
      slug: lesson.slug,
      description: lesson.description,
      position: lesson.position,
      status: lesson.status,
      video_url: lesson.videoUrl,
      content: lesson.content as Json,
    },
    p_blocks: blocks as unknown as Json,
    p_audit_action: action,
    p_audit_metadata: metadata as Json,
  });

  if (error) throw toAdminBackendError(error, "Не удалось сохранить урок.");
  const payload = data as unknown as {
    lesson: LessonRow;
    blocks: Array<{ id: string; type: LessonBlockType; content: Json; position: number }>;
  };

  return {
    lesson: {
      id: payload.lesson.id,
      courseId: payload.lesson.course_id,
      sectionId: payload.lesson.section_id,
      title: payload.lesson.title,
      slug: payload.lesson.slug,
      description: payload.lesson.description ?? "",
      position: payload.lesson.position,
      status: payload.lesson.status === "published" ? "published" : "draft",
      videoUrl: payload.lesson.video_url ?? "",
      content:
        payload.lesson.content &&
        typeof payload.lesson.content === "object" &&
        !Array.isArray(payload.lesson.content)
          ? (payload.lesson.content as Record<string, unknown>)
          : {},
      createdAt: payload.lesson.created_at,
      updatedAt: payload.lesson.updated_at,
    },
    blocks: normalizePositions(
      payload.blocks.map((block) => ({
        id: block.id,
        type: block.type,
        content: parseBlockContent(block.type, block.content),
        position: block.position,
      })),
    ),
  };
}

export async function duplicateLesson(lessonId: string): Promise<string> {
  const { data, error } = await supabase.rpc("admin_duplicate_lesson", {
    p_lesson_id: lessonId,
  });
  if (error) throw toAdminBackendError(error, "Не удалось дублировать урок.");
  return data;
}

export async function deleteLesson(lessonId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_delete_lesson", { p_lesson_id: lessonId });
  if (error) throw toAdminBackendError(error, "Не удалось удалить урок.");
}

export async function uploadLessonMedia(
  file: File,
  courseId: string,
): Promise<{ url: string; storagePath: string }> {
  const extension =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "bin";
  const storagePath = `${courseId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("lesson-media")
    .upload(storagePath, file, { cacheControl: "3600", upsert: false });
  if (uploadError) throw toAdminBackendError(uploadError, "Не удалось загрузить медиафайл.");

  const { data, error: signError } = await supabase.storage
    .from("lesson-media")
    .createSignedUrl(storagePath, 31_536_000);
  if (signError) throw toAdminBackendError(signError, "Не удалось создать защищённую ссылку.");
  return { url: data.signedUrl, storagePath };
}
