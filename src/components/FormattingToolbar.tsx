import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Strikethrough, Highlighter, List, ListOrdered, Indent, Outdent, Heading, Undo, Redo } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FormattingToolbarProps {
  onMarkHeading?: (text: string) => void;
}

const colorOptions = [
  { name: "Black", value: "#000000" },
  { name: "Red", value: "#EF4444" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Green", value: "#10B981" },
  { name: "Purple", value: "#A855F7" },
  { name: "Orange", value: "#F97316" },
  { name: "Pink", value: "#EC4899" },
  { name: "Yellow", value: "#EAB308" },
  { name: "Teal", value: "#14B8A6" },
];

export const FormattingToolbar = ({ onMarkHeading }: FormattingToolbarProps) => {
  const syncActiveEditor = () => {
    const sel = document.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const anchor = sel.anchorNode as Node | null;
    const element = (anchor instanceof Element ? anchor : anchor?.parentElement) as Element | null;
    const editable = element?.closest('[contenteditable="true"]') as HTMLElement | null;
    if (editable) {
      // Trigger input so RichTextEditor persists content to state/localStorage
      editable.dispatchEvent(new Event("input", { bubbles: true }));
    }
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

  const applyFormat = (command: string, value?: string) => {
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
    
    // Ensure changes are saved immediately
    setTimeout(syncActiveEditor, 0);
  };

  const handleIndent = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    let element = range.commonAncestorContainer;
    
    // Get the block element
    if (element.nodeType === Node.TEXT_NODE) {
      element = element.parentElement as HTMLElement;
    }
    
    const blockElement = (element as HTMLElement).closest('p, div, li') as HTMLElement;
    if (blockElement) {
      const currentMargin = parseInt(window.getComputedStyle(blockElement).marginLeft) || 0;
      blockElement.style.marginLeft = `${currentMargin + 40}px`;
      
      // Restore focus
      const editableElement = blockElement.closest('[contenteditable="true"]') as HTMLElement;
      if (editableElement) editableElement.focus();
      
      syncActiveEditor();
    }
  };

  const handleOutdent = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    let element = range.commonAncestorContainer;
    
    if (element.nodeType === Node.TEXT_NODE) {
      element = element.parentElement as HTMLElement;
    }
    
    const blockElement = (element as HTMLElement).closest('p, div, li') as HTMLElement;
    if (blockElement) {
      const currentMargin = parseInt(window.getComputedStyle(blockElement).marginLeft) || 0;
      if (currentMargin >= 40) {
        blockElement.style.marginLeft = `${currentMargin - 40}px`;
        
        // Restore focus
        const editableElement = blockElement.closest('[contenteditable="true"]') as HTMLElement;
        if (editableElement) editableElement.focus();
        
        syncActiveEditor();
      }
    }
  };

  const toggleHighlight = () => {
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
    if (editableElement) editableElement.focus();
    
    setTimeout(syncActiveEditor, 0);
  };

  const applyFontSize = (size: string) => {
    const sel = document.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    
    const range = sel.getRangeAt(0);
    if (range.collapsed) return;
    
    try {
      const span = document.createElement('span');
      span.style.fontSize = size;
      
      // Extract the selected content
      const contents = range.extractContents();
      
      // Wrap it in the span
      span.appendChild(contents);
      
      // Insert the wrapped content back
      range.insertNode(span);
      
      // Clear selection
      sel.removeAllRanges();
      
      setTimeout(syncActiveEditor, 0);
    } catch (e) {
      // Fallback to execCommand if range manipulation fails
      console.warn('Font size application failed, using fallback');
      document.execCommand('fontSize', false, '7');
      const fontElements = document.querySelectorAll('font[size="7"]');
      fontElements.forEach(el => {
        const span = document.createElement('span');
        span.style.fontSize = size;
        while (el.firstChild) {
          span.appendChild(el.firstChild);
        }
        el.parentNode?.replaceChild(span, el);
      });
      setTimeout(syncActiveEditor, 0);
    }
  };
  return (
    <div 
      className="flex flex-wrap items-center gap-1.5 p-2 border-b border-border bg-gradient-to-r from-primary/5 to-secondary/5"
      onMouseDown={(e) => e.preventDefault()}
    >
      <Select onValueChange={(value) => applyFormat("fontName", value)}>
        <SelectTrigger className="w-[110px] h-8 bg-card text-xs">
          <SelectValue placeholder="Font" />
        </SelectTrigger>
        <SelectContent className="bg-card">
          <SelectItem value="Arial">Arial</SelectItem>
          <SelectItem value="Georgia">Georgia</SelectItem>
          <SelectItem value="Times New Roman">Times</SelectItem>
          <SelectItem value="Courier New">Courier</SelectItem>
          <SelectItem value="Verdana">Verdana</SelectItem>
        </SelectContent>
      </Select>

      <Select onValueChange={applyFontSize}>
        <SelectTrigger className="w-[70px] h-8 bg-card text-xs">
          <SelectValue placeholder="Size" />
        </SelectTrigger>
        <SelectContent className="bg-card">
          <SelectItem value="12px">12</SelectItem>
          <SelectItem value="14px">14</SelectItem>
          <SelectItem value="16px">16</SelectItem>
          <SelectItem value="18px">18</SelectItem>
          <SelectItem value="20px">20</SelectItem>
          <SelectItem value="22px">22</SelectItem>
          <SelectItem value="24px">24</SelectItem>
        </SelectContent>
      </Select>

      <div className="w-px h-6 bg-border" />

      <Button
        size="sm"
        variant="ghost"
        onClick={() => applyFormat("bold")}
        className="h-8 w-8 p-0 hover:bg-primary/10"
        title="Bold"
      >
        <Bold className="w-3.5 h-3.5" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => applyFormat("italic")}
        className="h-8 w-8 p-0 hover:bg-primary/10"
        title="Italic"
      >
        <Italic className="w-3.5 h-3.5" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => applyFormat("underline")}
        className="h-8 w-8 p-0 hover:bg-primary/10"
        title="Underline"
      >
        <Underline className="w-3.5 h-3.5" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => applyFormat("strikeThrough")}
        className="h-8 w-8 p-0 hover:bg-primary/10"
        title="Strikethrough"
      >
        <Strikethrough className="w-3.5 h-3.5" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={toggleHighlight}
        className="h-8 w-8 p-0 hover:bg-primary/10"
        title="Highlight/Unhighlight"
      >
        <Highlighter className="w-3.5 h-3.5" />
      </Button>

      <div className="w-px h-6 bg-border" />

      <Button
        size="sm"
        variant="ghost"
        onClick={() => applyFormat("insertUnorderedList")}
        className="h-8 w-8 p-0 hover:bg-primary/10"
        title="Bullet List"
      >
        <List className="w-3.5 h-3.5" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => applyFormat("insertOrderedList")}
        className="h-8 w-8 p-0 hover:bg-primary/10"
        title="Numbered List"
      >
        <ListOrdered className="w-3.5 h-3.5" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={handleIndent}
        className="h-8 w-8 p-0 hover:bg-primary/10"
        title="Indent"
      >
        <Indent className="w-3.5 h-3.5" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={handleOutdent}
        className="h-8 w-8 p-0 hover:bg-primary/10"
        title="Outdent"
      >
        <Outdent className="w-3.5 h-3.5" />
      </Button>

      <div className="w-px h-6 bg-border" />

      <Button
        size="sm"
        variant="ghost"
        onClick={() => applyFormat("justifyLeft")}
        className="h-8 w-8 p-0 hover:bg-primary/10"
        title="Align Left"
      >
        <AlignLeft className="w-3.5 h-3.5" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => applyFormat("justifyCenter")}
        className="h-8 w-8 p-0 hover:bg-primary/10"
        title="Align Center"
      >
        <AlignCenter className="w-3.5 h-3.5" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => applyFormat("justifyRight")}
        className="h-8 w-8 p-0 hover:bg-primary/10"
        title="Align Right"
      >
        <AlignRight className="w-3.5 h-3.5" />
      </Button>

      <div className="w-px h-6 bg-border" />

      <Select onValueChange={(value) => applyFormat("foreColor", value)}>
        <SelectTrigger className="w-[100px] h-8 bg-card text-xs">
          <SelectValue placeholder="Color" />
        </SelectTrigger>
        <SelectContent className="bg-card">
          {colorOptions.map((color) => (
            <SelectItem key={color.value} value={color.value}>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded border"
                  style={{ backgroundColor: color.value }}
                />
                {color.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <input
        type="color"
        className="w-8 h-8 rounded cursor-pointer border border-border"
        onChange={(e) => applyFormat("foreColor", e.target.value)}
        title="Custom color"
      />

      {onMarkHeading && (
        <>
          <div className="w-px h-6 bg-border" />
          <Button
            size="sm"
            variant="ghost"
            onClick={handleMarkHeading}
            className="h-8 px-2 hover:bg-secondary/50 text-xs"
            title="Mark selected text as heading"
          >
            <Heading className="w-3.5 h-3.5 mr-1" />
            Mark Heading
          </Button>
        </>
      )}

      <div className="w-px h-6 bg-border" />

      <Button
        size="sm"
        variant="ghost"
        onClick={() => applyFormat("undo")}
        className="h-8 w-8 p-0 hover:bg-primary/10"
        title="Undo"
      >
        <Undo className="w-3.5 h-3.5" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => applyFormat("redo")}
        className="h-8 w-8 p-0 hover:bg-primary/10"
        title="Redo"
      >
        <Redo className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
};
