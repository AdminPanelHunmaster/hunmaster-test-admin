import { z } from "zod";
import type { Json, LessonBlockType } from "@/lib/supabase/database.types";

const optionalText = z.string().max(20_000).default("");
const shortText = z.string().max(500).default("");
const urlText = z.union([z.literal(""), z.string().url().max(2_000)]).default("");

const optionSchema = z.object({
  id: z.string().min(1),
  text: z.string().max(1_000).default(""),
});

const matchSchema = z.object({
  id: z.string().min(1),
  left: z.string().max(1_000).default(""),
  right: z.string().max(1_000).default(""),
});

export const blockContentSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), html: optionalText }),
  z.object({
    kind: z.literal("heading"),
    text: z.string().max(500).default(""),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
  }),
  z.object({
    kind: z.literal("image"),
    url: urlText,
    storagePath: shortText.optional(),
    alt: shortText,
    caption: shortText,
    width: z.enum(["small", "medium", "full"]).default("full"),
    alignment: z.enum(["left", "center", "right"]).default("center"),
  }),
  z.object({
    kind: z.literal("video"),
    url: urlText,
    caption: shortText,
  }),
  z.object({
    kind: z.literal("audio"),
    url: urlText,
    storagePath: shortText.optional(),
    title: shortText,
    transcription: optionalText,
  }),
  z.object({ kind: z.literal("divider"), style: z.enum(["solid", "dashed"]).default("solid") }),
  z.object({
    kind: z.literal("callout"),
    tone: z.enum(["info", "warning", "tip", "important"]).default("info"),
    title: shortText,
    text: optionalText,
  }),
  z.object({
    kind: z.literal("vocabulary"),
    word: shortText,
    transcription: shortText,
    translation: shortText,
    example: optionalText,
    exampleTranslation: optionalText,
    audioUrl: urlText,
    category: shortText,
  }),
  z.object({
    kind: z.literal("example"),
    hungarian: optionalText,
    translation: optionalText,
    note: optionalText,
  }),
  z.object({
    kind: z.literal("pronunciation"),
    text: shortText,
    transcription: shortText,
    audioUrl: urlText,
    hint: optionalText,
  }),
  z.object({
    kind: z.literal("exercise"),
    title: shortText,
    instruction: optionalText,
    answerHint: optionalText,
  }),
  z.object({
    kind: z.literal("multipleChoice"),
    question: optionalText,
    options: z.array(optionSchema).min(2).max(6),
    correctOptionId: z.string().default(""),
    explanation: optionalText,
    points: z.number().int().min(0).max(1_000).default(1),
  }),
  z.object({
    kind: z.literal("multiSelect"),
    question: optionalText,
    options: z.array(optionSchema).min(2).max(6),
    correctOptionIds: z.array(z.string()).max(6).default([]),
    explanation: optionalText,
    points: z.number().int().min(0).max(1_000).default(1),
  }),
  z.object({
    kind: z.literal("trueFalse"),
    statement: optionalText,
    correct: z.boolean().default(true),
    explanation: optionalText,
    points: z.number().int().min(0).max(1_000).default(1),
  }),
  z.object({
    kind: z.literal("fillBlank"),
    text: optionalText,
    answers: z.array(z.string().max(500)).min(1).max(12),
    hint: optionalText,
    explanation: optionalText,
    points: z.number().int().min(0).max(1_000).default(1),
  }),
  z.object({
    kind: z.literal("matching"),
    instruction: optionalText,
    pairs: z.array(matchSchema).min(2).max(12),
    explanation: optionalText,
    points: z.number().int().min(0).max(1_000).default(1),
  }),
  z.object({
    kind: z.literal("ordering"),
    instruction: optionalText,
    items: z.array(optionSchema).min(2).max(12),
    explanation: optionalText,
    points: z.number().int().min(0).max(1_000).default(1),
  }),
]);

export type BlockContent = z.infer<typeof blockContentSchema>;
export type BlockKind = BlockContent["kind"];

export type EditorBlock = {
  id: string;
  type: LessonBlockType;
  content: BlockContent;
  position: number;
};

