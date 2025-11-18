import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Bold, Italic, Highlighter, List, Heading } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingToolbarProps {
  onMarkHeading?: (text: string) => void;
}

export const FloatingToolbar = ({ onMarkHeading }: FloatingToolbarProps) => {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [selectedText, setSelectedText] = useState("");

  const applyFormat = useCallback((command: string, value?: string) => {
    // Get current selection before executing command
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    // Store the range and find the editable element
    const range = selection.getRangeAt(0);
    const editable = range.commonAncestorContainer;
    const editableElement = (editable instanceof Element ? editable : editable.parentElement)?.closest('[contenteditable="true"]') as HTMLElement;
    
    if (!editableElement) return;
    
    // Execute command
    document.execCommand(command, false, value);
    
    // Restore focus to the editable element
    editableElement.focus();
    
    // Trigger input event to sync state
    const event = new Event('input', { bubbles: true });
    editableElement.dispatchEvent(event);
  }, []);

  const toggleHighlight = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    // Check if current selection has highlight
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const parent = container.nodeType === Node.TEXT_NODE ? container.parentElement : container as HTMLElement;
    
    // Check for existing highlight
    const hasHighlight = parent?.style?.backgroundColor && 
                        parent.style.backgroundColor !== 'transparent' &&
                        parent.style.backgroundColor !== 'rgba(0, 0, 0, 0)';
    
    const editableElement = parent?.closest('[contenteditable="true"]') as HTMLElement;
    
    if (hasHighlight) {
      // Remove highlight
      document.execCommand("hiliteColor", false, "transparent");
    } else {
      // Add highlight
      document.execCommand("hiliteColor", false, "yellow");
    }
    
    // Restore focus
    if (editableElement) {
      editableElement.focus();
      const event = new Event('input', { bubbles: true });
      editableElement.dispatchEvent(event);
    }
  }, []);

  const handleMarkHeading = useCallback(() => {
    if (selectedText && onMarkHeading) {
      onMarkHeading(selectedText);
      setPosition(null);
    }
  }, [selectedText, onMarkHeading]);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        setPosition(null);
        setSelectedText("");
        return;
      }

      const text = selection.toString().trim();
      if (!text) {
        setPosition(null);
        setSelectedText("");
        return;
      }

      setSelectedText(text);

      // Get the bounding rect of the selection
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Position toolbar above the selection
      const top = rect.top + window.scrollY - 50;
      const left = rect.left + window.scrollX + rect.width / 2 - 150; // Center toolbar

      setPosition({ top, left });
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    document.addEventListener("mouseup", handleSelectionChange);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      document.removeEventListener("mouseup", handleSelectionChange);
    };
  }, []);

  if (!position) return null;

  return (
    <div
      className={cn(
        "fixed z-50 flex items-center gap-1 p-2 rounded-lg shadow-lg border",
        "bg-background border-border animate-in fade-in-0 zoom-in-95"
      )}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      onMouseDown={(e) => e.preventDefault()} // Prevent losing selection
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => applyFormat("bold")}
        className="h-8 w-8 p-0"
        title="Bold"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => applyFormat("italic")}
        className="h-8 w-8 p-0"
        title="Italic"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleHighlight}
        className="h-8 w-8 p-0"
        title="Highlight/Unhighlight"
      >
        <Highlighter className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => applyFormat("insertUnorderedList")}
        className="h-8 w-8 p-0"
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </Button>
      {onMarkHeading && (
        <>
          <div className="w-px h-6 bg-border mx-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkHeading}
            className="h-8 w-8 p-0"
            title="Mark as Heading"
          >
            <Heading className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
};
