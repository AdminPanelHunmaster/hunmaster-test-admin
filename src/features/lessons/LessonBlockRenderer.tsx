import { useState } from "react";
import { AlertTriangle, CheckCircle2, Info, Lightbulb, Link2, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BlockContent, EditorBlock } from "./lesson-blocks";
import { RichTextOutput } from "./RichTextEditor";

function embedVideoUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.hostname.includes("youtube.com")) {
      const id = url.searchParams.get("v");
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (url.hostname === "youtu.be")
      return `https://www.youtube-nocookie.com/embed/${url.pathname.slice(1)}`;
    if (url.hostname.includes("vimeo.com")) {
      const id = url.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

function Callout({ content }: { content: Extract<BlockContent, { kind: "callout" }> }) {
  const config = {
    info: {
      icon: Info,
      label: "Информация",
      color: "border-sky-400/25 bg-sky-400/[0.07] text-sky-200",
    },
    warning: {
      icon: AlertTriangle,
      label: "Внимание",
      color: "border-amber-400/25 bg-amber-400/[0.07] text-amber-100",
    },
    tip: { icon: Lightbulb, label: "Совет", color: "border-jade/25 bg-jade/[0.07] text-jade" },
    important: {
      icon: CheckCircle2,
      label: "Важно",
      color: "border-ember/30 bg-ember/[0.08] text-ember",
    },
  }[content.tone];
  const Icon = config.icon;
  return (
    <div className={cn("rounded-2xl border p-5", config.color)}>
      <div className="flex gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="text-[11px] font-bold tracking-[0.16em] uppercase opacity-75">
            {config.label}
          </p>
          {content.title && (
            <h3 className="mt-1 font-display text-base font-semibold text-foreground">
              {content.title}
            </h3>
          )}
          {content.text && (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground/80">
              {content.text}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Assessment({
  content,
}: {
  content: Extract<
    BlockContent,
    { kind: "multipleChoice" | "multiSelect" | "trueFalse" | "fillBlank" | "matching" | "ordering" }
  >;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [answer, setAnswer] = useState("");
  const title =
    "question" in content
      ? content.question
      : "statement" in content
        ? content.statement
        : "instruction" in content
          ? content.instruction
          : "";

  if (content.kind === "fillBlank") {
    return (
      <AssessmentShell title={content.text || "Заполните пропуск"} points={content.points}>
        <input
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          placeholder={content.hint || "Введите ответ"}
          className="mt-5 h-11 w-full rounded-xl border border-border bg-background/25 px-3.5 text-sm outline-none focus:border-ember/40"
        />
      </AssessmentShell>
    );
  }

  if (content.kind === "matching") {
    return (
      <AssessmentShell title={title || "Соедините пары"} points={content.points}>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {content.pairs.map((pair) => (
            <div key={pair.id} className="contents">
              <div className="rounded-xl border border-border/70 bg-background/20 px-4 py-3 text-sm">
                {pair.left || "—"}
              </div>
              <div className="rounded-xl border border-ember/20 bg-ember/[0.05] px-4 py-3 text-sm">
                {pair.right || "—"}
              </div>
            </div>
          ))}
        </div>
      </AssessmentShell>
    );
  }

  if (content.kind === "ordering") {
    return (
      <AssessmentShell title={title || "Расставьте по порядку"} points={content.points}>
        <ol className="mt-5 grid gap-2">
          {content.items.map((item, index) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/20 px-4 py-3 text-sm"
            >
              <span className="grid h-6 w-6 place-items-center rounded-md bg-foreground/[0.07] text-xs text-ember">
                {index + 1}
              </span>
              {item.text || "Элемент"}
            </li>
          ))}
        </ol>
      </AssessmentShell>
    );
  }

  const options =
    content.kind === "trueFalse"
      ? [
          { id: "true", text: "Верно" },
          { id: "false", text: "Неверно" },
        ]
      : content.options;
  const multi = content.kind === "multiSelect";

  return (
    <AssessmentShell title={title || "Вопрос"} points={content.points}>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const active = selected.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() =>
                setSelected((current) =>
                  multi
                    ? current.includes(option.id)
                      ? current.filter((id) => id !== option.id)
                      : [...current, option.id]
                    : [option.id],
                )
              }
              className={cn(
                "rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                active
                  ? "border-ember/50 bg-ember/10 text-foreground"
                  : "border-border/70 bg-background/20 text-foreground/85 hover:border-ember/30",
              )}
            >
              {option.text || "Вариант ответа"}
            </button>
          );
        })}
      </div>
    </AssessmentShell>
  );
}

function AssessmentShell({
  title,
  points,
  children,
}: {
  title: string;
  points: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-ember/20 bg-ember/[0.035] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold tracking-[0.17em] text-ember uppercase">Задание</p>
          <h3 className="mt-2 font-display text-lg font-semibold leading-snug">{title}</h3>
        </div>
        <span className="shrink-0 rounded-lg border border-border px-2 py-1 text-[11px] text-muted-foreground">
          {points} б.
        </span>
      </div>
      {children}
    </div>
  );
}

export function LessonBlockRenderer({ block }: { block: EditorBlock }) {
  const content = block.content;
  switch (content.kind) {
    case "text":
      return (
        <RichTextOutput html={content.html} className="text-[15px] leading-7 text-foreground/90" />
      );
    case "heading": {
      const Tag = `h${content.level}` as "h1" | "h2" | "h3";
      return (
        <Tag
          className={cn(
            "font-display font-semibold tracking-tight",
            content.level === 1 ? "text-3xl" : content.level === 2 ? "text-2xl" : "text-xl",
          )}
        >
          {content.text || "Заголовок"}
        </Tag>
      );
    }
    case "image": {
      const widths = { small: "max-w-sm", medium: "max-w-2xl", full: "max-w-full" };
      const alignment = { left: "mr-auto", center: "mx-auto", right: "ml-auto" };
      return (
        <figure className={cn(widths[content.width], alignment[content.alignment])}>
          {content.url ? (
            <img
              src={content.url}
              alt={content.alt || "Иллюстрация урока"}
              className="max-h-[560px] w-full rounded-2xl border border-border/60 object-cover"
            />
          ) : (
            <div className="grid min-h-52 place-items-center rounded-2xl border border-dashed border-border bg-background/20 text-sm text-muted-foreground">
              Добавьте изображение
            </div>
          )}
          {content.caption && (
            <figcaption className="mt-2 text-center text-xs text-muted-foreground">
              {content.caption}
            </figcaption>
          )}
        </figure>
      );
    }
    case "video": {
      const embed = embedVideoUrl(content.url);
      return (
        <figure>
          {embed ? (
            <iframe
              title={content.caption || "Видео урока"}
              src={embed}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="aspect-video w-full rounded-2xl border border-border/60"
            />
          ) : content.url ? (
            <video
              controls
              src={content.url}
              className="max-h-[560px] w-full rounded-2xl border border-border/60"
            />
          ) : (
            <div className="grid aspect-video place-items-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
              Добавьте YouTube, Vimeo или direct URL
            </div>
          )}
          {content.caption && (
            <figcaption className="mt-2 text-center text-xs text-muted-foreground">
              {content.caption}
            </figcaption>
          )}
        </figure>
      );
    }
    case "audio":
      return (
        <div className="rounded-2xl border border-border/70 bg-background/20 p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-ember/10 text-ember">
              <Volume2 className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-sm font-semibold">
                {content.title || "Аудиоматериал"}
              </p>
              <p className="text-xs text-muted-foreground">Слушайте и повторяйте</p>
            </div>
          </div>
          {content.url ? (
            <audio controls src={content.url} className="mt-4 w-full" />
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Добавьте аудио URL или загрузите файл.
            </p>
          )}
          {content.transcription && (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-foreground/80">
              {content.transcription}
            </p>
          )}
        </div>
      );
    case "divider":
      return (
        <hr
          className={cn(
            "my-2 border-0 border-t border-border",
            content.style === "dashed" && "border-dashed",
          )}
        />
      );
    case "callout":
      return <Callout content={content} />;
    case "vocabulary":
      return (
        <div className="overflow-hidden rounded-2xl border border-ember/20 bg-gradient-to-br from-ember/[0.08] to-transparent p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold tracking-[0.17em] text-ember uppercase">
                {content.category || "Новое слово"}
              </p>
              <h3 className="mt-2 font-display text-3xl font-semibold">{content.word || "Szia"}</h3>
              {content.transcription && (
                <p className="mt-1 text-sm text-muted-foreground">[{content.transcription}]</p>
              )}
            </div>
            <p className="text-lg font-semibold text-foreground/90">
              {content.translation || "Перевод"}
            </p>
          </div>
          {content.example && (
            <div className="mt-5 border-t border-border/60 pt-4">
              <p className="text-sm font-medium">{content.example}</p>
              {content.exampleTranslation && (
                <p className="mt-1 text-sm text-muted-foreground">{content.exampleTranslation}</p>
              )}
            </div>
          )}
          {content.audioUrl && <audio controls src={content.audioUrl} className="mt-4 w-full" />}
        </div>
      );
    case "example":
      return (
        <div className="border-l-2 border-ember/60 py-2 pl-5">
          <p className="font-display text-lg font-semibold">
            {content.hungarian || "Пример на венгерском"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {content.translation || "Перевод примера"}
          </p>
          {content.note && <p className="mt-3 text-xs text-foreground/60">{content.note}</p>}
        </div>
      );
    case "pronunciation":
      return (
        <div className="rounded-2xl border border-jade/20 bg-jade/[0.04] p-5">
          <p className="text-[11px] font-bold tracking-[0.17em] text-jade uppercase">
            Произношение
          </p>
          <div className="mt-3 flex flex-wrap items-baseline gap-3">
            <span className="font-display text-xl font-semibold">
              {content.text || "Слово или фраза"}
            </span>
            {content.transcription && (
              <span className="text-sm text-muted-foreground">[{content.transcription}]</span>
            )}
          </div>
          {content.audioUrl && <audio controls src={content.audioUrl} className="mt-4 w-full" />}
          {content.hint && <p className="mt-3 text-sm text-foreground/75">{content.hint}</p>}
        </div>
      );
    case "exercise":
      return (
        <div className="rounded-2xl border border-border/70 bg-background/20 p-5">
          <p className="text-[11px] font-bold tracking-[0.17em] text-ember uppercase">Практика</p>
          <h3 className="mt-2 font-display text-lg font-semibold">
            {content.title || "Упражнение"}
          </h3>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground/85">
            {content.instruction || "Добавьте инструкцию."}
          </p>
          {content.answerHint && (
            <details className="mt-4 text-sm text-muted-foreground">
              <summary className="cursor-pointer select-none">
                <Link2 className="mr-1 inline h-3.5 w-3.5" />
                Подсказка
              </summary>
              <p className="mt-2 pl-5">{content.answerHint}</p>
            </details>
          )}
        </div>
      );
    default:
      return <Assessment content={content} />;
  }
}
