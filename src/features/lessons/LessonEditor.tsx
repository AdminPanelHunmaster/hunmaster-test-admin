import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Clock3,
  Eye,
  Loader2,
  Plus,
  Save,
  Send,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/services/errors";
import {
  saveLesson,
  type LessonCourseOption,
  type LessonEditorData,
} from "@/services/lessonBackend";
import {
  createEditorBlock,
  databaseTypeForKind,
  lessonDraftSchema,
  normalizePositions,
  slugify,
  type BlockContent,
  type BlockKind,
  type EditorBlock,
  type LessonDraft,
} from "./lesson-blocks";
import { BlockPalette } from "./BlockPalette";
import { LessonBlockEditor } from "./LessonBlockEditor";
import { LessonBlockRenderer } from "./LessonBlockRenderer";

type SaveState = "idle" | "saving" | "saved" | "error";

const fieldClass =
  "h-10 w-full rounded-xl border border-border/70 bg-background/25 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ember/40";

function fingerprint(draft: LessonDraft, blocks: EditorBlock[]) {
  return JSON.stringify({ draft, blocks });
}

function formatSavedAt(value: Date | null) {
  if (!value) return "Ещё не сохранено";
  return `Сохранено в ${value.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
}

export function LessonPreviewModal({
  open,
  draft,
  blocks,
  course,
  section,
  onClose,
}: {
  open: boolean;
  draft: LessonDraft;
  blocks: EditorBlock[];
  course: LessonCourseOption | undefined;
  section: { id: string; title: string } | undefined;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const listener = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [onClose, open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] overflow-y-auto bg-background/95 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="sticky top-0 z-10 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-xl">
            <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold tracking-[0.17em] text-ember uppercase">
                  Предпросмотр ученика
                </p>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {course?.title}
                  {section ? ` / ${section.title}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 items-center gap-2 rounded-xl border border-border px-3 text-sm text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
                Закрыть
              </button>
            </div>
          </div>
          <main className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
            <header className="mb-10 border-b border-border/70 pb-8">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{course?.title ?? "Курс"}</span>
                <ChevronRight className="h-3 w-3" />
                {section && (
                  <>
                    <span>{section.title}</span>
                    <ChevronRight className="h-3 w-3" />
                  </>
                )}
                <span>Урок {draft.position + 1}</span>
              </div>
              <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                {draft.title || "Без названия"}
              </h1>
              {draft.description && (
                <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                  {draft.description}
                </p>
              )}
            </header>
            <div className="grid gap-7">
              {blocks.map((block) => (
                <section key={block.id}>
                  <LessonBlockRenderer block={block} />
                </section>
              ))}
              {blocks.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
                  Урок пока пуст
                </div>
              )}
            </div>
          </main>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function LessonEditor({
  initial,
  courses,
  onBack,
  onSaved,
}: {
  initial: LessonEditorData | null;
  courses: LessonCourseOption[];
  onBack: () => void;
  onSaved: (lessonId: string) => void;
}) {
  const firstCourse = courses[0];
  const [draft, setDraft] = useState<LessonDraft>(
    () =>
      initial?.lesson ?? {
        id: null,
        courseId: firstCourse?.id ?? "",
        sectionId: null,
        title: "",
        slug: "",
        description: "",
        position: 0,
        status: "draft",
        videoUrl: "",
        content: {},
      },
  );
  const [blocks, setBlocks] = useState<EditorBlock[]>(() => initial?.blocks ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(initial?.blocks[0]?.id ?? null);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial));
  const [saveState, setSaveState] = useState<SaveState>(initial ? "saved" : "idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(() =>
    initial ? new Date(initial.lesson.updatedAt) : null,
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [paletteInsertIndex, setPaletteInsertIndex] = useState<number | null>(null);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const savedFingerprintRef = useRef(fingerprint(draft, blocks));
  const draftRef = useRef(draft);
  const blocksRef = useRef(blocks);
  const savePromiseRef = useRef<Promise<void> | null>(null);
  const failedAutosaveFingerprintRef = useRef<string | null>(null);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  const currentFingerprint = useMemo(() => fingerprint(draft, blocks), [draft, blocks]);
  const dirty = currentFingerprint !== savedFingerprintRef.current;
  const course = courses.find((item) => item.id === draft.courseId);
  const sections = course?.sections ?? [];
  const section = sections.find((item) => item.id === draft.sectionId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 7 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const saveSnapshot = useCallback(
    async (
      nextDraft: LessonDraft,
      nextBlocks: EditorBlock[],
      action: "lesson.updated" | "lesson.published" | "lesson.unpublished" | null,
      showSuccess: boolean,
    ) => {
      if (savePromiseRef.current) await savePromiseRef.current;
      const parsed = lessonDraftSchema.safeParse(nextDraft);
      if (!parsed.success) {
        const message = parsed.error.issues[0]?.message ?? "Проверьте данные урока.";
        setSaveState("error");
        setSaveError(message);
        if (showSuccess) toast.error(message);
        throw new Error(message);
      }
      const snapshotFingerprint = fingerprint(nextDraft, nextBlocks);
      setSaveState("saving");
      setSaveError(null);
      const operation = (async () => {
        try {
          const result = await saveLesson(nextDraft, nextBlocks, action);
          const savedDraft = { ...nextDraft, id: result.lesson.id };
          savedFingerprintRef.current = fingerprint(savedDraft, nextBlocks);
          setDraft((current) => ({ ...current, id: result.lesson.id }));
          setLastSavedAt(new Date(result.lesson.updatedAt));
          setSaveState("saved");
          onSaved(result.lesson.id);
          if (showSuccess)
            toast.success(
              action === "lesson.published"
                ? "Урок опубликован"
                : action === "lesson.unpublished"
                  ? "Урок снят с публикации"
                  : "Урок сохранён",
            );
        } catch (error) {
          const message = getErrorMessage(error, "Не удалось сохранить урок.");
          setSaveState("error");
          setSaveError(message);
          if (showSuccess) toast.error(message);
          throw error;
        }
      })();
      savePromiseRef.current = operation;
      try {
        await operation;
      } finally {
        if (savePromiseRef.current === operation) savePromiseRef.current = null;
      }
      return snapshotFingerprint;
    },
    [onSaved],
  );

  useEffect(() => {
    if (!dirty || saveState === "saving") return;
    if (!draft.title.trim() || !draft.slug.trim() || !draft.courseId) return;
    if (failedAutosaveFingerprintRef.current === currentFingerprint) return;
    const timeout = window.setTimeout(() => {
      void saveSnapshot(draft, blocks, null, false)
        .then(() => {
          failedAutosaveFingerprintRef.current = null;
        })
        .catch(() => {
          failedAutosaveFingerprintRef.current = currentFingerprint;
        });
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [blocks, currentFingerprint, dirty, draft, saveSnapshot, saveState]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveSnapshot(draftRef.current, blocksRef.current, "lesson.updated", true).catch(
          () => undefined,
        );
      }
      if (event.key === "Escape") setPaletteInsertIndex(null);
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [saveSnapshot]);

  const insertBlock = (kind: BlockKind, index = blocks.length) => {
    const next = createEditorBlock(kind, index);
    setBlocks((current) =>
      normalizePositions([...current.slice(0, index), next, ...current.slice(index)]),
    );
    setSelectedId(next.id);
    setPaletteInsertIndex(null);
    window.setTimeout(
      () =>
        document
          .querySelector(`[data-block-id="${next.id}"]`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
      50,
    );
  };

  const updateBlock = (id: string, content: BlockContent) => {
    setBlocks((current) =>
      current.map((block) =>
        block.id === id ? { ...block, type: databaseTypeForKind(content.kind), content } : block,
      ),
    );
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    setBlocks((current) => normalizePositions(arrayMove(current, index, target)));
  };

  const dragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setBlocks((current) => {
      const from = current.findIndex((item) => item.id === active.id);
      const to = current.findIndex((item) => item.id === over.id);
      return normalizePositions(arrayMove(current, from, to));
    });
  };

  const requestBack = () => (dirty ? setLeaveConfirmOpen(true) : onBack());
  const statusLabel =
    saveState === "saving"
      ? "Сохранение…"
      : saveState === "error"
        ? "Ошибка сохранения"
        : dirty
          ? "Есть изменения"
          : saveState === "saved"
            ? "Сохранено"
            : "Черновик";

  return (
    <div className="lesson-editor-shell">
      <div className="glass-panel sticky top-2 z-30 mb-4 rounded-2xl p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={requestBack}
            className="grid h-10 w-10 place-items-center rounded-xl border border-border text-muted-foreground hover:text-foreground"
            aria-label="К списку уроков"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-[220px] flex-1">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              <span>{course?.title ?? "Выберите курс"}</span>
              {section && (
                <>
                  <ChevronRight className="h-3 w-3" />
                  <span>{section.title}</span>
                </>
              )}
            </div>
            <input
              value={draft.title}
              onChange={(event) => {
                const title = event.target.value;
                setDraft((current) => ({
                  ...current,
                  title,
                  slug: slugTouched ? current.slug : slugify(title),
                }));
              }}
              placeholder="Название урока"
              className="mt-0.5 w-full bg-transparent font-display text-lg font-semibold outline-none placeholder:text-muted-foreground sm:text-xl"
            />
          </div>
          <div className="mr-1 flex items-center gap-2 text-xs">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                saveState === "saving"
                  ? "animate-pulse bg-ember"
                  : saveState === "error"
                    ? "bg-destructive"
                    : dirty
                      ? "bg-amber-300"
                      : "bg-jade",
              )}
            />
            <div>
              <p className={saveState === "error" ? "text-destructive" : "text-foreground/85"}>
                {statusLabel}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {saveError || formatSavedAt(lastSavedAt)}
              </p>
            </div>
          </div>
          <button type="button" onClick={() => setPreviewOpen(true)} className="editor-button">
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Предпросмотр</span>
          </button>
          <button
            type="button"
            disabled={saveState === "saving"}
            onClick={() =>
              void saveSnapshot(draft, blocks, "lesson.updated", true).catch(() => undefined)
            }
            className="editor-button"
          >
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">Сохранить</span>
          </button>
          <button
            type="button"
            disabled={saveState === "saving"}
            onClick={() => {
              const nextStatus = draft.status === "published" ? "draft" : "published";
              const next = { ...draft, status: nextStatus } as LessonDraft;
              setDraft(next);
              void saveSnapshot(
                next,
                blocks,
                nextStatus === "published" ? "lesson.published" : "lesson.unpublished",
                true,
              ).catch(() => setDraft(draft));
            }}
            className={cn(
              "editor-button",
              draft.status === "published"
                ? "border-border"
                : "border-ember/40 bg-[var(--gradient-ember)] text-primary-foreground",
            )}
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">
              {draft.status === "published" ? "Снять" : "Опубликовать"}
            </span>
          </button>
        </div>
      </div>

      <div className="grid items-start gap-4 2xl:grid-cols-[minmax(0,1fr)_290px]">
        <div className="min-w-0">
          <section className="glass-panel mb-4 rounded-2xl p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-sm font-semibold">Параметры урока</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Metadata сохраняется в таблицу lessons
                </p>
              </div>
              <span
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-[10px] font-bold tracking-[0.13em] uppercase",
                  draft.status === "published"
                    ? "border-jade/30 bg-jade/10 text-jade"
                    : "border-border text-muted-foreground",
                )}
              >
                {draft.status}
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label>
                <span className="metadata-label">Курс</span>
                <select
                  value={draft.courseId}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      courseId: event.target.value,
                      sectionId: null,
                    }))
                  }
                  className={`mt-2 ${fieldClass}`}
                >
                  <option value="">Выберите курс</option>
                  {courses.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                      {item.status !== "published" ? ` · ${item.status}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="metadata-label">Раздел</span>
                <select
                  value={draft.sectionId ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, sectionId: event.target.value || null }))
                  }
                  className={`mt-2 ${fieldClass}`}
                >
                  <option value="">Без раздела</option>
                  {sections.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="metadata-label">Slug</span>
                <input
                  value={draft.slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    setDraft((current) => ({ ...current, slug: slugify(event.target.value) }));
                  }}
                  placeholder="privetstvie"
                  className={`mt-2 ${fieldClass}`}
                />
              </label>
              <label>
                <span className="metadata-label">Позиция</span>
                <input
                  type="number"
                  min={0}
                  value={draft.position}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      position: Math.max(0, Number(event.target.value)),
                    }))
                  }
                  className={`mt-2 ${fieldClass}`}
                />
              </label>
              <label className="md:col-span-2 xl:col-span-3">
                <span className="metadata-label">Описание</span>
                <input
                  value={draft.description}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, description: event.target.value }))
                  }
                  placeholder="Краткое описание для студента"
                  className={`mt-2 ${fieldClass}`}
                />
              </label>
              <label>
                <span className="metadata-label">Video URL урока</span>
                <input
                  value={draft.videoUrl}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, videoUrl: event.target.value }))
                  }
                  placeholder="Опционально"
                  className={`mt-2 ${fieldClass}`}
                />
              </label>
            </div>
          </section>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}>
            <SortableContext
              items={blocks.map((block) => block.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid gap-3">
                {blocks.map((block, index) => (
                  <div key={block.id} data-block-id={block.id}>
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => setPaletteInsertIndex(index)}
                        className="canvas-insert-button"
                        aria-label={`Вставить блок перед ${index + 1}`}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    )}
                    <LessonBlockEditor
                      block={block}
                      index={index}
                      total={blocks.length}
                      courseId={draft.courseId}
                      selected={selectedId === block.id}
                      onSelect={() => setSelectedId(block.id)}
                      onChange={(content) => updateBlock(block.id, content)}
                      onDuplicate={() => {
                        const copy = {
                          ...block,
                          id: crypto.randomUUID(),
                          content: structuredClone(block.content),
                        };
                        setBlocks((current) =>
                          normalizePositions([
                            ...current.slice(0, index + 1),
                            copy,
                            ...current.slice(index + 1),
                          ]),
                        );
                        setSelectedId(copy.id);
                      }}
                      onDelete={() =>
                        setBlocks((current) =>
                          normalizePositions(current.filter((item) => item.id !== block.id)),
                        )
                      }
                      onMove={(direction) => moveBlock(index, direction)}
                      onOpenPalette={() => setPaletteInsertIndex(index + 1)}
                    />
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
          {blocks.length === 0 ? (
            <button
              type="button"
              onClick={() => setPaletteInsertIndex(0)}
              className="glass-panel mt-2 grid min-h-56 w-full place-items-center rounded-2xl border-dashed text-center"
            >
              <span>
                <Plus className="mx-auto h-7 w-7 text-ember" />
                <strong className="mt-3 block font-display text-sm">Добавьте первый блок</strong>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Текст, медиа, словарь или интерактивное задание
                </span>
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setPaletteInsertIndex(blocks.length)}
              className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border text-xs text-muted-foreground transition-colors hover:border-ember/35 hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
              Добавить блок
            </button>
          )}
        </div>
        <aside className="glass-panel sticky top-[98px] hidden max-h-[calc(100vh-120px)] overflow-y-auto rounded-2xl p-4 2xl:block">
          <div className="mb-4">
            <h2 className="font-display text-sm font-semibold">Палитра блоков</h2>
            <p className="mt-1 text-xs text-muted-foreground">Нажмите, чтобы добавить в конец</p>
          </div>
          <BlockPalette onAdd={(kind) => insertBlock(kind)} />
        </aside>
      </div>

      <AnimatePresence>
        {paletteInsertIndex !== null && (
          <motion.div
            className="fixed inset-0 z-[70] grid place-items-center bg-background/70 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) =>
              event.target === event.currentTarget && setPaletteInsertIndex(null)
            }
          >
            <motion.div
              initial={{ y: 14, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 8, scale: 0.98 }}
              className="glass-panel w-full max-w-md rounded-2xl p-5"
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="font-display text-base font-semibold">Добавить блок</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Позиция {paletteInsertIndex + 1} · Esc для закрытия
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPaletteInsertIndex(null)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <BlockPalette compact onAdd={(kind) => insertBlock(kind, paletteInsertIndex)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <LessonPreviewModal
        open={previewOpen}
        draft={draft}
        blocks={blocks}
        course={course}
        section={section}
        onClose={() => setPreviewOpen(false)}
      />
      <ConfirmModal
        open={leaveConfirmOpen}
        title="Есть несохранённые изменения"
        description="Дождитесь autosave или сохраните урок вручную. Если выйти сейчас, последние изменения могут быть потеряны."
        confirmLabel="Выйти без сохранения"
        destructive
        onConfirm={onBack}
        onCancel={() => setLeaveConfirmOpen(false)}
      />
    </div>
  );
}
