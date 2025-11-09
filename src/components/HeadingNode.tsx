import { useState } from "react";
import { Pencil, Trash2, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "./RichTextEditor";
import { Input } from "@/components/ui/input";

interface HeadingNode {
  id: string;
  title: string;
  notes: string;
  children: HeadingNode[];
}

interface HeadingNodeComponentProps {
  node: HeadingNode;
  onUpdate: (node: HeadingNode) => void;
  onDelete: () => void;
  level?: number;
  index?: number;
}

export const HeadingNodeComponent = ({ 
  node, 
  onUpdate, 
  onDelete,
  level = 0,
  index = 0
}: HeadingNodeComponentProps) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(node.title);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleTitleSave = () => {
    if (editedTitle.trim()) {
      onUpdate({ ...node, title: editedTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleAddSubheading = () => {
    const newChild: HeadingNode = {
      id: Date.now().toString() + Math.random(),
      title: "New Subheading",
      notes: "",
      children: []
    };
    onUpdate({
      ...node,
      children: [...node.children, newChild]
    });
  };

  const updateChild = (childIndex: number, updatedChild: HeadingNode) => {
    const newChildren = [...node.children];
    newChildren[childIndex] = updatedChild;
    onUpdate({ ...node, children: newChildren });
  };

  const deleteChild = (childIndex: number) => {
    onUpdate({
      ...node,
      children: node.children.filter((_, i) => i !== childIndex)
    });
  };

  const indentClass = level === 0 ? "" : "ml-4";
  const isMainHeading = level === 0;
  const displayNumber = index;

  return (
    <div className={`${indentClass} mb-2`}>
      <div className="border border-border rounded-lg bg-card/50 overflow-hidden">
        <div className="flex items-center gap-2 p-2 hover:bg-muted/50 group">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </Button>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isEditingTitle ? (
              <div className="flex items-center gap-2 flex-1">
                <span className="font-semibold text-sm whitespace-nowrap">
                  {displayNumber}.
                </span>
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleTitleSave();
                    if (e.key === "Escape") {
                      setEditedTitle(node.title);
                      setIsEditingTitle(false);
                    }
                  }}
                  className="h-7 text-sm flex-1"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            ) : (
              <>
                <span className={`font-semibold text-sm ${isMainHeading ? 'text-primary' : 'text-foreground'}`}>
                  {displayNumber}.
                </span>
                <span className={`text-sm truncate ${isMainHeading ? 'font-semibold text-primary' : 'text-foreground'}`}>
                  {node.title}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 ml-auto flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingTitle(true);
                  }}
                >
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </>
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="px-2 pb-2 space-y-2">
            <RichTextEditor
              value={node.notes}
              onChange={(v) => onUpdate({ ...node, notes: v })}
              placeholder="Add notes or breakdown for this heading..."
              minHeight="80px"
              className="p-2 border border-border rounded-md bg-background/50 text-sm"
            />
            
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddSubheading}
              className="w-full h-7 text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Subheading
            </Button>

            {node.children.length > 0 && (
              <div className="space-y-1 mt-2">
                {node.children.map((child, idx) => (
                  <HeadingNodeComponent
                    key={child.id}
                    node={child}
                    index={idx + 1}
                    onUpdate={(updatedChild) => updateChild(idx, updatedChild)}
                    onDelete={() => deleteChild(idx)}
                    level={level + 1}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
