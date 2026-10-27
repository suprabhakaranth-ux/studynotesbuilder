import { useRef, useState } from "react";
import { GripHorizontal, Highlighter, MoveDiagonal2, PenLine, Type, X, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DrawingBlock } from "./DrawingBlock";
import { MarginNoteEditor } from "./MarginNoteEditor";
import type { MarginNote } from "@/hooks/useMarginNotes";

interface Props {
  notes: MarginNote[];
  closed: Set<string>;
  onClose: (id: string) => void;
  onOpen: (id: string) => void;
  onUpdate: (id: string, patch: Partial<MarginNote>) => void;
  onCollate: (id: string) => void;
}

const MIN_WIDTH = 220;
const MIN_HEIGHT = 160;
const PIN_SIZE = 40;
const EDGE = 6;

type ResizeDir = "e" | "s" | "se";

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

function FloatingNote({ note, closed, onClose, onOpen, onUpdate, onCollate }: Props & { note: MarginNote }) {
  const [mode, setMode] = useState<"draw" | "type">(note.text_content ? "type" : "draw");
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const drag = useRef<{ clientX: number; clientY: number; x: number; y: number; width: number; cardWidth: number }>();
  const pinDrag = useRef<{ clientX: number; clientY: number; x: number; y: number; width: number; moved: boolean }>();
  const resize = useRef<{ clientX: number; clientY: number; w: number; h: number; dir: ResizeDir }>();
  const [frozenLeft, setFrozenLeft] = useState<number | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const collapsed = closed.has(note.id);

  const cardWidth = size?.w ?? note.width ?? 390;
  const bodyHeight = size?.h ?? note.height ?? null;

  // Dragging the open card by its header.
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

  // Dragging the closed pin badge; a quick click (no movement) opens the note.
  const startPinDrag = (event: React.PointerEvent) => {
    const parent = card.current?.parentElement;
    if (!parent) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pinDrag.current = { clientX: event.clientX, clientY: event.clientY, x: note.pin_x ?? 1, y: note.pin_y ?? note.y, width: parent.clientWidth, moved: false };
  };
  const movePin = (event: React.PointerEvent) => {
    const d = pinDrag.current;
    if (!d) return;
    if (Math.abs(event.clientX - d.clientX) + Math.abs(event.clientY - d.clientY) > 5) d.moved = true;
    if (!d.moved) return;
    setPosition({
      x: Math.max(0, Math.min(Math.max(0, 1 - PIN_SIZE / d.width), d.x + (event.clientX - d.clientX) / d.width)),
      y: Math.max(0, d.y + event.clientY - d.clientY),
    });
  };
  const endPinDrag = () => {
    const d = pinDrag.current;
    pinDrag.current = undefined;
    if (!d) return;
    if (d.moved && position) onUpdate(note.id, { pin_x: position.x, pin_y: position.y });
    else if (!d.moved) onOpen(note.id);
    setPosition(null);
  };

  // Resizing the open card from its right edge, bottom edge, or corner.
  const startResize = (dir: ResizeDir) => (event: React.PointerEvent) => {
    if (!card.current) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    resize.current = { clientX: event.clientX, clientY: event.clientY, w: cardWidth, h: bodyHeight ?? card.current.clientHeight - 44, dir };
    // Keep the left edge still while resizing so the card does not shift.
    setFrozenLeft(card.current.offsetLeft);
  };
  const moveResize = (event: React.PointerEvent) => {
    const r = resize.current;
    if (!r) return;
    setSize({
      w: r.dir === "s" ? r.w : Math.max(MIN_WIDTH, Math.min(window.innerWidth - 24, r.w + event.clientX - r.clientX)),
      h: r.dir === "e" ? r.h : Math.max(MIN_HEIGHT, Math.min(window.innerHeight - 120, r.h + event.clientY - r.clientY)),
    });
  };
  const endResize = () => {
    const r = resize.current;
    resize.current = undefined;
    if (!r) return;
    if (size) {
      const parentWidth = card.current?.parentElement?.clientWidth || 1;
      const patch: Partial<MarginNote> = { width: Math.round(size.w), height: Math.round(size.h) };
      // Store the frozen left so the card stays exactly where it was released.
      if (frozenLeft != null) patch.x = Math.max(0, Math.min(1, frozenLeft / parentWidth));
      onUpdate(note.id, patch);
    }
    setSize(null);
    setFrozenLeft(null);
  };

  const pinX = position?.x ?? note.pin_x;
  const pinY = position?.y ?? note.pin_y ?? note.y;

  return (
    <div ref={card} data-margin-note={note.id} className={collapsed ? "margin-note-marker" : "margin-note-card"}
      style={collapsed
        ? pinX != null
          ? { left: `min(${pinX * 100}%, max(0px, calc(100% - ${PIN_SIZE}px)))`, top: pinY }
          : { right: 8, top: pinY }
        : { left: frozenLeft != null ? frozenLeft : `min(${(position?.x ?? note.x) * 100}%, max(0px, calc(100% - ${cardWidth + 16}px)))`, top: position?.y ?? note.y, width: cardWidth }}>
      {collapsed ? (
        <Button variant="secondary" size="icon" className="h-9 w-9 shadow-md cursor-grab touch-none" aria-label="Open margin note" title={`${stripHtml(note.anchor_text) || "Open margin note"} — drag to move, click to open`}
          onPointerDown={startPinDrag} onPointerMove={movePin} onPointerUp={endPinDrag} onPointerCancel={endPinDrag}><PenLine className="h-4 w-4" /></Button>
      ) : (
        <>
          <div className="flex items-center gap-1 border-b border-border p-1 cursor-grab touch-none" onPointerDown={startDrag} onPointerMove={move} onPointerUp={endDrag} onPointerCancel={endDrag} aria-label="Move margin note" title="Drag to move">
            <GripHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs font-medium flex-1">Margin note</span>
            <Button variant={mode === "draw" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" title="Draw" aria-label="Draw" onClick={() => setMode("draw")}><PenLine className="h-4 w-4" /></Button>
            <Button variant={mode === "type" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" title="Type" aria-label="Type" onClick={() => setMode("type")}><Type className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Collate highlights from note" aria-label="Collate highlights from note" onClick={() => { setMode("type"); onCollate(note.id); }}><Highlighter className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" title="Delete margin note" aria-label="Delete margin note" onClick={() => onUpdate(note.id, { deleted_at: new Date().toISOString() })}><Trash2 className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Close margin note" aria-label="Close margin note" onClick={() => onClose(note.id)}><X className="h-4 w-4" /></Button>
          </div>
          <div data-margin-scroll className="p-2 space-y-2 overflow-auto" style={{ overflowAnchor: "none", ...(bodyHeight ? { height: bodyHeight } : { maxHeight: "70vh" }) }}>
            {note.anchor_text && <p className="text-xs text-muted-foreground border-l-2 border-primary pl-2 line-clamp-2">{stripHtml(note.anchor_text)}</p>}
            {mode === "draw" ? <DrawingBlock content={note.drawing_content} onChange={drawing_content => onUpdate(note.id, { drawing_content })} /> : <MarginNoteEditor value={note.text_content} onChange={text_content => onUpdate(note.id, { text_content })} />}
            {mode === "draw" && note.text_content && <div className="text-sm break-words [&_ul]:list-disc [&_ul]:pl-5 [&_p]:my-1" dangerouslySetInnerHTML={{ __html: note.text_content }} />}
            {mode === "type" && note.drawing_content && <DrawingBlock readOnly content={note.drawing_content} onChange={() => {}} />}
          </div>
          <div className="absolute top-2 bottom-2 right-0 cursor-ew-resize touch-none" style={{ width: EDGE }} aria-label="Resize margin note width" title="Drag to resize width"
            onPointerDown={startResize("e")} onPointerMove={moveResize} onPointerUp={endResize} onPointerCancel={endResize} />
          <div className="absolute left-2 right-2 bottom-0 cursor-ns-resize touch-none" style={{ height: EDGE }} aria-label="Resize margin note height" title="Drag to resize height"
            onPointerDown={startResize("s")} onPointerMove={moveResize} onPointerUp={endResize} onPointerCancel={endResize} />
          <div className="absolute bottom-0 right-0 h-5 w-5 cursor-nwse-resize touch-none flex items-center justify-center text-muted-foreground" aria-label="Resize margin note" title="Drag to resize"
            onPointerDown={startResize("se")} onPointerMove={moveResize} onPointerUp={endResize} onPointerCancel={endResize}><MoveDiagonal2 className="h-3 w-3" /></div>
        </>
      )}
    </div>
  );
}

export function MarginNotesLayer(props: Props) {
  return <>{props.notes.map(note => <FloatingNote key={note.id} {...props} note={note} />)}</>;
}

export function DeletedMarginNotes({ notes, onRestore }: { notes: MarginNote[]; onRestore: (id: string) => void }) {
  return <div className="space-y-2">{notes.map(note => <div key={note.id} className="flex items-center justify-between gap-2"><span className="text-sm line-clamp-1">{stripHtml(note.text_content) || stripHtml(note.anchor_text) || "Drawing"}</span><Button variant="ghost" size="icon" title="Restore margin note" aria-label="Restore margin note" onClick={() => onRestore(note.id)}><RotateCcw className="h-4 w-4" /></Button></div>)}</div>;
}
