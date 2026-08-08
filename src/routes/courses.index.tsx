import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { motion } from "motion/react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { CourseCard } from "@/components/admin/CourseCard";
import { courses as mockCourses } from "@/lib/mock-data";

export const Route = createFileRoute("/courses/")({
  head: () => ({
    meta: [
      { title: "Курсы — HunMaster Admin" },
      {
        name: "description",
        content: "Управление курсами венгерского языка: модули, уроки и публикация.",
      },
      { property: "og:title", content: "Курсы — HunMaster Admin" },
      {
        property: "og:description",
        content: "Управление курсами венгерского языка: модули, уроки и публикация.",
      },
    ],
  }),
  component: CoursesPage,
});

function CoursesPage() {
  const [courses, setCourses] = useState(mockCourses);

  return (
    <AdminLayout title="Курсы" subtitle="4 программы обучения венгерскому языку">
      <div className="mb-4 flex justify-end">
        <motion.button
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 rounded-xl border border-ember/40 bg-[var(--gradient-ember)] px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          Создать курс
        </motion.button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {courses.map((c, i) => (
          <CourseCard
            key={c.id}
            course={c}
            index={i}
            onTogglePublish={(id) =>
              setCourses((prev) =>
                prev.map((x) => (x.id === id ? { ...x, published: !x.published } : x)),
              )
            }
          />
        ))}
      </div>
    </AdminLayout>
  );
}