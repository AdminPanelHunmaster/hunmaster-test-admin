import {
  AlignLeft,
  AudioLines,
  BetweenHorizontalEnd,
  BookOpenText,
  CheckSquare2,
  CircleDot,
  GalleryHorizontal,
  Heading,
  Image,
  Info,
  Languages,
  ListOrdered,
  Mic2,
  Pilcrow,
  SpellCheck2,
  ToggleLeft,
  Video,
} from "lucide-react";
import type { ComponentType } from "react";
import type { BlockKind } from "./lesson-blocks";

type Definition = {
  kind: BlockKind;
  label: string;
  description: string;
  category: "content" | "hungarian" | "assessment";
  icon: ComponentType<{ className?: string }>;
};

export const blockDefinitions: Definition[] = [
  {
    kind: "text",
    label: "Текст",
    description: "Rich text и списки",
    category: "content",
    icon: Pilcrow,
  },
  {
    kind: "heading",
    label: "Заголовок",
    description: "H1, H2 или H3",
    category: "content",
    icon: Heading,
  },
  {
    kind: "image",
    label: "Изображение",
    description: "URL, upload и caption",
    category: "content",
    icon: Image,
  },
  {
    kind: "video",
    label: "Видео",
    description: "YouTube, Vimeo, URL",
    category: "content",
    icon: Video,
  },
  {
    kind: "audio",
    label: "Аудио",
    description: "Player и транскрипция",
    category: "content",
    icon: AudioLines,
  },
  {
    kind: "divider",
    label: "Разделитель",
    description: "Визуальная пауза",
    category: "content",
    icon: BetweenHorizontalEnd,
  },
  {
    kind: "callout",
    label: "Callout",
    description: "Info, warning, tip",
    category: "content",
    icon: Info,
  },
  {
    kind: "vocabulary",
    label: "Слово",
    description: "Карточка венгерского слова",
    category: "hungarian",
    icon: SpellCheck2,
  },
  {
    kind: "example",
    label: "Пример",
    description: "Фраза с переводом",
    category: "hungarian",
    icon: Languages,
  },
  {
    kind: "pronunciation",
    label: "Произношение",
    description: "Транскрипция и аудио",
    category: "hungarian",
    icon: Mic2,
  },
  {
    kind: "exercise",
    label: "Упражнение",
    description: "Инструкция и подсказка",
    category: "assessment",
    icon: BookOpenText,
  },
  {
    kind: "multipleChoice",
    label: "Один ответ",
    description: "2–6 вариантов",
    category: "assessment",
    icon: CircleDot,
  },
  {
    kind: "multiSelect",
    label: "Несколько ответов",
    description: "Multi Select",
    category: "assessment",
    icon: CheckSquare2,
  },
  {
    kind: "trueFalse",
    label: "Верно / Неверно",
    description: "Бинарный вопрос",
    category: "assessment",
    icon: ToggleLeft,
  },
  {
    kind: "fillBlank",
    label: "Заполнить пропуск",
    description: "Свободный ответ",
    category: "assessment",
    icon: AlignLeft,
  },
  {
    kind: "matching",
    label: "Сопоставление",
    description: "Соединить пары",
    category: "assessment",
    icon: GalleryHorizontal,
  },
  {
    kind: "ordering",
    label: "Порядок",
    description: "Расставить элементы",
    category: "assessment",
    icon: ListOrdered,
  },
];
