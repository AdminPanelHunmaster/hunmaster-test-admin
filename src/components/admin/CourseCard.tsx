import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Eye, EyeOff, Pencil, Layers, BookOpen, Users } from "lucide-react";
import { GlassCard } from "./GlassCard";

export type Course = {
  id: string;
  title: string;
  subtitle: string;
  published: boolean;
  modules: number;
  lessons: number;
  students: number;
};

export function CourseCard({
  course,
  index,
  onTogglePublish,
}: {
  course: Course;
  index: number;
  onTogglePublish: (id: string) => void;
}) {
  return (
    <GlassCard
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      className="group/card flex flex-col p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display truncate text-lg font-semibold">{course.title}</h3>
          <p className="mt-1 truncate text-sm text-muted-foreground">{course.subtitle}</p>
        </div>
        <span
          className={
            course.published
              ? "shrink-0 rounded-full border border-jade/35 bg-jade/10 px-2.5 py-1 text-[10px] font-bold tracking-[0.14em] text-jade uppercase"
              : "shrink-0 rounded-full border border-border bg-foreground/5 px-2.5 py-1 text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase"
          }
        >
          {course.published ? "Опубликован" : "Черновик"}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        {[
          { icon: Layers, value: course.modules, label: "Модулей" },
          { icon: BookOpen, value: course.lessons, label: "Уроков" },
          { icon: Users, value: course.students, label: "Учеников" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-foreground/[0.03] p-3">
            <s.icon className="h-3.5 w-3.5 text-ember" />
            <p className="font-display mt-2 text-lg font-semibold">{s.value}</p>
            <p className="text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold transition-colors hover:border-ember/40 hover:text-ember">
          <Pencil className="h-3.5 w-3.5" />
          Редактировать
        </button>
        <Link
          to="/courses/$courseId"
          params={{ courseId: course.id }}
          className="rounded-xl border border-ember/35 bg-ember/10 px-3 py-2 text-xs font-semibold text-ember transition-colors hover:bg-ember/20"
        >
          Открыть уроки
        </Link>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => onTogglePublish(course.id)}
          className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          {course.published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {course.published ? "Скрыть" : "Опубликовать"}
        </motion.button>
      </div>
    </GlassCard>
  );
}
