import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  GripVertical,
  Loader2,
  Plus,
  Settings2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadLessonMedia } from "@/services/lessonBackend";
import type { BlockContent, EditorBlock } from "./lesson-blocks";
import { blockDefinitions } from "./block-definitions";
import { RichTextEditor } from "./RichTextEditor";

const inputClass =
  "h-10 w-full rounded-xl border border-border/70 bg-background/25 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ember/40";
const textareaClass =
  "min-h-24 w-full resize-y rounded-xl border border-border/70 bg-background/25 px-3 py-2.5 text-sm leading-6 outline-none transition-colors placeholder:text-muted-foreground focus:border-ember/40";

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={`mt-2 ${inputClass}`}
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={`mt-2 ${textareaClass}`}
    />
  );
}

function MediaUpload({
  courseId,
  accept,
  onUploaded,
}: {
  courseId: string;
  accept: string;
  onUploaded: (data: { url: string; storagePath: string }) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-ember/30 hover:text-foreground">
        {uploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="h-3.5 w-3.5" />
        )}
        {uploading ? "Загрузка…" : "Загрузить файл"}
        <input
          type="file"
          accept={accept}
          disabled={uploading || !courseId}
          className="sr-only"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setUploading(true);
            setError(null);
            try {
              onUploaded(await uploadLessonMedia(file, courseId));
            } catch (uploadError) {
              setError(uploadError instanceof Error ? uploadError.message : "Ошибка загрузки.");
            } finally {
              setUploading(false);
            }
          }}
        />
      </label>
      <span className="text-[11px] text-muted-foreground">
        Private bucket · protected signed URL
      </span>
      {error && <span className="w-full text-xs text-destructive">{error}</span>}
    </div>
  );
}

