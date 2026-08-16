import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import {
  Type,
  Heading1,
  Image as ImageIcon,
  Video,
  AudioLines,
  SpellCheck,
  ListChecks,
  CircleDot,
  Plus,
  X,
  Save,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { GlassCard } from "@/components/admin/GlassCard";

export const Route = createFileRoute("/lessons")({
  head: () => ({
    meta: [
      { title: "Редактор урока — HunMaster Admin" },
      {
        name: "description",
        content: "Конструктор уроков HunMaster: теория, словарь, видео, аудио и тесты.",
      },
      { property: "og:title", content: "Редактор урока — HunMaster Admin" },
      {
        property: "og:description",
        content: "Конструктор уроков HunMaster: теория, словарь, видео, аудио и тесты.",
      },
    ],
  }),
  component: LessonEditor,
});

const blockTypes = [
  { id: "text", label: "Текст", icon: Type },
  { id: "heading", label: "Заголовок", icon: Heading1 },
  { id: "image", label: "Изображение", icon: ImageIcon },
  { id: "video", label: "Видео", icon: Video },
  { id: "audio", label: "Аудио", icon: AudioLines },
  { id: "word", label: "Карточка слова", icon: SpellCheck },
  { id: "quiz", label: "Тест", icon: ListChecks },
  { id: "choice", label: "Multiple Choice", icon: CircleDot },
];

function Field({
  label,
  placeholder,
  textarea,
  defaultValue,
}: {
  label: string;
  placeholder: string;
  textarea?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">{label}</span>
      {textarea ? (
        <textarea
          rows={4}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className="mt-2 w-full resize-y rounded-xl border border-border bg-foreground/[0.04] px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ember/40"
        />
      ) : (
        <input
          defaultValue={defaultValue}
          placeholder={placeholder}
          className="mt-2 h-10 w-full rounded-xl border border-border bg-foreground/[0.04] px-3.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ember/40"
        />
      )}
    </label>
  );
}

function LessonEditor() {
  const [blocks, setBlocks] = useState<{ uid: number; id: string; label: string }[]>([]);
  const [uid, setUid] = useState(1);

  return (
    <AdminLayout title="Редактор урока" subtitle="Новый урок — заполните поля и добавьте блоки">
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="grid gap-4">
          <GlassCard interactive={false} className="grid gap-4 p-5">
            <Field label="Название урока" placeholder="Например: Приветствие" />
            <Field label="Описание" placeholder="Краткое описание урока" textarea />
            <Field label="Теоретический материал" placeholder="Основная теория урока" textarea />
            <Field label="Новые слова" placeholder="szia, jó napot, viszlát..." textarea />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Видео URL" placeholder="https://..." />
              <Field label="Аудио URL" placeholder="https://..." />
            </div>
            <Field label="Задания" placeholder="Опишите практические задания" textarea />
            <Field label="Тест" placeholder="Вопросы для проверки знаний" textarea />
          </GlassCard>

          <GlassCard interactive={false} className="p-5">
            <h3 className="font-display text-base font-semibold">Блоки урока</h3>
            <div className="mt-4 grid gap-2">
              <AnimatePresence initial={false}>
                {blocks.map((b) => {
                  const Icon = blockTypes.find((t) => t.id === b.id)?.icon ?? Type;
                  return (
                    <motion.div
                      key={b.uid}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="flex items-center gap-3 rounded-xl border border-border/60 bg-foreground/[0.03] px-3.5 py-3"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border text-ember">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm">{b.label}</span>
                      <button
                        onClick={() => setBlocks((p) => p.filter((x) => x.uid !== b.uid))}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {blocks.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Добавьте первый блок из палитры справа
                </p>
              )}
            </div>
          </GlassCard>
        </div>

        <GlassCard interactive={false} className="h-fit p-5">
          <h3 className="font-display text-base font-semibold">Добавить блок</h3>
          <p className="mt-1 text-xs text-muted-foreground">UI-прототип конструктора</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {blockTypes.map((t) => (
              <motion.button
                key={t.id}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  setBlocks((p) => [...p, { uid, id: t.id, label: t.label }]);
                  setUid((u) => u + 1);
                }}
                className="flex items-center gap-2 rounded-xl border border-border bg-foreground/[0.03] px-3 py-2.5 text-left text-xs font-semibold transition-colors hover:border-ember/40 hover:text-ember"
              >
                <t.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{t.label}</span>
              </motion.button>
            ))}
          </div>
          <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-ember/40 bg-[var(--gradient-ember)] px-4 py-2.5 text-sm font-semibold text-primary-foreground">
            <Save className="h-4 w-4" />
            Сохранить урок
          </button>
          <button className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <Plus className="h-4 w-4" />
            Создать новый урок
          </button>
        </GlassCard>
      </div>
    </AdminLayout>
  );
}