export const lessonDraftSchema = z.object({
  id: z.string().uuid().nullable(),
  courseId: z.string().uuid("Выберите курс."),
  sectionId: z.string().uuid().nullable(),
  title: z.string().trim().min(1, "Название урока обязательно.").max(240),
  slug: z
    .string()
    .trim()
    .min(1, "Slug обязателен.")
    .max(240)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Используйте латиницу, цифры и дефисы."),
  description: z.string().max(2_000).default(""),
  position: z.number().int().min(0).max(100_000),
  status: z.enum(["draft", "published"]),
  videoUrl: urlText,
  content: z.record(z.string(), z.unknown()).default({}),
});

export type LessonDraft = z.infer<typeof lessonDraftSchema>;

const option = (text = "") => ({ id: crypto.randomUUID(), text });
const pair = () => ({ id: crypto.randomUUID(), left: "", right: "" });

export function defaultContent(kind: BlockKind): BlockContent {
  switch (kind) {
    case "text":
      return { kind, html: "<p></p>" };
    case "heading":
      return { kind, text: "", level: 2 };
    case "image":
      return { kind, url: "", alt: "", caption: "", width: "full", alignment: "center" };
    case "video":
      return { kind, url: "", caption: "" };
    case "audio":
      return { kind, url: "", title: "", transcription: "" };
    case "divider":
      return { kind, style: "solid" };
    case "callout":
      return { kind, tone: "info", title: "", text: "" };
    case "vocabulary":
      return {
        kind,
        word: "",
        transcription: "",
        translation: "",
        example: "",
        exampleTranslation: "",
        audioUrl: "",
        category: "",
      };
    case "example":
      return { kind, hungarian: "", translation: "", note: "" };
    case "pronunciation":
      return { kind, text: "", transcription: "", audioUrl: "", hint: "" };
    case "exercise":
      return { kind, title: "", instruction: "", answerHint: "" };
    case "multipleChoice": {
      const first = option();
      return {
        kind,
        question: "",
        options: [first, option()],
        correctOptionId: first.id,
        explanation: "",
        points: 1,
      };
    }
    case "multiSelect": {
      const first = option();
      return {
        kind,
        question: "",
        options: [first, option()],
        correctOptionIds: [first.id],
        explanation: "",
        points: 1,
      };
    }
    case "trueFalse":
      return { kind, statement: "", correct: true, explanation: "", points: 1 };
    case "fillBlank":
      return { kind, text: "", answers: [""], hint: "", explanation: "", points: 1 };
    case "matching":
      return { kind, instruction: "", pairs: [pair(), pair()], explanation: "", points: 1 };
    case "ordering":
      return {
        kind,
        instruction: "",
        items: [option(), option()],
        explanation: "",
        points: 1,
      };
  }
}

export function databaseTypeForKind(kind: BlockKind): LessonBlockType {
  switch (kind) {
    case "multipleChoice":
    case "multiSelect":
    case "trueFalse":
    case "fillBlank":
    case "matching":
    case "ordering":
      return "quiz";
    case "divider":
    case "callout":
    case "example":
      return "text";
    case "pronunciation":
      return "audio";
    default:
      return kind;
  }
}

function legacyContent(type: LessonBlockType, value: Record<string, unknown>): BlockContent {
  const text = typeof value["text"] === "string" ? value["text"] : "";
  const body = typeof value["body"] === "string" ? value["body"] : text;
  const title = typeof value["title"] === "string" ? value["title"] : "";
  const url =
    typeof value["url"] === "string"
      ? value["url"]
      : typeof value["src"] === "string"
        ? value["src"]
        : "";
  switch (type) {
    case "heading":
      return { kind: "heading", text: title || body, level: 2 };
    case "image":
      return { kind: "image", url, alt: title, caption: body, width: "full", alignment: "center" };
    case "video":
      return { kind: "video", url, caption: body };
    case "audio":
      return { kind: "audio", url, title, transcription: body };
    case "vocabulary": {
      const item =
        Array.isArray(value["items"]) && value["items"][0] && typeof value["items"][0] === "object"
          ? (value["items"][0] as Record<string, unknown>)
          : value;
      return {
        kind: "vocabulary",
        word: typeof item["hu"] === "string" ? item["hu"] : "",
        transcription: typeof item["transcription"] === "string" ? item["transcription"] : "",
        translation:
          typeof item["ru"] === "string"
            ? item["ru"]
            : typeof item["translation"] === "string"
              ? item["translation"]
              : "",
        example: "",
        exampleTranslation: "",
        audioUrl: "",
        category: "",
      };
    }
    case "exercise":
      return { kind: "exercise", title, instruction: body, answerHint: "" };
    case "quiz": {
      const rawOptions = Array.isArray(value["options"]) ? value["options"].slice(0, 6) : ["", ""];
      const options = rawOptions.map((item) => option(String(item)));
      while (options.length < 2) options.push(option());
      return {
        kind: "multipleChoice",
        question: typeof value["prompt"] === "string" ? value["prompt"] : title,
        options,
        correctOptionId: options[0]!.id,
        explanation: body,
        points: 1,
      };
    }
    default:
      return { kind: "text", html: body ? `<p>${escapeHtml(body)}</p>` : "<p></p>" };
  }
}

