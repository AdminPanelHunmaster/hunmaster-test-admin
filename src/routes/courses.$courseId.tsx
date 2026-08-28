import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Reorder, motion } from "motion/react";
import { ArrowLeft, CheckCircle2, Circle, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { EmptyState } from "@/components/admin/EmptyState";
import { GlassCard } from "@/components/admin/GlassCard";
import { useCourseStructure } from "@/hooks/useAdminBackend";

export const Route = createFileRoute("/courses/$courseId")({
  head: () => ({
    meta: [
      { title: "Редактор курса - HunMaster Admin" },
      {
        name: "description",
        content: "Структура курса HunMaster из Supabase.",
      },
      { property: "og:title", content: "Редактор курса - HunMaster Admin" },
      { property: "og:description", content: "Структура курса HunMaster из Supabase." },
    ],
  }),
  component: CourseEditor,
});

type Lesson = { id: string; title: string; duration: string; published: boolean };
type Section = { id: string; title: string; lessons: Lesson[] };

function CourseEditor() {
  const { courseId } = Route.useParams();
  const structureQuery = useCourseStructure(courseId);
  const [sections, setSections] = useState<Section[]>([]);
  const [toDelete, setToDelete] = useState<string | null>(null);

  useEffect(() => {
    setSections(structureQuery.data?.sections ?? []);
  }, [structureQuery.data?.sections]);

  const course = structureQuery.data?.course ?? null;
  const setLessons = (sectionId: string, lessons: Lesson[]) =>
    setSections((prev) =>
      prev.map((section) => (section.id === sectionId ? { ...section, lessons } : section)),
    );

  return (
    <AdminLayout
      title={course?.title ?? "Курс"}
      subtitle="Структура курса - модули и уроки из Supabase"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link
          to="/courses"
          className="flex items-center gap-2 rounded-xl border border-border px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />К списку курсов
        </Link>
        <div className="flex flex-wrap gap-2">
          <button className="flex items-center gap-2 rounded-xl border border-border px-3.5 py-2 text-sm transition-colors hover:border-ember/40 hover:text-ember">
            <Plus className="h-4 w-4" />
            Добавить модуль
          </button>
          <Link
            to="/lessons"
            search={{ lesson: "new" }}
            className="flex items-center gap-2 rounded-xl border border-ember/40 bg-[var(--gradient-ember)] px-3.5 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            Добавить урок
          </Link>
        </div>
      </div>

      {structureQuery.error && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {structureQuery.error.message}
        </div>
      )}

      {sections.length === 0 ? (
        <EmptyState
          icon={Plus}
          title="Модулей пока нет"
          description="Создайте разделы курса в Supabase или через следующий шаг редактора."
        />
      ) : (
        <div className="grid gap-4">
          {sections.map((section, sectionIndex) => (
            <GlassCard
              key={section.id}
              interactive={false}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: sectionIndex * 0.08 }}
              className="p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-base font-semibold">{section.title}</h3>
                <div className="flex gap-1.5">
                  <button className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-ember">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setToDelete(section.id)}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <Reorder.Group
                axis="y"
                values={section.lessons}
                onReorder={(lessons) => setLessons(section.id, lessons as Lesson[])}
                className="mt-4 grid gap-2"
              >
                {section.lessons.map((lesson) => (
                  <Reorder.Item
                    key={lesson.id}
                    value={lesson}
                    whileDrag={{ scale: 1.02, boxShadow: "var(--shadow-ember)" }}
                    className="flex cursor-grab items-center gap-3 rounded-xl border border-border/60 bg-foreground/[0.03] px-3.5 py-3 transition-colors hover:border-ember/25 active:cursor-grabbing"
                  >
                    <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                    {lesson.published ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-jade" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {lesson.title}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {lesson.duration}
                    </span>
                    <motion.span whileHover={{ scale: 1.1 }} className="shrink-0">
                      <Link
                        to="/lessons"
                        search={{ lesson: lesson.id }}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-ember"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                    </motion.span>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            </GlassCard>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!toDelete}
        title="Удалить модуль"
        description="Удаление модуля должно выполняться через backend с проверкой зависимых уроков. Сейчас действие убирает модуль только из текущего вида."
        confirmLabel="Убрать из вида"
        destructive
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          setSections((prev) => prev.filter((section) => section.id !== toDelete));
          setToDelete(null);
        }}
      />
    </AdminLayout>
  );
}
