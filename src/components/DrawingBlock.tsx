import { useEffect, useRef, useState, useCallback } from "react";
import { getStroke } from "perfect-freehand";
import { Pen, Highlighter, Eraser, Undo2, Redo2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Tool = "pen" | "highlighter" | "eraser";
interface Stroke {
  points: [number, number, number][];
  color: string;
  size: number;
  tool: "pen" | "highlighter";
}

const WIDTH = 1000;
const HEIGHT = 500;
const PEN_COLORS = ["#1f2937", "#2563eb", "#dc2626", "#16a34a", "#d97706", "#7c3aed"];
const HL_COLORS = ["#fde047", "#f9a8d4", "#86efac", "#93c5fd"];
const SIZES = [3, 6, 10];

function toPath(stroke: Stroke) {
  const outline = getStroke(stroke.points, {
    size: stroke.tool === "highlighter" ? stroke.size * 3 : stroke.size,
    thinning: stroke.tool === "highlighter" ? 0 : 0.6,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: stroke.points.every((p) => p[2] === 0.5),
  });
  if (!outline.length) return "";
  const d = outline.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0.toFixed(1), y0.toFixed(1), ((x0 + x1) / 2).toFixed(1), ((y0 + y1) / 2).toFixed(1));
      return acc;
    },
    ["M", ...outline[0].map((n) => n.toFixed(1)), "Q"] as string[],
  );
  return d.join(" ") + " Z";
}

function parse(content: string): Stroke[] {
  const m = content.match(/data-strokes="([^"]*)"/);
  if (!m) return [];
  try {
    return JSON.parse(decodeURIComponent(m[1]));
  } catch {
    return [];
  }
}

