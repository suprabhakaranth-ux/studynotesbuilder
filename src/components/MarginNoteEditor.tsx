import { memo, useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { Bold, List, Underline as UnderlineIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  value: string;
  onChange: (html: string) => void;
}

// Compact rich-text notepad for margin notes: bold, underline, bullets, free typing.
// Typing stays local and is reported in a debounced way so the rest of the page
// does not re-render on every key (which caused the card to "jerk").
function MarginNoteEditorInner({ value, onChange }: Props) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const lastSent = useRef(value);
  const scroller = useRef<HTMLDivElement>(null);

  const flush = (html: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = undefined;
    if (html === lastSent.current) return;
    lastSent.current = html;
    onChangeRef.current(html);
  };

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => flush(html), 400);
    },
    onBlur: ({ editor }) => flush(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "min-h-36 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring [&_ul]:list-disc [&_ul]:pl-5 [&_p]:my-1",
      },
      // Keep the caret visible by scrolling only inside the note, never the page.
      handleScrollToSelection: (view) => {
        const box = scroller.current?.closest("[data-margin-scroll]") as HTMLElement | null;
        if (!box) return true;
        try {
          const coords = view.coordsAtPos(view.state.selection.head);
          const rect = box.getBoundingClientRect();
          if (coords.bottom > rect.bottom - 8) box.scrollTop += coords.bottom - rect.bottom + 16;
          else if (coords.top < rect.top + 8) box.scrollTop -= rect.top - coords.top + 16;
        } catch { /* ignore */ }
        return true;
      },
    },
  });

  // Pick up external changes (e.g. collated highlights) without disturbing typing.
  useEffect(() => {
    if (!editor || value === lastSent.current) return;
    if (value === editor.getHTML()) { lastSent.current = value; return; }
    lastSent.current = value;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [value, editor]);

  useEffect(() => () => { if (timer.current && editor) flush(editor.getHTML()); }, [editor]); // eslint-disable-line react-hooks/exhaustive-deps

  const action = (run: () => void) => (event: React.MouseEvent) => {
    event.preventDefault();
    run();
  };
  const chain = () => editor?.chain().focus(undefined, { scrollIntoView: false });

  return (
    <div ref={scroller} className="space-y-1">
      <div className="flex items-center gap-0.5" aria-label="Margin note formatting">
        <Button type="button" variant={editor?.isActive("bold") ? "secondary" : "ghost"} size="icon" className="h-6 w-6" title="Bold" aria-label="Bold"
          onMouseDown={action(() => chain()?.toggleBold().run())}><Bold className="h-3.5 w-3.5" /></Button>
        <Button type="button" variant={editor?.isActive("underline") ? "secondary" : "ghost"} size="icon" className="h-6 w-6" title="Underline" aria-label="Underline"
          onMouseDown={action(() => chain()?.toggleUnderline().run())}><UnderlineIcon className="h-3.5 w-3.5" /></Button>
        <Button type="button" variant={editor?.isActive("bulletList") ? "secondary" : "ghost"} size="icon" className="h-6 w-6" title="Bullet list" aria-label="Bullet list"
          onMouseDown={action(() => chain()?.toggleBulletList().run())}><List className="h-3.5 w-3.5" /></Button>
      </div>
      <EditorContent editor={editor} aria-label="Margin note text" />
    </div>
  );
}

export const MarginNoteEditor = memo(MarginNoteEditorInner, (a, b) => a.value === b.value);
