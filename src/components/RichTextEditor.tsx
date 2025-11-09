import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Heading } from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  onMarkHeading?: (text: string) => void;
}

export const RichTextEditor = ({ 
  value, 
  onChange, 
  placeholder = "Start typing...",
  className,
  minHeight = "150px",
  onMarkHeading
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
    
    if (html) {
      // Create a temporary div to parse HTML
      const temp = document.createElement("div");
      temp.innerHTML = html;
      
      // Remove any font-weight: bold from inline styles to prevent everything becoming bold
      const allElements = temp.querySelectorAll("*");
      allElements.forEach((el) => {
        const element = el as HTMLElement;
        if (element.style.fontWeight) {
          element.style.removeProperty("font-weight");
        }
        // Remove bold tags that might cause issues
        if (element.tagName === "B" || element.tagName === "STRONG") {
          const parent = element.parentNode;
          while (element.firstChild) {
            parent?.insertBefore(element.firstChild, element);
          }
          parent?.removeChild(element);
        }
      });
      
      // Preserve line breaks and spacing
      const content = temp.innerHTML
        .replace(/<br\s*\/?>/gi, '<br>')
        .replace(/<\/p>/gi, '</p><br>')
        .replace(/<p>/gi, '<p>');
      
      // Insert at cursor
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        
        const fragment = document.createDocumentFragment();
        const div = document.createElement("div");
        div.innerHTML = content;
        
        while (div.firstChild) {
          fragment.appendChild(div.firstChild);
        }
        
        range.insertNode(fragment);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } else {
      // Plain text fallback
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        
        // Preserve line breaks in plain text
        const lines = text.split('\n');
        const fragment = document.createDocumentFragment();
        
        lines.forEach((line, index) => {
          fragment.appendChild(document.createTextNode(line));
          if (index < lines.length - 1) {
            fragment.appendChild(document.createElement('br'));
          }
        });
        
        range.insertNode(fragment);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
    
    handleInput();
  };

  const handleMarkHeading = () => {
    const selection = window.getSelection();
    if (selection && onMarkHeading) {
      const text = selection.toString().trim();
      if (text) {
        onMarkHeading(text);
      }
    }
  };

  const editorContent = (
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

  if (onMarkHeading) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {editorContent}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={handleMarkHeading} className="cursor-pointer">
            <Heading className="w-4 h-4 mr-2" />
            Mark as Heading
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  return editorContent;
};
