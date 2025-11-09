import { X, Heading } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/RichTextEditor";
import { useState } from "react";

export type BlockType = "title" | "text" | "summary" | "mnemonic" | "image";

interface ContentBlockProps {
  block: {
    id: string;
    type: BlockType;
    content: string;
    headings?: string[];
  };
  onUpdate: (id: string, content: string, headings?: string[]) => void;
  onDelete: (id: string) => void;
}

export const ContentBlock = ({ block, onUpdate, onDelete }: ContentBlockProps) => {
  const [selectedText, setSelectedText] = useState("");

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection) {
      const selected = selection.toString().trim();
      setSelectedText(selected);
    }
  };

  const markAsHeading = (text?: string) => {
    const headingText = text || selectedText;
    if (headingText) {
      const currentHeadings = block.headings || [];
      const updatedHeadings = [...currentHeadings, headingText];
      onUpdate(block.id, block.content, updatedHeadings);
      setSelectedText("");
    }
  };

  const getBlockTitle = () => {
    switch (block.type) {
      case "title":
        return "Title";
      case "summary":
        return "Summary";
      case "mnemonic":
        return "Mnemonic";
      case "image":
        return "Image URL";
      default:
        return "Content";
    }
  };

  const getPlaceholder = () => {
    switch (block.type) {
      case "title":
        return "Enter title...";
      case "summary":
        return "Enter summary for quick revision...";
      case "mnemonic":
        return "Enter mnemonic device...";
      case "image":
        return "Paste image URL or upload...";
      default:
        return "Start typing...";
    }
  };

  const getBlockIcon = () => {
    switch (block.type) {
      case "summary":
        return "📝";
      case "mnemonic":
        return "💡";
      case "title":
        return "📌";
      case "image":
        return "🖼️";
      default:
        return "✏️";
    }
  };

  return (
    <div className="border-2 border-border rounded-xl p-5 bg-gradient-to-br from-card to-card/50 group relative shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-primary flex items-center gap-2">
          <span className="text-lg">{getBlockIcon()}</span>
          {getBlockTitle()}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDelete(block.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {block.type === "title" ? (
        <Input
          value={block.content}
          onChange={(e) => onUpdate(block.id, e.target.value)}
          placeholder={getPlaceholder()}
          className="text-3xl font-bold border-0 p-0 focus-visible:ring-0 bg-transparent"
        />
      ) : block.type === "image" ? (
        <div className="space-y-3">
          <Input
            value={block.content}
            onChange={(e) => onUpdate(block.id, e.target.value)}
            placeholder={getPlaceholder()}
            className="bg-muted/30"
          />
          {block.content && (
            <img
              src={block.content}
              alt="Content"
              className="max-w-full h-auto rounded-lg shadow-md"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}
        </div>
      ) : (
        <div className="space-y-2" onMouseUp={handleTextSelection}>
          <RichTextEditor
            value={block.content}
            onChange={(value) => onUpdate(block.id, value)}
            onMarkHeading={block.type === "text" ? markAsHeading : undefined}
            placeholder={getPlaceholder()}
            className="min-h-[150px]"
          />
          {selectedText && block.type === "text" && (
            <Button
              size="sm"
              onClick={() => markAsHeading()}
              className="bg-primary hover:bg-primary/90"
            >
              <Heading className="w-4 h-4 mr-2" />
              Mark "{selectedText.substring(0, 30)}{selectedText.length > 30 ? '...' : ''}" as Heading
            </Button>
          )}
          {block.headings && block.headings.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Headings marked:</p>
              <div className="flex flex-wrap gap-1">
                {block.headings.map((heading, idx) => (
                  <span key={idx} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    {heading.substring(0, 30)}{heading.length > 30 ? '...' : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
