import { useState } from "react";
import { Pencil, Trash2, Plus, ChevronDown, ChevronRight, ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "./RichTextEditor";
import { Input } from "@/components/ui/input";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
  onPromote?: () => void;
  onDemote?: () => void;
  canPromote?: boolean;
  canDemote?: boolean;
  level?: number;
  index?: number;
  forceCollapsed?: boolean;
}

export const HeadingNodeComponent = ({ 
  node, 
  onUpdate, 
  onDelete,
  onPromote,
  onDemote,
  canPromote = false,
  canDemote = false,
  level = 0,
  index = 0,
  forceCollapsed = false
}: HeadingNodeComponentProps) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(node.title);
  const [isExpanded, setIsExpanded] = useState(true);
  
  const showContent = isExpanded && !forceCollapsed;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id, disabled: level > 0 });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

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

  const indentClass = level === 0 ? "" : "ml-6";
  const isMainHeading = level === 0;
  const displayNumber = index;
  const numberColor = isMainHeading ? "text-primary" : "text-foreground/80";
  const titleColor = isMainHeading ? "text-primary" : "text-foreground/90";
  const bgColor = isMainHeading ? "bg-card/50" : "bg-muted/30";

  return (
    <div ref={setNodeRef} style={style} className={`${indentClass} mb-2`}>
      <div className={`border border-border rounded-lg ${bgColor} overflow-hidden`}>
        <div className="flex items-center gap-1 p-2 hover:bg-muted/50 group">
          {level === 0 && (
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing touch-none"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {showContent ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </Button>

          <div className="flex items-center gap-1 flex-1 min-w-0">
            {isEditingTitle ? (
              <div className="flex items-center gap-2 flex-1">
                <span className={`font-semibold text-sm whitespace-nowrap ${numberColor}`}>
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
                <span className={`font-semibold text-sm ${numberColor}`}>
                  {displayNumber}.
                </span>
                <span className={`text-sm truncate font-semibold ${titleColor}`}>
                  {node.title}
                </span>
                <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 flex-shrink-0">
                  {canPromote && onPromote && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPromote();
                      }}
                      title="Convert to main heading"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </Button>
                  )}
                  {canDemote && onDemote && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDemote();
                      }}
                      title="Convert to subheading"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
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
                    className="h-6 w-6 p-0 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        {showContent && (
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
                    forceCollapsed={forceCollapsed}
                    onUpdate={(updatedChild) => updateChild(idx, updatedChild)}
                    onDelete={() => deleteChild(idx)}
                    onPromote={() => {
                      // Promote child to be a sibling (parent level)
                      const newChildren = [...node.children];
                      const promotedChild = newChildren.splice(idx, 1)[0];
                      onUpdate({ ...node, children: newChildren });
                      // This would need to be handled at parent level
                    }}
                    canPromote={true}
                    canDemote={false}
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
