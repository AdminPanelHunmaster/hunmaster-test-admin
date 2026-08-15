import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Reorder, motion } from "motion/react";
import { GripVertical, Plus, Pencil, Trash2, ArrowLeft, Circle, CheckCircle2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { GlassCard } from "@/components/admin/GlassCard";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { courseModules, courses } from "@/lib/data";

export const Route = createFileRoute("/courses/$courseId")({
  head: () => ({
    meta: [
      { title: "Редактор курса — HunMaster Admin" },
      {
        name: "description",
        content: "Структура курса: модули, уроки и порядок изучения материала.",
      },
      { property: "og:title", content: "Редактор курса — HunMaster Admin" },
      {
        property: "og:description",
        content: "Структура курса: модули, уроки и порядок изучения материала.",
      },
    ],
  }),
  component: CourseEditor,
});

type Lesson = { id: string; title: string; duration: string; published: boolean };

function CourseEditor() {
  const { courseId } = Route.useParams();
  const course = courses.find((c) => c.id === courseId) ?? courses[0]!;
  const [modules, setModules] = useState(courseModules);
  const [toDelete, setToDelete] = useState<string | null>(null);

  const setLessons = (moduleId: string, lessons: Lesson[]) =>
    setModules((prev) => prev.map((m) => (m.id === moduleId ? { ...m, lessons } : m)));

  return (
    <AdminLayout title={course.title} subtitle="Структура курса — перетаскивайте уроки для сортировки">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link
          to="/courses"
          className="flex items-center gap-2 rounded-xl border border-border px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          К списку курсов
        </Link>
        <div className="flex flex-wrap gap-2">
          <button className="flex items-center gap-2 rounded-xl border border-border px-3.5 py-2 text-sm transition-colors hover:border-ember/40 hover:text-ember">
            <Plus className="h-4 w-4" />
            Добавить модуль
          </button>
          <Link
            to="/lessons"
            className="flex items-center gap-2 rounded-xl border border-ember/40 bg-[var(--gradient-ember)] px-3.5 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            Добавить урок
          </Link>
        </div>
      </div>

      <div className="grid gap-4">
        {modules.map((m, mi) => (
          <GlassCard
            key={m.id}
            interactive={false}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: mi * 0.08 }}
            className="p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-base font-semibold">{m.title}</h3>
              <div className="flex gap-1.5">
                <button className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-ember">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setToDelete(m.id)}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <Reorder.Group
              axis="y"
              values={m.lessons}
              onReorder={(l) => setLessons(m.id, l as Lesson[])}
              className="mt-4 grid gap-2"
            >
              {m.lessons.map((lesson) => (
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
                  <span className="shrink-0 text-xs text-muted-foreground">{lesson.duration}</span>
                  <motion.span whileHover={{ scale: 1.1 }} className="shrink-0">
                    <Link
                      to="/lessons"
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

      <ConfirmModal
        open={!!toDelete}
        title="Удалить модуль"
        description="Модуль и все его уроки будут удалены из структуры курса. Демонстрационный режим."
        confirmLabel="Удалить"
        destructive
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          setModules((prev) => prev.filter((m) => m.id !== toDelete));
          setToDelete(null);
        }}
      />
    </AdminLayout>
  );
}