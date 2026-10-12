import { useRef, useState } from "react";
import { GripHorizontal, PenLine, Type, X, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DrawingBlock } from "./DrawingBlock";
import type { MarginNote } from "@/hooks/useMarginNotes";

interface Props {
  notes: MarginNote[];
  closed: Set<string>;
  onClose: (id: string) => void;
  onOpen: (id: string) => void;
  onUpdate: (id: string, patch: Partial<MarginNote>) => void;
}

function FloatingNote({ note, closed, onClose, onOpen, onUpdate }: Props & { note: MarginNote }) {
  const [mode, setMode] = useState<"draw" | "type">(note.text_content ? "type" : "draw");
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ clientX: number; clientY: number; x: number; y: number; width: number; cardWidth: number }>();
  const card = useRef<HTMLDivElement>(null);
  const collapsed = closed.has(note.id);
  const startDrag = (event: React.PointerEvent) => {
    if ((event.target as HTMLElement).closest("button")) return;
    const parent = card.current?.parentElement;
    if (!parent || !card.current) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { clientX: event.clientX, clientY: event.clientY, x: note.x, y: note.y, width: parent.clientWidth, cardWidth: card.current.clientWidth };
  };
  const move = (event: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    setPosition({
      x: Math.max(0, Math.min(Math.max(0, 1 - d.cardWidth / d.width), d.x + (event.clientX - d.clientX) / d.width)),
      y: Math.max(0, d.y + event.clientY - d.clientY),
    });
  };
  const endDrag = () => {
    if (position) onUpdate(note.id, position);
    drag.current = undefined;
    setPosition(null);
  };
  return (
    <div ref={card} data-margin-note={note.id} className={collapsed ? "margin-note-marker" : "margin-note-card"}
      style={{ left: `min(${(position?.x ?? note.x) * 100}%, max(0px, calc(100% - ${collapsed ? 48 : 406}px)))`, top: position?.y ?? note.y }}>
      {collapsed ? (
        <Button variant="secondary" size="icon" className="h-9 w-9 shadow-md" aria-label="Open margin note" title={note.anchor_text || "Open margin note"} onClick={() => onOpen(note.id)}><PenLine className="h-4 w-4" /></Button>
      ) : (
        <>
          <div className="flex items-center gap-1 border-b border-border p-1 cursor-grab touch-none" onPointerDown={startDrag} onPointerMove={move} onPointerUp={endDrag} onPointerCancel={endDrag} aria-label="Move margin note" title="Drag to move">
            <GripHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs font-medium flex-1">Margin note</span>
            <Button variant={mode === "draw" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" title="Draw" aria-label="Draw" onClick={() => setMode("draw")}><PenLine className="h-4 w-4" /></Button>
            <Button variant={mode === "type" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" title="Type" aria-label="Type" onClick={() => setMode("type")}><Type className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" title="Delete margin note" aria-label="Delete margin note" onClick={() => onUpdate(note.id, { deleted_at: new Date().toISOString() })}><Trash2 className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Close margin note" aria-label="Close margin note" onClick={() => onClose(note.id)}><X className="h-4 w-4" /></Button>
          </div>
          <div className="p-2 space-y-2">
            {note.anchor_text && <p className="text-xs text-muted-foreground border-l-2 border-primary pl-2 line-clamp-2">{note.anchor_text}</p>}
            {mode === "draw" ? <DrawingBlock content={note.drawing_content} onChange={drawing_content => onUpdate(note.id, { drawing_content })} /> : <Textarea aria-label="Margin note text" placeholder="Your key points…" value={note.text_content} onChange={event => onUpdate(note.id, { text_content: event.target.value })} className="min-h-36 resize-y bg-background text-base" />}
            {mode === "draw" && note.text_content && <p className="text-sm whitespace-pre-wrap break-words">{note.text_content}</p>}
            {mode === "type" && note.drawing_content && <DrawingBlock readOnly content={note.drawing_content} onChange={() => {}} />}
          </div>
        </>
      )}
    </div>
  );
}

export function MarginNotesLayer(props: Props) {
  return <>{props.notes.map(note => <FloatingNote key={note.id} {...props} note={note} />)}</>;
}

export function DeletedMarginNotes({ notes, onRestore }: { notes: MarginNote[]; onRestore: (id: string) => void }) {
  return <div className="space-y-2">{notes.map(note => <div key={note.id} className="flex items-center justify-between gap-2"><span className="text-sm line-clamp-1">{note.text_content || note.anchor_text || "Drawing"}</span><Button variant="ghost" size="icon" title="Restore margin note" aria-label="Restore margin note" onClick={() => onRestore(note.id)}><RotateCcw className="h-4 w-4" /></Button></div>)}</div>;
}