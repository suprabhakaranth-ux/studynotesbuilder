import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, List, Underline } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  value: string;
  onChange: (html: string) => void;
}

// Compact rich-text notepad for margin notes: bold, underline, bullets, free typing.
export function MarginNoteEditor({ value, onChange }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "min-h-36 max-h-full overflow-auto rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring [&_ul]:list-disc [&_ul]:pl-5 [&_p]:my-1",
      },
    },
  });

  const action = (run: () => void) => (event: React.MouseEvent) => {
    event.preventDefault();
    run();
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-0.5" aria-label="Margin note formatting">
        <Button type="button" variant={editor?.isActive("bold") ? "secondary" : "ghost"} size="icon" className="h-6 w-6" title="Bold" aria-label="Bold"
          onMouseDown={action(() => editor?.chain().focus().toggleBold().run())}><Bold className="h-3.5 w-3.5" /></Button>
        <Button type="button" variant={editor?.isActive("underline") ? "secondary" : "ghost"} size="icon" className="h-6 w-6" title="Underline" aria-label="Underline"
          onMouseDown={action(() => editor?.chain().focus().toggleUnderline().run())}><Underline className="h-3.5 w-3.5" /></Button>
        <Button type="button" variant={editor?.isActive("bulletList") ? "secondary" : "ghost"} size="icon" className="h-6 w-6" title="Bullet list" aria-label="Bullet list"
          onMouseDown={action(() => editor?.chain().focus().toggleBulletList().run())}><List className="h-3.5 w-3.5" /></Button>
      </div>
      <EditorContent editor={editor} aria-label="Margin note text" />
    </div>
  );
}
