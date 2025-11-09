import { useState } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
}

export const HeadingNodeComponent = ({ 
  node, 
  onUpdate, 
  onDelete,
  level = 0 
}: HeadingNodeComponentProps) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(node.title);

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
  const borderColor = level === 0 ? "border-primary/20" : "border-secondary/20";

  return (
    <div className={indentClass}>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem 
          value={node.id} 
          className={`border ${borderColor} rounded-lg mb-2 px-4 bg-card/50`}
        >
          <AccordionTrigger className="text-left font-semibold hover:no-underline group">
            <div className="flex items-center gap-2 flex-1">
              {isEditingTitle ? (
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
                  className="h-7 text-sm"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <span className={level === 0 ? "text-primary" : "text-secondary"}>
                    {node.title}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
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
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive"
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
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              <RichTextEditor
                value={node.notes}
                onChange={(v) => onUpdate({ ...node, notes: v })}
                placeholder="Add notes or breakdown for this heading..."
                minHeight="100px"
                className="p-3 border border-border rounded-md bg-background/50"
              />
              
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddSubheading}
                className="w-full"
              >
                <Plus className="w-3 h-3 mr-2" />
                Add Subheading
              </Button>

              {node.children.length > 0 && (
                <div className="mt-2 space-y-2">
                  {node.children.map((child, idx) => (
                    <HeadingNodeComponent
                      key={child.id}
                      node={child}
                      onUpdate={(updatedChild) => updateChild(idx, updatedChild)}
                      onDelete={() => deleteChild(idx)}
                      level={level + 1}
                    />
                  ))}
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