export function parseBlockContent(type: LessonBlockType, content: Json): BlockContent {
  const value =
    content && typeof content === "object" && !Array.isArray(content)
      ? (content as Record<string, unknown>)
      : {};
  const parsed = blockContentSchema.safeParse(value);
  return parsed.success ? parsed.data : legacyContent(type, value);
}

export function serializeBlockContent(content: BlockContent): Json {
  const parsed = blockContentSchema.parse(content);
  if (parsed.kind === "vocabulary") {
    return {
      ...parsed,
      title: parsed.word,
      body: parsed.example,
      items: [
        {
          hu: parsed.word,
          ru: parsed.translation,
          transcription: parsed.transcription,
          example: parsed.example,
          exampleTranslation: parsed.exampleTranslation,
          audioUrl: parsed.audioUrl,
          category: parsed.category,
        },
      ],
    } as Json;
  }
  if (parsed.kind === "heading") return { ...parsed, title: parsed.text, body: "" } as Json;
  if (parsed.kind === "text")
    return {
      ...parsed,
      title: "Материал урока",
      body: stripHtml(parsed.html),
      text: stripHtml(parsed.html),
    } as Json;
  if (parsed.kind === "image")
    return { ...parsed, title: parsed.alt || "Изображение", body: parsed.caption } as Json;
  if (parsed.kind === "video") return { ...parsed, title: "Видео", body: parsed.caption } as Json;
  if (parsed.kind === "audio") return { ...parsed, body: parsed.transcription } as Json;
  if (parsed.kind === "exercise")
    return { ...parsed, prompt: parsed.instruction, body: parsed.answerHint } as Json;
  if (parsed.kind === "callout") return { ...parsed, body: parsed.text } as Json;
  if (parsed.kind === "example")
    return {
      ...parsed,
      title: "Пример",
      body: `${parsed.hungarian}\n${parsed.translation}`.trim(),
    } as Json;
  if (parsed.kind === "pronunciation")
    return {
      ...parsed,
      title: parsed.text || "Произношение",
      url: parsed.audioUrl,
      body: parsed.hint,
    } as Json;
  if (parsed.kind === "multipleChoice" || parsed.kind === "multiSelect")
    return {
      ...parsed,
      title: "Задание",
      prompt: parsed.question,
      body: parsed.explanation,
      options: parsed.options.map((item) => item.text),
    } as Json;
  if (parsed.kind === "trueFalse")
    return {
      ...parsed,
      title: "Задание",
      prompt: parsed.statement,
      body: parsed.explanation,
      options: ["Верно", "Неверно"],
    } as Json;
  if (parsed.kind === "fillBlank")
    return {
      ...parsed,
      title: "Задание",
      prompt: parsed.text,
      body: parsed.explanation,
      options: parsed.answers,
    } as Json;
  if (parsed.kind === "matching")
    return {
      ...parsed,
      title: "Задание",
      prompt: parsed.instruction,
      body: parsed.explanation,
      options: parsed.pairs.map((item) => `${item.left} — ${item.right}`),
    } as Json;
  if (parsed.kind === "ordering")
    return {
      ...parsed,
      title: "Задание",
      prompt: parsed.instruction,
      body: parsed.explanation,
      options: parsed.items.map((item) => item.text),
    } as Json;
  return parsed as Json;
}

export function createEditorBlock(kind: BlockKind, position: number): EditorBlock {
  return {
    id: crypto.randomUUID(),
    type: databaseTypeForKind(kind),
    content: defaultContent(kind),
    position,
  };
}

export function normalizePositions(blocks: EditorBlock[]): EditorBlock[] {
  return blocks.map((block, position) => ({ ...block, position }));
}

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 220);
}

export function stripHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[char]!,
  );
}
