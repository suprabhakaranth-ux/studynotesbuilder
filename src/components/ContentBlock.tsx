import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

export type BlockType = "title" | "text" | "summary" | "mnemonic" | "image";

interface ContentBlockProps {
  block: {
    id: string;
    type: BlockType;
    content: string;
  };
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
}

export const ContentBlock = ({ block, onUpdate, onDelete }: ContentBlockProps) => {
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

  return (
    <div className="border border-border rounded-lg p-4 bg-card group relative">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase">
          {getBlockTitle()}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDelete(block.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {block.type === "title" ? (
        <Input
          value={block.content}
          onChange={(e) => onUpdate(block.id, e.target.value)}
          placeholder={getPlaceholder()}
          className="text-2xl font-bold border-0 p-0 focus-visible:ring-0"
        />
      ) : block.type === "image" ? (
        <div className="space-y-2">
          <Input
            value={block.content}
            onChange={(e) => onUpdate(block.id, e.target.value)}
            placeholder={getPlaceholder()}
          />
          {block.content && (
            <img
              src={block.content}
              alt="Content"
              className="max-w-full h-auto rounded-md"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}
        </div>
      ) : (
        <Textarea
          value={block.content}
          onChange={(e) => onUpdate(block.id, e.target.value)}
          placeholder={getPlaceholder()}
          className="min-h-[100px] resize-none border-0 p-0 focus-visible:ring-0"
        />
      )}
    </div>
  );
};
