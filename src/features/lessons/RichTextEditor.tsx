import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { Bold, Code2, Italic, Link2, List, ListOrdered, Quote, UnderlineIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const extensions = [
  StarterKit.configure({ heading: false }),
  Underline,
  Link.configure({ openOnClick: false, autolink: true, defaultProtocol: "https" }),
];

export function RichTextEditor({
  value,
  onChange,
  onSlash,
  placeholder = "Начните писать материал урока…",
}: {
  value: string;
  onChange: (html: string) => void;
  onSlash?: () => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    extensions,
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "lesson-rich-text min-h-28 px-4 py-3 text-[15px] leading-7 outline-none",
        "aria-label": "Текст блока",
        "data-placeholder": placeholder,
      },
      handleKeyDown: (_view, event) => {
        if (event.key === "/" && editor?.isEmpty && onSlash) {
          event.preventDefault();
          onSlash();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.getHTML()),
  });

  useEffect(() => {
    if (editor && editor.getHTML() !== value)
      editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  if (!editor) return <div className="h-28 animate-pulse rounded-xl bg-foreground/[0.04]" />;

  const setLink = () => {
    const previous = editor.getAttributes("link")["href"] as string | undefined;
    const href = window.prompt("Ссылка", previous ?? "https://");
    if (href === null) return;
    if (!href.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  };

  const controls = [
    {
      label: "Жирный",
      icon: Bold,
      active: editor.isActive("bold"),
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: "Курсив",
      icon: Italic,
      active: editor.isActive("italic"),
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: "Подчёркнутый",
      icon: UnderlineIcon,
      active: editor.isActive("underline"),
      run: () => editor.chain().focus().toggleUnderline().run(),
    },
    { label: "Ссылка", icon: Link2, active: editor.isActive("link"), run: setLink },
    {
      label: "Список",
      icon: List,
      active: editor.isActive("bulletList"),
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: "Нумерованный список",
      icon: ListOrdered,
      active: editor.isActive("orderedList"),
      run: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "Цитата",
      icon: Quote,
      active: editor.isActive("blockquote"),
      run: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      label: "Код",
      icon: Code2,
      active: editor.isActive("code"),
      run: () => editor.chain().focus().toggleCode().run(),
    },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-background/20 focus-within:border-ember/40">
      <div className="flex flex-wrap items-center gap-1 border-b border-border/60 bg-foreground/[0.025] p-1.5">
        {controls.map(({ label, icon: Icon, active, run }) => (
          <button
            key={label}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={active}
            onClick={run}
            className={cn(
              "grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/[0.07] hover:text-foreground",
              active && "bg-ember/15 text-ember",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

export function RichTextOutput({ html, className }: { html: string; className?: string }) {
  const editor = useEditor({
    extensions,
    content: html,
    editable: false,
    immediatelyRender: false,
    editorProps: { attributes: { class: cn("lesson-rich-text", className) } },
  });

  useEffect(() => {
    if (editor && editor.getHTML() !== html)
      editor.commands.setContent(html, { emitUpdate: false });
  }, [editor, html]);

  return <EditorContent editor={editor} />;
}
