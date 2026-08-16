import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { motion } from "motion/react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { CourseCard } from "@/components/admin/CourseCard";
import { EmptyState } from "@/components/admin/EmptyState";
import { useAdminCourses, useCoursePublishMutation } from "@/hooks/useAdminBackend";

export const Route = createFileRoute("/courses/")({
  head: () => ({
    meta: [
      { title: "Курсы - HunMaster Admin" },
      {
        name: "description",
        content: "Управление курсами HunMaster из Supabase.",
      },
      { property: "og:title", content: "Курсы - HunMaster Admin" },
      { property: "og:description", content: "Управление курсами HunMaster из Supabase." },
    ],
  }),
  component: CoursesPage,
});

function CoursesPage() {
  const coursesQuery = useAdminCourses();
  const publishMutation = useCoursePublishMutation();
  const courses = coursesQuery.data ?? [];

  return (
    <AdminLayout
      title="Курсы"
      subtitle={
        courses.length === 0
          ? "Курсов пока нет"
          : `${courses.length} программ обучения венгерскому языку`
      }
    >
      <div className="mb-4 flex justify-end">
        <motion.button
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 rounded-xl border border-ember/40 bg-[var(--gradient-ember)] px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          Создать курс
        </motion.button>
      </div>

      {coursesQuery.error && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {coursesQuery.error.message}
        </div>
      )}

      {courses.length === 0 ? (
        <EmptyState
          icon={Plus}
          title="Курсов пока нет"
          description="Создайте первый курс после применения Supabase migrations."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {courses.map((course, index) => (
            <CourseCard
              key={course.id}
              course={course}
              index={index}
              onTogglePublish={(id) => {
                const current = courses.find((item) => item.id === id);
                void publishMutation.mutateAsync({
                  courseId: id,
                  published: !(current?.published ?? false),
                });
              }}
            />
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
