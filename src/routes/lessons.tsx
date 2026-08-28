import { useDeferredValue, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  BookOpen,
  Clock3,
  Copy,
  Eye,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { EmptyState } from "@/components/admin/EmptyState";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/services/errors";
import {
  deleteLesson,
  duplicateLesson,
  getLessonEditorData,
  listLessonCatalog,
  listLessonCourseOptions,
  type LessonCatalogItem,
  type LessonEditorData,
} from "@/services/lessonBackend";
import { LessonEditor, LessonPreviewModal } from "@/features/lessons/LessonEditor";

export const Route = createFileRoute("/lessons")({
  validateSearch: (search: Record<string, unknown>) => ({
    lesson: typeof search["lesson"] === "string" ? search["lesson"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Уроки — HunMaster Admin" },
      { name: "description", content: "Production-ready визуальный конструктор уроков HunMaster." },
      { property: "og:title", content: "Уроки — HunMaster Admin" },
      { property: "og:description", content: "Управление уроками, блоками и публикацией." },
    ],
  }),
  component: LessonsPage,
});

type StatusFilter = "all" | "draft" | "published";
type SortMode = "position" | "updated" | "title";

function LessonsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const [courseFilter, setCourseFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("position");
  const [deleteTarget, setDeleteTarget] = useState<LessonCatalogItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [duplicateBusyId, setDuplicateBusyId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<LessonEditorData | null>(null);
  const [previewBusyId, setPreviewBusyId] = useState<string | null>(null);

  const catalogQuery = useQuery({
    queryKey: ["admin", "lessons", "catalog"],
    queryFn: listLessonCatalog,
  });
  const coursesQuery = useQuery({
    queryKey: ["admin", "lessons", "courses"],
    queryFn: listLessonCourseOptions,
  });
  const editorQuery = useQuery({
    queryKey: ["admin", "lessons", "editor", search.lesson],
    queryFn: () => getLessonEditorData(search.lesson!),
    enabled: Boolean(search.lesson && search.lesson !== "new"),
    staleTime: 0,
  });

  const courses = coursesQuery.data ?? [];
  const activeCourse = courses.find((course) => course.id === courseFilter);
  const filtered = useMemo(() => {
    const rows = (catalogQuery.data ?? []).filter((lesson) => {
      const matchesQuery =
        !deferredQuery ||
        `${lesson.title} ${lesson.slug} ${lesson.courseTitle} ${lesson.sectionTitle ?? ""}`
          .toLowerCase()
          .includes(deferredQuery);
      return (
        matchesQuery &&
        (courseFilter === "all" || lesson.courseId === courseFilter) &&
        (sectionFilter === "all" ||
          lesson.sectionId === sectionFilter ||
          (sectionFilter === "none" && !lesson.sectionId)) &&
        (statusFilter === "all" || lesson.status === statusFilter)
      );
    });
    return rows.sort((a, b) =>
      sortMode === "updated"
        ? new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        : sortMode === "title"
          ? a.title.localeCompare(b.title, "ru")
          : a.position - b.position || a.title.localeCompare(b.title, "ru"),
    );
  }, [catalogQuery.data, courseFilter, deferredQuery, sectionFilter, sortMode, statusFilter]);

  const openEditor = (lesson: string) => void navigate({ search: { lesson } });
  const closeEditor = () => void navigate({ search: { lesson: undefined } });

  if (search.lesson) {
    const loading = coursesQuery.isPending || (search.lesson !== "new" && editorQuery.isPending);
    const error = coursesQuery.error || editorQuery.error;
    return (
      <AdminLayout
        title="Конструктор урока"
        subtitle="Блочный canvas · autosave · preview · publish"
      >
        {loading && <EditorSkeleton />}
        {error && (
          <div className="glass-panel rounded-2xl p-8 text-center">
            <p className="text-sm text-destructive">
              {getErrorMessage(error, "Не удалось открыть редактор.")}
            </p>
            <button
              type="button"
              onClick={closeEditor}
              className="mt-4 rounded-xl border border-border px-4 py-2 text-sm"
            >
              К списку
            </button>
          </div>
        )}
        {!loading && !error && (
          <LessonEditor
            key={search.lesson}
            initial={search.lesson === "new" ? null : (editorQuery.data ?? null)}
            courses={courses}
            onBack={closeEditor}
            onSaved={(lessonId) => {
              void queryClient.invalidateQueries({ queryKey: ["admin", "lessons", "catalog"] });
              if (search.lesson === "new")
                void navigate({ search: { lesson: lessonId }, replace: true });
            }}
          />
        )}
      </AdminLayout>
    );
  }

  const previewCourse = previewData
    ? courses.find((course) => course.id === previewData.lesson.courseId)
    : undefined;
  const previewSection =
    previewData && previewCourse
      ? previewCourse.sections.find((section) => section.id === previewData.lesson.sectionId)
      : undefined;

  return (
    <AdminLayout title="Уроки" subtitle="Управление программой и визуальный production-редактор">
      <section className="glass-panel rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-ember uppercase">
              Course Builder
            </p>
            <h1 className="mt-1 font-display text-xl font-semibold">Библиотека уроков</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {catalogQuery.data?.length ?? 0} уроков · реальные данные Supabase
            </p>
          </div>
          <button
            type="button"
            onClick={() => openEditor("new")}
            disabled={!courses.length}
            className="flex h-11 items-center gap-2 rounded-xl border border-ember/40 bg-[var(--gradient-ember)] px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-ember)] disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Создать урок
          </button>
        </div>
        <div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_200px_200px_150px_160px]">
          <label className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск по урокам…"
              className="h-10 w-full rounded-xl border border-border bg-background/25 pr-3 pl-9 text-sm outline-none focus:border-ember/40"
            />
          </label>
          <select
            value={courseFilter}
            onChange={(event) => {
              setCourseFilter(event.target.value);
              setSectionFilter("all");
            }}
            className="lesson-filter"
          >
            <option value="all">Все курсы</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
          <select
            value={sectionFilter}
            onChange={(event) => setSectionFilter(event.target.value)}
            className="lesson-filter"
          >
            <option value="all">Все разделы</option>
            <option value="none">Без раздела</option>
            {activeCourse?.sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.title}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="lesson-filter"
          >
            <option value="all">Все статусы</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
            className="lesson-filter"
          >
            <option value="position">По позиции</option>
            <option value="updated">По обновлению</option>
            <option value="title">По названию</option>
          </select>
        </div>
      </section>

      <section className="mt-4">
        {catalogQuery.isPending && <ListSkeleton />}
        {catalogQuery.isError && (
          <div className="glass-panel rounded-2xl p-8 text-center text-sm text-destructive">
            {getErrorMessage(catalogQuery.error, "Не удалось загрузить уроки.")}
          </div>
        )}
        {!catalogQuery.isPending && !catalogQuery.isError && filtered.length === 0 && (
          <EmptyState
            icon={BookOpen}
            title={catalogQuery.data?.length ? "Ничего не найдено" : "Уроков пока нет"}
            description={
              catalogQuery.data?.length
                ? "Измените поиск или фильтры."
                : "Создайте первый урок и соберите его из блоков."
            }
          />
        )}
        <div className="grid gap-2">
          {filtered.map((lesson, index) => (
            <motion.article
              key={lesson.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.025, 0.25) }}
              onDoubleClick={() => openEditor(lesson.id)}
              className="glass-panel group grid items-center gap-4 rounded-2xl p-4 transition-colors hover:border-ember/25 md:grid-cols-[minmax(0,1fr)_170px_120px_auto]"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-foreground/[0.04] text-ember">
                  <FileText className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-display text-sm font-semibold">{lesson.title}</h2>
                    <span
                      className={cn(
                        "rounded-md border px-2 py-0.5 text-[9px] font-bold tracking-[0.12em] uppercase",
                        lesson.status === "published"
                          ? "border-jade/30 bg-jade/10 text-jade"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {lesson.status}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {lesson.courseTitle}
                    {lesson.sectionTitle ? ` / ${lesson.sectionTitle}` : " / Без раздела"} ·{" "}
                    {lesson.blockCount} блоков
                  </p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5" />
                  {new Date(lesson.updatedAt).toLocaleString("ru-RU", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className="mt-1">
                  Позиция {lesson.position} · {lesson.progressCount} progress
                </p>
              </div>
              <div className="text-xs">
                <p className="truncate text-muted-foreground">/{lesson.slug}</p>
                <p className="mt-1 text-foreground/70">
                  {lesson.courseStatus === "published"
                    ? "Курс опубликован"
                    : `Курс: ${lesson.courseStatus}`}
                </p>
              </div>
              <div className="flex items-center justify-end gap-1">
                <IconButton label="Редактировать" onClick={() => openEditor(lesson.id)}>
                  <Pencil />
                </IconButton>
                <IconButton
                  label="Предпросмотр"
                  busy={previewBusyId === lesson.id}
                  onClick={() => {
                    setPreviewBusyId(lesson.id);
                    void getLessonEditorData(lesson.id)
                      .then(setPreviewData)
                      .catch((error) =>
                        toast.error(getErrorMessage(error, "Не удалось открыть preview.")),
                      )
                      .finally(() => setPreviewBusyId(null));
                  }}
                >
                  <Eye />
                </IconButton>
                <IconButton
                  label="Дублировать"
                  busy={duplicateBusyId === lesson.id}
                  onClick={() => {
                    setDuplicateBusyId(lesson.id);
                    void duplicateLesson(lesson.id)
                      .then(async (copyId) => {
                        toast.success("Копия создана как draft");
                        await queryClient.invalidateQueries({
                          queryKey: ["admin", "lessons", "catalog"],
                        });
                        openEditor(copyId);
                      })
                      .catch((error) =>
                        toast.error(getErrorMessage(error, "Не удалось дублировать урок.")),
                      )
                      .finally(() => setDuplicateBusyId(null));
                  }}
                >
                  <Copy />
                </IconButton>
                <IconButton label="Удалить" destructive onClick={() => setDeleteTarget(lesson)}>
                  <Trash2 />
                </IconButton>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      {previewData && (
        <LessonPreviewModal
          open
          draft={previewData.lesson}
          blocks={previewData.blocks}
          course={previewCourse}
          section={previewSection}
          onClose={() => setPreviewData(null)}
        />
      )}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title={deleteTarget?.progressCount ? "Удаление заблокировано" : "Удалить урок?"}
        description={
          deleteTarget?.progressCount
            ? `У урока «${deleteTarget.title}» есть прогресс ${deleteTarget.progressCount} учеников. Для безопасности снимите урок с публикации: база не разрешит каскадное удаление прогресса.`
            : `Урок «${deleteTarget?.title ?? ""}» и его blocks будут удалены без возможности восстановления. Прогресс других уроков не затрагивается.`
        }
        confirmLabel={deleteTarget?.progressCount ? "Понятно" : "Удалить урок"}
        destructive={!deleteTarget?.progressCount}
        busy={deleteBusy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget || deleteTarget.progressCount) {
            setDeleteTarget(null);
            return;
          }
          setDeleteBusy(true);
          void deleteLesson(deleteTarget.id)
            .then(async () => {
              toast.success("Урок удалён");
              setDeleteTarget(null);
              await queryClient.invalidateQueries({ queryKey: ["admin", "lessons", "catalog"] });
            })
            .catch((error) => toast.error(getErrorMessage(error, "Не удалось удалить урок.")))
            .finally(() => setDeleteBusy(false));
        }}
      />
    </AdminLayout>
  );
}

function IconButton({
  label,
  children,
  onClick,
  destructive = false,
  busy = false,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={busy}
      onClick={onClick}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-lg border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-foreground/[0.04] hover:text-foreground",
        destructive && "hover:border-destructive/25 hover:bg-destructive/10 hover:text-destructive",
      )}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <span className="[&>svg]:h-4 [&>svg]:w-4">{children}</span>
      )}
    </button>
  );
}

function ListSkeleton() {
  return (
    <div className="grid gap-2">
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="glass-panel h-[82px] animate-pulse rounded-2xl bg-foreground/[0.025]"
        />
      ))}
    </div>
  );
}

function EditorSkeleton() {
  return (
    <div className="grid gap-4">
      <div className="glass-panel h-20 animate-pulse rounded-2xl" />
      <div className="glass-panel h-40 animate-pulse rounded-2xl" />
      <div className="glass-panel h-64 animate-pulse rounded-2xl" />
    </div>
  );
}