function OptionEditor({
  content,
  onChange,
  multi,
}: {
  content: Extract<BlockContent, { kind: "multipleChoice" | "multiSelect" }>;
  onChange: (content: BlockContent) => void;
  multi: boolean;
}) {
  return (
    <div className="grid gap-2">
      {content.options.map((option, index) => {
        const checked = multi
          ? (content as Extract<BlockContent, { kind: "multiSelect" }>).correctOptionIds.includes(
              option.id,
            )
          : (content as Extract<BlockContent, { kind: "multipleChoice" }>).correctOptionId ===
            option.id;
        return (
          <div key={option.id} className="flex items-center gap-2">
            <button
              type="button"
              title="Отметить как правильный"
              onClick={() => {
                if (content.kind === "multiSelect") {
                  const ids = content.correctOptionIds.includes(option.id)
                    ? content.correctOptionIds.filter((id) => id !== option.id)
                    : [...content.correctOptionIds, option.id];
                  onChange({ ...content, correctOptionIds: ids });
                } else onChange({ ...content, correctOptionId: option.id });
              }}
              className={cn(
                "grid h-9 w-9 shrink-0 place-items-center rounded-lg border",
                checked
                  ? "border-jade/40 bg-jade/10 text-jade"
                  : "border-border text-muted-foreground",
              )}
            >
              {checked ? (
                <Check className="h-4 w-4" />
              ) : (
                <span className="text-xs">{index + 1}</span>
              )}
            </button>
            <input
              value={option.text}
              onChange={(event) =>
                onChange({
                  ...content,
                  options: content.options.map((item) =>
                    item.id === option.id ? { ...item, text: event.target.value } : item,
                  ),
                } as BlockContent)
              }
              placeholder={`Вариант ${index + 1}`}
              className={inputClass}
            />
            <button
              type="button"
              disabled={content.options.length <= 2}
              onClick={() =>
                onChange({
                  ...content,
                  options: content.options.filter((item) => item.id !== option.id),
                } as BlockContent)
              }
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
      {content.options.length < 6 && (
        <button
          type="button"
          onClick={() =>
            onChange({
              ...content,
              options: [...content.options, { id: crypto.randomUUID(), text: "" }],
            } as BlockContent)
          }
          className="mt-1 flex h-9 items-center justify-center gap-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-ember/30 hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          Добавить вариант
        </button>
      )}
    </div>
  );
}

function BlockFields({
  block,
  courseId,
  onChange,
  onSlash,
}: {
  block: EditorBlock;
  courseId: string;
  onChange: (content: BlockContent) => void;
  onSlash: () => void;
}) {
  const content = block.content;
  switch (content.kind) {
    case "text":
      return (
        <RichTextEditor
          value={content.html}
          onChange={(html) => onChange({ ...content, html })}
          onSlash={onSlash}
        />
      );
    case "heading":
      return (
        <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
          <Field label="Уровень">
            <select
              value={content.level}
              onChange={(event) =>
                onChange({ ...content, level: Number(event.target.value) as 1 | 2 | 3 })
              }
              className={`mt-2 ${inputClass}`}
            >
              <option value={1}>H1</option>
              <option value={2}>H2</option>
              <option value={3}>H3</option>
            </select>
          </Field>
          <Field label="Текст">
            <TextInput
              value={content.text}
              onChange={(text) => onChange({ ...content, text })}
              placeholder="Заголовок раздела"
            />
          </Field>
        </div>
      );
    case "image":
      return (
        <div className="grid gap-3">
          <Field label="Image URL">
            <TextInput
              value={content.url}
              onChange={(url) => onChange({ ...content, url })}
              placeholder="https://…"
            />
            <MediaUpload
              courseId={courseId}
              accept="image/*"
              onUploaded={(media) => onChange({ ...content, ...media })}
            />
          </Field>
          {content.url && (
            <img
              src={content.url}
              alt="Preview"
              className="max-h-48 rounded-xl border border-border/60 object-cover"
            />
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Alt text">
              <TextInput
                value={content.alt}
                onChange={(alt) => onChange({ ...content, alt })}
                placeholder="Что изображено"
              />
            </Field>
            <Field label="Caption">
              <TextInput
                value={content.caption}
                onChange={(caption) => onChange({ ...content, caption })}
                placeholder="Подпись"
              />
            </Field>
            <Field label="Ширина">
              <select
                value={content.width}
                onChange={(event) =>
                  onChange({ ...content, width: event.target.value as typeof content.width })
                }
                className={`mt-2 ${inputClass}`}
              >
                <option value="small">Маленькая</option>
                <option value="medium">Средняя</option>
                <option value="full">На всю ширину</option>
              </select>
            </Field>
            <Field label="Выравнивание">
              <select
                value={content.alignment}
                onChange={(event) =>
                  onChange({
                    ...content,
                    alignment: event.target.value as typeof content.alignment,
                  })
                }
                className={`mt-2 ${inputClass}`}
              >
                <option value="left">Слева</option>
                <option value="center">По центру</option>
                <option value="right">Справа</option>
              </select>
            </Field>
          </div>
        </div>
      );
    case "video":
      return (
        <div className="grid gap-3">
          <Field label="Video URL" hint="YouTube, Vimeo или прямой URL">
            <TextInput
              value={content.url}
              onChange={(url) => onChange({ ...content, url })}
              placeholder="https://youtube.com/watch?v=…"
            />
          </Field>
          <Field label="Caption">
            <TextInput
              value={content.caption}
              onChange={(caption) => onChange({ ...content, caption })}
              placeholder="Подпись к видео"
            />
          </Field>
        </div>
      );
    case "audio":
      return (
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Название">
              <TextInput
                value={content.title}
                onChange={(title) => onChange({ ...content, title })}
                placeholder="Диалог 1"
              />
            </Field>
            <Field label="Audio URL">
              <TextInput
                value={content.url}
                onChange={(url) => onChange({ ...content, url })}
                placeholder="https://…"
              />
              <MediaUpload
                courseId={courseId}
                accept="audio/*"
                onUploaded={(media) => onChange({ ...content, ...media })}
              />
            </Field>
          </div>
          <Field label="Транскрипция">
            <TextArea
              value={content.transcription}
              onChange={(transcription) => onChange({ ...content, transcription })}
              placeholder="Текст аудиозаписи (опционально)"
            />
          </Field>
        </div>
      );
    case "divider":
      return (
        <Field label="Стиль линии">
          <select
            value={content.style}
            onChange={(event) =>
              onChange({ ...content, style: event.target.value as typeof content.style })
            }
            className={`mt-2 ${inputClass}`}
          >
            <option value="solid">Сплошная</option>
            <option value="dashed">Пунктир</option>
          </select>
        </Field>
      );
    case "callout":
      return (
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
            <Field label="Тип">
              <select
                value={content.tone}
                onChange={(event) =>
                  onChange({ ...content, tone: event.target.value as typeof content.tone })
                }
                className={`mt-2 ${inputClass}`}
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="tip">Tip</option>
                <option value="important">Important</option>
              </select>
            </Field>
            <Field label="Заголовок">
              <TextInput
                value={content.title}
                onChange={(title) => onChange({ ...content, title })}
                placeholder="Обратите внимание"
              />
            </Field>
          </div>
          <Field label="Текст">
            <TextArea value={content.text} onChange={(text) => onChange({ ...content, text })} />
          </Field>
        </div>
      );
    case "vocabulary":
      return (
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Венгерское слово">
              <TextInput
                value={content.word}
                onChange={(word) => onChange({ ...content, word })}
                placeholder="Szia"
              />
            </Field>
            <Field label="Транскрипция">
              <TextInput
                value={content.transcription}
                onChange={(transcription) => onChange({ ...content, transcription })}
                placeholder="ˈsiɒ"
              />
            </Field>
            <Field label="Перевод">
              <TextInput
                value={content.translation}
                onChange={(translation) => onChange({ ...content, translation })}
                placeholder="Привет"
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Пример">
              <TextArea
                value={content.example}
                onChange={(example) => onChange({ ...content, example })}
                placeholder="Szia, Anna!"
                rows={2}
              />
            </Field>
            <Field label="Перевод примера">
              <TextArea
                value={content.exampleTranslation}
                onChange={(exampleTranslation) => onChange({ ...content, exampleTranslation })}
                placeholder="Привет, Анна!"
                rows={2}
              />
            </Field>
            <Field label="Audio URL">
              <TextInput
                value={content.audioUrl}
                onChange={(audioUrl) => onChange({ ...content, audioUrl })}
                placeholder="https://…"
              />
            </Field>
            <Field label="Категория">
              <TextInput
                value={content.category}
                onChange={(category) => onChange({ ...content, category })}
                placeholder="Приветствия"
              />
            </Field>
          </div>
        </div>
      );
    case "example":
      return (
        <div className="grid gap-3">
          <Field label="Венгерский">
            <TextArea
              value={content.hungarian}
              onChange={(hungarian) => onChange({ ...content, hungarian })}
              rows={2}
            />
          </Field>
          <Field label="Перевод">
            <TextArea
              value={content.translation}
              onChange={(translation) => onChange({ ...content, translation })}
              rows={2}
            />
          </Field>
          <Field label="Комментарий">
            <TextInput value={content.note} onChange={(note) => onChange({ ...content, note })} />
          </Field>
        </div>
      );
    case "pronunciation":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Слово / фраза">
            <TextInput value={content.text} onChange={(text) => onChange({ ...content, text })} />
          </Field>
          <Field label="Транскрипция">
            <TextInput
              value={content.transcription}
              onChange={(transcription) => onChange({ ...content, transcription })}
            />
          </Field>
          <Field label="Audio URL">
            <TextInput
              value={content.audioUrl}
              onChange={(audioUrl) => onChange({ ...content, audioUrl })}
              placeholder="https://…"
            />
          </Field>
          <Field label="Подсказка">
            <TextInput value={content.hint} onChange={(hint) => onChange({ ...content, hint })} />
          </Field>
        </div>
      );
    case "exercise":
      return (
        <div className="grid gap-3">
          <Field label="Название">
            <TextInput
              value={content.title}
              onChange={(title) => onChange({ ...content, title })}
            />
          </Field>
          <Field label="Инструкция">
            <TextArea
              value={content.instruction}
              onChange={(instruction) => onChange({ ...content, instruction })}
            />
          </Field>
          <Field label="Подсказка к ответу">
            <TextArea
              value={content.answerHint}
              onChange={(answerHint) => onChange({ ...content, answerHint })}
              rows={2}
            />
          </Field>
        </div>
      );
    case "multipleChoice":
    case "multiSelect":
      return (
        <div className="grid gap-3">
          <Field label="Вопрос">
            <TextArea
              value={content.question}
              onChange={(question) => onChange({ ...content, question } as BlockContent)}
              rows={2}
            />
          </Field>
          <Field
            label={
              content.kind === "multiSelect"
                ? "Варианты · отметьте правильные"
                : "Варианты · отметьте правильный"
            }
          >
            <div className="mt-2">
              <OptionEditor
                content={content}
                onChange={onChange}
                multi={content.kind === "multiSelect"}
              />
            </div>
          </Field>
          <div className="grid gap-3 sm:grid-cols-[1fr_110px]">
            <Field label="Объяснение">
              <TextArea
                value={content.explanation}
                onChange={(explanation) => onChange({ ...content, explanation } as BlockContent)}
                rows={2}
              />
            </Field>
            <Field label="Баллы">
              <input
                type="number"
                min={0}
                max={1000}
                value={content.points}
                onChange={(event) =>
                  onChange({ ...content, points: Number(event.target.value) } as BlockContent)
                }
                className={`mt-2 ${inputClass}`}
              />
            </Field>
          </div>
        </div>
      );
    case "trueFalse":
      return (
        <div className="grid gap-3">
          <Field label="Утверждение">
            <TextArea
              value={content.statement}
              onChange={(statement) => onChange({ ...content, statement })}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Правильный ответ">
              <select
                value={String(content.correct)}
                onChange={(event) =>
                  onChange({ ...content, correct: event.target.value === "true" })
                }
                className={`mt-2 ${inputClass}`}
              >
                <option value="true">Верно</option>
                <option value="false">Неверно</option>
              </select>
            </Field>
            <Field label="Баллы">
              <input
                type="number"
                min={0}
                max={1000}
                value={content.points}
                onChange={(event) => onChange({ ...content, points: Number(event.target.value) })}
                className={`mt-2 ${inputClass}`}
              />
            </Field>
          </div>
          <Field label="Объяснение">
            <TextArea
              value={content.explanation}
              onChange={(explanation) => onChange({ ...content, explanation })}
              rows={2}
            />
          </Field>
        </div>
      );
    case "fillBlank":
      return (
        <div className="grid gap-3">
          <Field label="Текст с пропуском" hint="Используйте ___ для обозначения пропуска">
            <TextArea
              value={content.text}
              onChange={(text) => onChange({ ...content, text })}
              placeholder="Jó ___!"
              rows={2}
            />
          </Field>
          <Field label="Допустимые ответы">
            <div className="mt-2 grid gap-2">
              {content.answers.map((answer, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    value={answer}
                    onChange={(event) =>
                      onChange({
                        ...content,
                        answers: content.answers.map((item, answerIndex) =>
                          answerIndex === index ? event.target.value : item,
                        ),
                      })
                    }
                    className={inputClass}
                  />
                  <button
                    type="button"
                    disabled={content.answers.length <= 1}
                    onClick={() =>
                      onChange({
                        ...content,
                        answers: content.answers.filter((_, answerIndex) => answerIndex !== index),
                      })
                    }
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-muted-foreground hover:text-destructive disabled:opacity-30"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {content.answers.length < 12 && (
                <button
                  type="button"
                  onClick={() => onChange({ ...content, answers: [...content.answers, ""] })}
                  className="h-9 rounded-lg border border-dashed border-border text-xs text-muted-foreground"
                >
                  <Plus className="mr-1 inline h-3.5 w-3.5" />
                  Добавить ответ
                </button>
              )}
            </div>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Подсказка">
              <TextInput value={content.hint} onChange={(hint) => onChange({ ...content, hint })} />
            </Field>
            <Field label="Объяснение">
              <TextInput
                value={content.explanation}
                onChange={(explanation) => onChange({ ...content, explanation })}
              />
            </Field>
          </div>
        </div>
      );
    case "matching":
      return (
        <div className="grid gap-3">
          <Field label="Инструкция">
            <TextInput
              value={content.instruction}
              onChange={(instruction) => onChange({ ...content, instruction })}
              placeholder="Соедините слова и переводы"
            />
          </Field>
          <Field label="Пары">
            <div className="mt-2 grid gap-2">
              {content.pairs.map((pair, index) => (
                <div
                  key={pair.id}
                  className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2"
                >
                  <input
                    value={pair.left}
                    onChange={(event) =>
                      onChange({
                        ...content,
                        pairs: content.pairs.map((item) =>
                          item.id === pair.id ? { ...item, left: event.target.value } : item,
                        ),
                      })
                    }
                    placeholder="Szia"
                    className={inputClass}
                  />
                  <span className="text-ember">↔</span>
                  <input
                    value={pair.right}
                    onChange={(event) =>
                      onChange({
                        ...content,
                        pairs: content.pairs.map((item) =>
                          item.id === pair.id ? { ...item, right: event.target.value } : item,
                        ),
                      })
                    }
                    placeholder="Привет"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    disabled={content.pairs.length <= 2}
                    onClick={() =>
                      onChange({
                        ...content,
                        pairs: content.pairs.filter((item) => item.id !== pair.id),
                      })
                    }
                    className="grid h-9 w-9 place-items-center text-muted-foreground hover:text-destructive disabled:opacity-30"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {content.pairs.length < 12 && (
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...content,
                      pairs: [...content.pairs, { id: crypto.randomUUID(), left: "", right: "" }],
                    })
                  }
                  className="h-9 rounded-lg border border-dashed border-border text-xs text-muted-foreground"
                >
                  <Plus className="mr-1 inline h-3.5 w-3.5" />
                  Добавить пару
                </button>
              )}
            </div>
          </Field>
        </div>
      );
    case "ordering":
      return (
        <div className="grid gap-3">
          <Field label="Инструкция">
            <TextInput
              value={content.instruction}
              onChange={(instruction) => onChange({ ...content, instruction })}
              placeholder="Расставьте слова в правильном порядке"
            />
          </Field>
          <Field label="Правильный порядок">
            <div className="mt-2 grid gap-2">
              {content.items.map((item, index) => (
                <div key={item.id} className="flex items-center gap-2">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-xs text-ember">
                    {index + 1}
                  </span>
                  <input
                    value={item.text}
                    onChange={(event) =>
                      onChange({
                        ...content,
                        items: content.items.map((row) =>
                          row.id === item.id ? { ...row, text: event.target.value } : row,
                        ),
                      })
                    }
                    className={inputClass}
                  />
                  <button
                    type="button"
                    disabled={content.items.length <= 2}
                    onClick={() =>
                      onChange({
                        ...content,
                        items: content.items.filter((row) => row.id !== item.id),
                      })
                    }
                    className="grid h-9 w-9 place-items-center text-muted-foreground hover:text-destructive disabled:opacity-30"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {content.items.length < 12 && (
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...content,
                      items: [...content.items, { id: crypto.randomUUID(), text: "" }],
                    })
                  }
                  className="h-9 rounded-lg border border-dashed border-border text-xs text-muted-foreground"
                >
                  <Plus className="mr-1 inline h-3.5 w-3.5" />
                  Добавить элемент
                </button>
              )}
            </div>
          </Field>
        </div>
      );
  }
}

export function LessonBlockEditor({
  block,
  index,
  total,
  courseId,
  selected,
  onSelect,
  onChange,
  onDuplicate,
  onDelete,
  onMove,
  onOpenPalette,
}: {
  block: EditorBlock;
  index: number;
  total: number;
  courseId: string;
  selected: boolean;
  onSelect: () => void;
  onChange: (content: BlockContent) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
  onOpenPalette: () => void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const sortable = useSortable({ id: block.id });
  const definition = blockDefinitions.find((item) => item.kind === block.content.kind)!;
  const Icon = definition.icon;
  return (
    <article
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
      }}
      onClick={onSelect}
      className={cn(
        "group relative rounded-2xl border bg-[linear-gradient(145deg,color-mix(in_oklab,var(--card)_88%,transparent),color-mix(in_oklab,var(--background)_72%,transparent))] p-4 shadow-[0_20px_50px_-38px_rgba(0,0,0,.9)] transition-[border-color,box-shadow] sm:p-5",
        selected
          ? "border-ember/45 shadow-[0_20px_55px_-34px_color-mix(in_oklab,var(--ember)_35%,transparent)]"
          : "border-border/70 hover:border-border",
      )}
    >
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          aria-label="Перетащить блок"
          title="Перетащить"
          {...sortable.attributes}
          {...sortable.listeners}
          className="grid h-8 w-8 cursor-grab place-items-center rounded-lg text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-foreground/[0.035] text-ember">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold">{definition.label}</p>
          <p className="text-[10px] text-muted-foreground">Блок {index + 1}</p>
        </div>
        <div
          className={cn(
            "flex items-center gap-0.5 transition-opacity",
            selected
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
          )}
        >
          <button
            type="button"
            title="Вверх"
            disabled={index === 0}
            onClick={(event) => {
              event.stopPropagation();
              onMove(-1);
            }}
            className="block-control"
          >
            <ArrowUp />
          </button>
          <button
            type="button"
            title="Вниз"
            disabled={index === total - 1}
            onClick={(event) => {
              event.stopPropagation();
              onMove(1);
            }}
            className="block-control"
          >
            <ArrowDown />
          </button>
          <button
            type="button"
            title="Дублировать"
            onClick={(event) => {
              event.stopPropagation();
              onDuplicate();
            }}
            className="block-control"
          >
            <Copy />
          </button>
          <button
            type="button"
            title="Настройки"
            aria-pressed={settingsOpen}
            onClick={(event) => {
              event.stopPropagation();
              setSettingsOpen((open) => !open);
            }}
            className={cn("block-control", settingsOpen && "text-ember")}
          >
            <Settings2 />
          </button>
          <button
            type="button"
            title="Удалить"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            className="block-control hover:!text-destructive"
          >
            <Trash2 />
          </button>
        </div>
      </div>
      <BlockFields block={block} courseId={courseId} onChange={onChange} onSlash={onOpenPalette} />
      {settingsOpen && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/20 px-3 py-2 text-[11px] text-muted-foreground">
          <span>
            Typed content: <strong className="text-foreground">{block.content.kind}</strong>
          </span>
          <span>
            DB type: <strong className="text-foreground">{block.type}</strong> · position {index}
          </span>
        </div>
      )}
    </article>
  );
}
