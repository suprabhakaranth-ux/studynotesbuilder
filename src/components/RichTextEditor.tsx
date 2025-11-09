import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export const RichTextEditor = ({ 
  value, 
  onChange, 
  placeholder = "Start typing...",
  className,
  minHeight = "150px"
}: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");
    
    // If HTML is available, use it (paste special with formatting)
    const content = html || text;
    
    // Insert at cursor position
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      
      const div = document.createElement("div");
      div.innerHTML = content;
      const frag = document.createDocumentFragment();
      let node;
      while ((node = div.firstChild)) {
        frag.appendChild(node);
      }
      range.insertNode(frag);
      
      // Move cursor to end of inserted content
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      
      handleInput();
    }
  };

  return (
    <div
      ref={editorRef}
      contentEditable
      onInput={handleInput}
      onPaste={handlePaste}
      className={cn(
        "w-full rounded-md border-0 p-0 focus-visible:outline-none bg-transparent text-lg leading-relaxed",
        "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none",
        className
      )}
      style={{ minHeight }}
      data-placeholder={placeholder}
      suppressContentEditableWarning
    />
  );
};
