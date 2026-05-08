import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, GripVertical, ExternalLink, FileText, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Presentation,
  usePresentations,
  renamePresentation,
  deletePresentation,
  reorderPresentations,
} from "@/hooks/usePresentations";
import { PresentationUploadDialog } from "./PresentationUploadDialog";
import { useToast } from "@/hooks/use-toast";

interface Props {
  userId: string;
  subjectId: string;
  subjectSlug?: string;
}

const Row = ({ p, onRename, onDelete, subjectSlug }: { p: Presentation; onRename: (id: string, t: string) => void; onDelete: (p: Presentation) => void; subjectSlug?: string }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id });
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(p.title);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-3 bg-card border rounded-lg">
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground">
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
        <FileText className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-1">
            <Input value={val} onChange={(e) => setVal(e.target.value)} className="h-8" autoFocus onKeyDown={(e) => { if (e.key === "Enter") { onRename(p.id, val); setEditing(false); } if (e.key === "Escape") { setVal(p.title); setEditing(false); } }} />
            <Button size="icon" variant="ghost" onClick={() => { onRename(p.id, val); setEditing(false); }}><Check className="w-4 h-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => { setVal(p.title); setEditing(false); }}><X className="w-4 h-4" /></Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{p.title}</p>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing(true)}><Pencil className="w-3 h-3" /></Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {p.page_count ? `${p.page_count} pages • ` : ""}
          {p.file_size ? `${(p.file_size / 1024 / 1024).toFixed(1)} MB` : ""}
        </p>
      </div>
      {subjectSlug && p.slug && (
        <Button size="sm" variant="ghost" asChild>
          <a href={`/library/${subjectSlug}/presentations/${p.slug}`} target="_blank" rel="noreferrer">
            <ExternalLink className="w-4 h-4 mr-1" /> View
          </a>
        </Button>
      )}
      <Button size="icon" variant="ghost" onClick={() => onDelete(p)} title="Delete">
        <Trash2 className="w-4 h-4 text-destructive" />
      </Button>
    </div>
  );
};

export const PresentationsTab = ({ userId, subjectId, subjectSlug: subjectSlugProp }: Props) => {
  const { toast } = useToast();
  const { items, refresh, setItems } = usePresentations(subjectId, userId);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [subjectSlug, setSubjectSlug] = useState<string | undefined>(subjectSlugProp);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    if (subjectSlugProp) { setSubjectSlug(subjectSlugProp); return; }
    supabase.from("subjects").select("slug").eq("id", subjectId).maybeSingle().then(({ data }) => {
      if (data?.slug) setSubjectSlug(data.slug);
    });
  }, [subjectId, subjectSlugProp]);

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((i) => i.id === active.id);
    const newIdx = items.findIndex((i) => i.id === over.id);
    const next = arrayMove(items, oldIdx, newIdx);
    setItems(next);
    await reorderPresentations(next);
  };

  const handleRename = async (id: string, title: string) => {
    if (!title.trim()) return;
    try {
      const updated = await renamePresentation(id, title.trim());
      setItems(items.map((i) => (i.id === id ? updated : i)));
    } catch (e: any) {
      toast({ title: "Rename failed", description: e?.message, variant: "destructive" });
    }
  };

  const handleDelete = async (p: Presentation) => {
    if (!confirm(`Move "${p.title}" to Recycle Bin?`)) return;
    try {
      await deletePresentation(p);
      setItems(items.filter((i) => i.id !== p.id));
      toast({ title: "Moved to Recycle Bin" });
    } catch (e: any) {
      toast({ title: "Delete failed", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold">Presentations</h3>
          <p className="text-sm text-muted-foreground">{items.length} {items.length === 1 ? "deck" : "decks"}</p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Upload PDF
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">No presentations yet</p>
          <Button variant="outline" onClick={() => setUploadOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Upload your first PDF
          </Button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((p) => (
                <Row key={p.id} p={p} onRename={handleRename} onDelete={handleDelete} subjectSlug={subjectSlug} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <PresentationUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        userId={userId}
        subjectId={subjectId}
        onUploaded={refresh}
      />
    </div>
  );
};
