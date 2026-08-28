import { describe, expect, it } from "vitest";
import {
  blockContentSchema,
  databaseTypeForKind,
  defaultContent,
  normalizePositions,
  parseBlockContent,
  serializeBlockContent,
  slugify,
  type EditorBlock,
} from "./lesson-blocks";

describe("lesson block schema", () => {
  it("creates and validates every production block kind", () => {
    const kinds = [
      "text",
      "heading",
      "image",
      "video",
      "audio",
      "divider",
      "callout",
      "vocabulary",
      "example",
      "pronunciation",
      "exercise",
      "multipleChoice",
      "multiSelect",
      "trueFalse",
      "fillBlank",
      "matching",
      "ordering",
    ] as const;

    for (const kind of kinds) {
      expect(blockContentSchema.safeParse(defaultContent(kind)).success, kind).toBe(true);
    }
  });

  it("maps advanced blocks onto the established Learn-compatible enum", () => {
    expect(databaseTypeForKind("matching")).toBe("quiz");
    expect(databaseTypeForKind("callout")).toBe("text");
    expect(databaseTypeForKind("pronunciation")).toBe("audio");
    expect(databaseTypeForKind("vocabulary")).toBe("vocabulary");
  });

  it("serializes vocabulary with the legacy items contract used by Learn", () => {
    const serialized = serializeBlockContent({
      kind: "vocabulary",
      word: "Szia",
      transcription: "ˈsiɒ",
      translation: "Привет",
      example: "Szia, Anna!",
      exampleTranslation: "Привет, Анна!",
      audioUrl: "",
      category: "Приветствия",
    });
    expect(serialized).toMatchObject({
      kind: "vocabulary",
      items: [{ hu: "Szia", ru: "Привет" }],
    });
  });

  it("recovers a legacy quiz row as a typed multiple choice block", () => {
    const parsed = parseBlockContent("quiz", {
      prompt: "Как переводится Szia?",
      options: ["Привет", "Спасибо"],
    });
    expect(parsed.kind).toBe("multipleChoice");
    if (parsed.kind === "multipleChoice") expect(parsed.options).toHaveLength(2);
  });

  it("normalizes persisted positions after reorder", () => {
    const blocks = [0, 1, 2].map((position) => ({
      id: crypto.randomUUID(),
      type: "text" as const,
      content: { kind: "text" as const, html: `<p>${position}</p>` },
      position: 99,
    })) satisfies EditorBlock[];
    expect(
      normalizePositions([blocks[2]!, blocks[0]!, blocks[1]!]).map((block) => block.position),
    ).toEqual([0, 1, 2]);
  });

  it("creates a safe URL slug", () => {
    expect(slugify("  Lesson Editor — A1 / Hello!  ")).toBe("lesson-editor-a1-hello");
  });
});
