import { useEffect, useRef } from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { FontFamily } from "@tiptap/extension-font-family";
import Placeholder from "@tiptap/extension-placeholder";

import { cn } from "@/lib/utils";
import { MathInline } from "./extensions/MathInline";
import { MathDisplay } from "./extensions/MathDisplay";
import { FontSize } from "./extensions/FontSize";
import { IndentParagraph } from "./extensions/IndentParagraph";
import {
  normalizeHtmlForTiptap,
  serializeMathPlaceholders,
} from "./extensions/mathTokenizer";
import { cleanPastedHtml } from "./extensions/wordPasteCleaner";

interface TiptapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  onMarkHeading?: (text: string) => void;
  readOnly?: boolean;
}

/** Window-level registry so the toolbar can find the active editor. */
declare global {
  // eslint-disable-next-line no-var
  var __activeTiptapEditor: Editor | null | undefined;
}

const buildExtensions = (placeholder: string) => [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    // Built-in history is included; that replaces the old 50-state stack.
  }),
  Underline,
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
  FontFamily,
  TextAlign.configure({ types: ["paragraph", "heading"] }),
  Link.configure({ openOnClick: false, autolink: false }),
  Image.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        "data-latex": {
          default: null,
          parseHTML: (el) => (el as HTMLElement).getAttribute("data-latex"),
          renderHTML: (attrs) =>
            attrs["data-latex"] ? { "data-latex": attrs["data-latex"] } : {},
        },
      };
    },
  }),
  FontSize,
  IndentParagraph,
  MathInline,
  MathDisplay,
  Placeholder.configure({ placeholder }),
];

export const TiptapEditor = ({
  value,
  onChange,
  placeholder = "Start typing...",
  className,
  minHeight = "150px",
  onMarkHeading,
  readOnly = false,
}: TiptapEditorProps) => {
  const lastEmitted = useRef<string>("");

  const editor = useEditor({
    extensions: buildExtensions(placeholder),
    editable: !readOnly,
    content: normalizeHtmlForTiptap(value || ""),
    // CRITICAL: do not emit update on initial setContent — no save on load.
    onUpdate: ({ editor }) => {
      const html = serializeMathPlaceholders(editor.getHTML());
      lastEmitted.current = html;
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: cn(
          "ProseMirror-host w-full focus:outline-none text-lg leading-relaxed",
          className
        ),
        style: `min-height: ${minHeight}`,
      },
      handlePaste: (view, event) => {
        if (!event.clipboardData) return false;
        const html = event.clipboardData.getData("text/html");
        const text = event.clipboardData.getData("text/plain");
        if (!html && !text) return false;
        event.preventDefault();
        const cleaned = html ? cleanPastedHtml(html) : escapeHtml(text);
        const normalized = normalizeHtmlForTiptap(cleaned);
        editor?.commands.insertContent(normalized, {
          parseOptions: { preserveWhitespace: "full" },
        });
        return true;
      },
    },
  });

  // Sync external value changes (e.g. parent reloads from DB) without
  // emitting an update — protects "no data mutation on load".
  useEffect(() => {
    if (!editor) return;
    if (value === lastEmitted.current) return;
    const current = serializeMathPlaceholders(editor.getHTML());
    if (current === value) return;
    editor.commands.setContent(normalizeHtmlForTiptap(value || ""), { emitUpdate: false });
  }, [value, editor]);

  // Update editable when readOnly toggles
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly);
  }, [readOnly, editor]);

  // Register active editor for the toolbar to find on focus
  useEffect(() => {
    if (!editor) return;
    const onFocus = () => {
      window.__activeTiptapEditor = editor;
    };
    editor.on("focus", onFocus);
    return () => {
      editor.off("focus", onFocus);
      if (window.__activeTiptapEditor === editor) {
        window.__activeTiptapEditor = null;
      }
    };
  }, [editor]);

  // Floating "Mark as Heading" — surfaced via custom event the
  // FloatingToolbar listens to.
  useEffect(() => {
    if (!editor || !onMarkHeading) return;
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ text: string }>;
      if (ce.detail?.text) onMarkHeading(ce.detail.text);
    };
    editor.view.dom.addEventListener("tiptap-mark-heading", handler);
    return () => {
      editor.view.dom.removeEventListener("tiptap-mark-heading", handler);
    };
  }, [editor, onMarkHeading]);

  return (
    <div className="tiptap-wrapper">
      <EditorContent editor={editor} />
    </div>
  );
};

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