function serialize(strokes: Stroke[]) {
  if (!strokes.length) return "";
  const paths = strokes
    .map((s) => `<path d="${toPath(s)}" fill="${s.color}"${s.tool === "highlighter" ? ' fill-opacity="0.4"' : ""}/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" data-scribble="1" data-strokes="${encodeURIComponent(
    JSON.stringify(strokes),
  )}">${paths}</svg>`;
}

interface Props {
  content: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
}

export const DrawingBlock = ({ content, onChange, readOnly }: Props) => {
  const [strokes, setStrokes] = useState<Stroke[]>(() => parse(content));
  const [redo, setRedo] = useState<Stroke[]>([]);
  const [current, setCurrent] = useState<Stroke | null>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(PEN_COLORS[0]);
  const [size, setSize] = useState(SIZES[0]);
  const svgRef = useRef<SVGSVGElement>(null);
  const penSeen = useRef(false);

  const commit = useCallback(
    (next: Stroke[]) => {
      setStrokes(next);
      onChange(serialize(next));
    },
    [onChange],
  );

  // Keep in sync if content changes from outside (e.g. reload)
  useEffect(() => {
    if (!current) setStrokes(parse(content));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  const pt = (e: React.PointerEvent): [number, number, number] => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return [0, 0, 0.5];
    return [
      ((e.clientX - r.left) / r.width) * WIDTH,
      ((e.clientY - r.top) / r.height) * HEIGHT,
      e.pointerType === "pen" ? e.pressure || 0.5 : 0.5,
    ];
  };

  const eraseAt = (p: [number, number, number]) => {
    const hit = strokes.findIndex((s) => s.points.some(([x, y]) => Math.hypot(x - p[0], y - p[1]) < 14));
    if (hit >= 0) {
      setRedo([]);
      commit(strokes.filter((_, i) => i !== hit));
    }
  };

  const onDown = (e: React.PointerEvent) => {
    if (readOnly) return;
    if (e.pointerType === "pen") penSeen.current = true;
    // Palm rejection: once a pencil is used, ignore finger touches (lets fingers scroll)
    if (penSeen.current && e.pointerType === "touch") return;
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    const p = pt(e);
    if (tool === "eraser") return eraseAt(p);
    setCurrent({ points: [p], color, size, tool });
  };

  const onMove = (e: React.PointerEvent) => {
    if (readOnly) return;
    if (penSeen.current && e.pointerType === "touch") return;
    if (tool === "eraser" && e.buttons) return eraseAt(pt(e));
    if (!current) return;
    const coalesced = (e.nativeEvent as PointerEvent).getCoalescedEvents?.();
    const events = coalesced?.length ? coalesced : [e.nativeEvent];
    const pts = events.map((ev) => pt(ev as unknown as React.PointerEvent));
    setCurrent({ ...current, points: [...current.points, ...pts] });
  };

  const onUp = () => {
    if (!current) return;
    setRedo([]);
    commit([...strokes, current]);
    setCurrent(null);
  };

  const pickTool = (t: Tool) => {
    setTool(t);
    if (t === "highlighter" && !HL_COLORS.includes(color)) setColor(HL_COLORS[0]);
    if (t === "pen" && !PEN_COLORS.includes(color)) setColor(PEN_COLORS[0]);
  };

  const all = current ? [...strokes, current] : strokes;
  const palette = tool === "highlighter" ? HL_COLORS : PEN_COLORS;

  return (
    <div className="space-y-2">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1">
          {([
            ["pen", Pen, "Pen"],
            ["highlighter", Highlighter, "Highlighter"],
            ["eraser", Eraser, "Eraser"],
          ] as const).map(([t, Icon, label]) => (
            <Button
              key={t}
              size="sm"
              variant={tool === t ? "default" : "ghost"}
              className="h-8 w-8 p-0"
              onClick={() => pickTool(t)}
              title={label}
              aria-label={label}
            >
              <Icon className="w-4 h-4" />
            </Button>
          ))}
          <span className="mx-1 h-6 w-px bg-border" />
          {tool !== "eraser" &&
            palette.map((c) => (
              <Button
                variant="ghost"
                size="icon"
                key={c}
                onClick={() => setColor(c)}
                aria-label={`Colour ${c}`}
                className={cn(
                  "h-6 w-6 rounded-full border-2 transition-transform",
                  color === c ? "border-foreground scale-110" : "border-transparent",
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          {tool !== "eraser" && <span className="mx-1 h-6 w-px bg-border" />}
          {tool !== "eraser" &&
            SIZES.map((s) => (
              <Button
                variant="ghost"
                size="icon"
                key={s}
                onClick={() => setSize(s)}
                aria-label={`Thickness ${s}`}
                className={cn(
                  "h-8 w-8 rounded-md flex items-center justify-center",
                  size === s ? "bg-muted" : "hover:bg-muted/60",
                )}
              >
                <span className="rounded-full bg-foreground" style={{ width: s + 2, height: s + 2 }} />
              </Button>
            ))}
          <span className="mx-1 h-6 w-px bg-border" />
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Undo" aria-label="Undo"
            disabled={!strokes.length}
            onClick={() => { setRedo([strokes[strokes.length - 1], ...redo]); commit(strokes.slice(0, -1)); }}>
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Redo" aria-label="Redo"
            disabled={!redo.length}
            onClick={() => { commit([...strokes, redo[0]]); setRedo(redo.slice(1)); }}>
            <Redo2 className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:text-destructive" title="Clear drawing" aria-label="Clear drawing"
            disabled={!strokes.length}
            onClick={() => { if (confirm("Clear the whole drawing?")) { setRedo([]); commit([]); } }}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className={cn(
          "w-full rounded-lg border border-border bg-background select-none",
          !readOnly && (tool === "eraser" ? "cursor-cell" : "cursor-crosshair"),
        )}
        aria-label="Scribble canvas"
        style={{ touchAction: readOnly ? "auto" : "none", aspectRatio: `${WIDTH} / ${HEIGHT}` }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onPointerLeave={onUp}
      >
        {all.map((s, i) => (
          <path key={i} d={toPath(s)} fill={s.color} fillOpacity={s.tool === "highlighter" ? 0.4 : 1} />
        ))}
      </svg>
    </div>
  );
};
