import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "./RichTextEditor";
import { Plus, Trash2, ChevronDown, ChevronRight, CornerDownLeft, CornerDownRight } from "lucide-react";

interface HeadingNode {
  id: string;
  title: string;
  notes: string;
  children: HeadingNode[];
}

interface HeadingNodeProps {
  node: HeadingNode;
  index: number;
  level?: number;
  forceCollapsed?: boolean;
  onUpdate: (updatedNode: HeadingNode) => void;
  onDelete: () => void;
  onPromote?: () => void;
  onDemote?: () => void;
  onPromoteChild?: (childIndex: number) => void;
  canPromote?: boolean;
  canDemote?: boolean;
}

export const HeadingNodeComponent: React.FC<HeadingNodeProps> = ({
  node,
  index,
  level = 0,
  forceCollapsed = false,
  onUpdate,
  onDelete,
  onPromote,
  onDemote,
  onPromoteChild,
  canPromote = true,
  canDemote = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleAddSubheading = () => {
    const newSubheading: HeadingNode = {
      id: `${node.id}-${node.children.length + 1}`,
      title: "New Subheading",
      notes: "",
      children: [],
    };
    const updatedChildren = [...node.children, newSubheading];
    onUpdate({ ...node, children: updatedChildren });
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ ...node, title: e.target.value });
  };

  const handleDelete = () => {
    onDelete();
  };

  const updateChild = (index: number, updatedChild: HeadingNode) => {
    const updatedChildren = [...node.children];
    updatedChildren[index] = updatedChild;
    onUpdate({ ...node, children: updatedChildren });
  };

  const deleteChild = (index: number) => {
    const updatedChildren = [...node.children];
    updatedChildren.splice(index, 1);
    onUpdate({ ...node, children: updatedChildren });
  };

  // ✅ FIX 1: Changed logic so subheadings remain visible when collapsed
  const showContent = isExpanded || !forceCollapsed;

  return (
    <div className={`rounded-lg border border-border bg-card p-3 shadow-sm mb-3 ${level > 0 ? "ml-4" : ""}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-muted-foreground hover:text-foreground transition"
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>

          <Input
            value={node.title}
            onChange={handleTitleChange}
            className="h-7 text-sm font-medium border-0 focus-visible:ring-0 bg-transparent"
          />
        </div>

        <div className="flex items-center gap-1">
          {canPromote && (
            <Button size="icon" variant="ghost" onClick={onPromote} title="Promote">
              <CornerDownLeft className="h-4 w-4" />
            </Button>
          )}
          {canDemote && (
            <Button size="icon" variant="ghost" onClick={onDemote} title="Demote">
              <CornerDownRight className="h-4 w-4" />
            </Button>
          )}
          <Button size="icon" variant="ghost" onClick={handleDelete} title="Delete">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {/* ✅ FIX 2: Hide only notes & add button when collapsed, not subheadings */}
      {showContent && (
        <div className="px-2 pb-2 space-y-2">
          {!forceCollapsed && (
            <>
              <RichTextEditor
                value={node.notes}
                onChange={(v) => onUpdate({ ...node, notes: v })}
                placeholder="Add notes or breakdown for this heading..."
                minHeight="80px"
                className="p-2 border border-border rounded-md bg-background/50 text-sm"
              />

              <Button size="sm" variant="outline" onClick={handleAddSubheading} className="w-full h-7 text-xs">
                <Plus className="w-3 h-3 mr-1" />
                Add Subheading
              </Button>
            </>
          )}

          {/* Subheadings always visible */}
          {node.children.length > 0 && (
            <div className="space-y-1 mt-2">
              {node.children.map((child, idx) => (
                <HeadingNodeComponent
                  key={child.id}
                  node={child}
                  index={idx + 1}
                  level={level + 1}
                  forceCollapsed={forceCollapsed}
                  onUpdate={(updatedChild) => updateChild(idx, updatedChild)}
                  onDelete={() => deleteChild(idx)}
                  onPromoteChild={onPromoteChild}
                  canPromote={true}
                  canDemote={false}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HeadingNodeComponent;
