import { useRef, useEffect, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { FloatingToolbar } from "./FloatingToolbar";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  onMarkHeading?: (text: string) => void;
}

interface EditorHistoryState {
  content: string;
  timestamp: number;
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
  const historyStack = useRef<EditorHistoryState[]>([]);
  const historyPosition = useRef<number>(-1);
  const lastSavedContent = useRef<string>("");
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
      // Initialize history with the first value
      if (historyStack.current.length === 0 && value) {
        historyStack.current = [{ content: value, timestamp: Date.now() }];
        historyPosition.current = 0;
        lastSavedContent.current = value;
      }
    }
  }, [value]);

  const saveToHistory = useCallback((content: string) => {
    // Only save if content actually changed
    if (content === lastSavedContent.current) return;
    
    // Remove any "future" history if we're not at the end
    if (historyPosition.current < historyStack.current.length - 1) {
      historyStack.current = historyStack.current.slice(0, historyPosition.current + 1);
    }
    
    // Add new state
    historyStack.current.push({
      content,
      timestamp: Date.now(),
    });
    
    // Limit history size (last 50 states)
    if (historyStack.current.length > 50) {
      historyStack.current.shift();
    } else {
      historyPosition.current++;
    }
    
    lastSavedContent.current = content;
  }, []);

  const handleInput = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      onChange(content);

      // Debounced save to history
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveToHistory(content);
      }, 300);
    }
  };

  const performUndo = useCallback(() => {
    if (historyPosition.current <= 0) return;
    
    historyPosition.current--;
    const previousState = historyStack.current[historyPosition.current];
    
    if (editorRef.current && previousState) {
      editorRef.current.innerHTML = previousState.content;
      onChange(previousState.content);
      lastSavedContent.current = previousState.content;
    }
  }, [onChange]);

  const performRedo = useCallback(() => {
    if (historyPosition.current >= historyStack.current.length - 1) return;
    
    historyPosition.current++;
    const nextState = historyStack.current[historyPosition.current];
    
    if (editorRef.current && nextState) {
      editorRef.current.innerHTML = nextState.content;
      onChange(nextState.content);
      lastSavedContent.current = nextState.content;
    }
  }, [onChange]);

  // Expose undo/redo functions on the element for FormattingToolbar to use
  useEffect(() => {
    if (editorRef.current) {
      (editorRef.current as any).__performUndo = performUndo;
      (editorRef.current as any).__performRedo = performRedo;
    }
  }, [performUndo, performRedo]);

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
    
    // Save to history after paste
    handleInput();
    setTimeout(() => {
      if (editorRef.current) {
        saveToHistory(editorRef.current.innerHTML);
      }
    }, 100);
  };

  return (
    <>
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
      <FloatingToolbar 
        onMarkHeading={onMarkHeading} 
      />
    </>
  );
};
