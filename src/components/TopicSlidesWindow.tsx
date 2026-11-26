import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { GripHorizontal, Link2, Unlink, Maximize2, Minimize2, Upload, X, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PresentationUploadDialog } from "./PresentationUploadDialog";
import { getPresentationPublicUrl, type Presentation } from "@/hooks/usePresentations";

const PdfViewer = lazy(() => import("./PresentationViewer").then(m => ({ default: m.PresentationViewer })));

export default function TopicSlidesWindow({ topicId, onClose }: { topicId: string; onClose: () => void }) {
  const [context, setContext] = useState<{ userId: string; subjectId: string } | null>(null);
  const [items, setItems] = useState<Presentation[]>([]);
  const [linked, setLinked] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [candidate, setCandidate] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [rect, setRect] = useState(() => ({ x: Math.max(8, window.innerWidth - 628), y: 96, w: Math.min(620, window.innerWidth - 16), h: Math.min(650, window.innerHeight - 112) }));
  const motion = useRef<{ x: number; y: number; rect: typeof rect; kind: "move" | "e" | "s" | "se" } | null>(null);
  const request = useRef(0);

  const load = async () => {
    const generation = ++request.current;
    setLoading(true);
    setError("");
    try {
      const topic = await supabase.from("topics").select("subject_id,user_id").eq("id", topicId).single();
      if (topic.error) throw topic.error;
      if (!topic.data.subject_id) throw new Error("This topic needs a subject before slides can be linked.");
      const [decks, links] = await Promise.all([
        supabase.from("presentations").select("*").eq("subject_id", topic.data.subject_id).order("presentation_order"),
        supabase.from("topic_presentation_links").select("presentation_id").eq("topic_id", topicId),
      ]);
      if (decks.error) throw decks.error;
      if (links.error) throw links.error;
      if (request.current !== generation) return;
      setContext({ subjectId: topic.data.subject_id, userId: topic.data.user_id });
      setItems(decks.data || []);
      const ids = (links.data || []).map(l => l.presentation_id);
      setLinked(ids);
      setSelected(previous => ids.includes(previous) ? previous : ids[0] || "");
    } catch (e) {
      if (request.current === generation) setError(e instanceof Error ? e.message : "Could not load slides. Please retry.");
    } finally { if (request.current === generation) setLoading(false); }
  };
  useEffect(() => { void load(); return () => { request.current++; }; }, [topicId]);
  useEffect(() => {
    const fit = () => setRect(previous => {
      const w = Math.min(previous.w, window.innerWidth - 16);
      const h = Math.min(previous.h, window.innerHeight - 16);
      return { w, h, x: Math.max(8, Math.min(previous.x, window.innerWidth - w - 8)), y: Math.max(8, Math.min(previous.y, window.innerHeight - h - 8)) };
    });
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const link = async (id: string) => {
    if (!context) return;
    setBusy(true);
    setError("");
    try {
      const result = await supabase.from("topic_presentation_links").upsert({ topic_id: topicId, presentation_id: id, user_id: context.userId });
      if (result.error) throw result.error;
      await load();
      setSelected(id);
      setCandidate("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not link slides. Please retry."); }
    finally { setBusy(false); }
  };
  const unlink = async () => {
    setBusy(true);
    const result = await supabase.from("topic_presentation_links").delete().eq("topic_id", topicId).eq("presentation_id", selected);
    if (result.error) setError(result.error.message);
    else await load();
    setBusy(false);
  };
  const start = (kind: "move" | "e" | "s" | "se") => (event: React.PointerEvent) => {
    if (maximized || (kind === "move" && (event.target as HTMLElement).closest("button"))) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    motion.current = { x: event.clientX, y: event.clientY, rect, kind };
  };
  const move = (event: React.PointerEvent) => {
    const m = motion.current;
    if (!m) return;
    const dx = event.clientX - m.x, dy = event.clientY - m.y;
    if (m.kind === "move") setRect({ ...m.rect, x: Math.max(0, Math.min(window.innerWidth - m.rect.w, m.rect.x + dx)), y: Math.max(0, Math.min(window.innerHeight - 80, m.rect.y + dy)) });
    else setRect({ ...m.rect,
      w: m.kind === "s" ? m.rect.w : Math.max(Math.min(300, window.innerWidth), Math.min(window.innerWidth - m.rect.x, m.rect.w + dx)),
      h: m.kind === "e" ? m.rect.h : Math.max(240, Math.min(window.innerHeight - m.rect.y, m.rect.h + dy)),
    });
  };
  const stop = () => { motion.current = null; };
  const deck = items.find(i => i.id === selected);
  const url = getPresentationPublicUrl(deck?.file_path);

  return <div role="dialog" aria-label="Topic slides" tabIndex={-1}
    className="fixed z-50 flex flex-col bg-card text-card-foreground border border-border rounded-lg shadow-2xl overflow-hidden"
    style={maximized ? { inset: 0, width: "100%", height: "100dvh" } : { left: rect.x, top: rect.y, width: rect.w, height: rect.h, maxWidth: "100vw", maxHeight: "100dvh" }}
    onKeyDown={event => { if (event.key === "Escape") onClose(); }}>
    <div aria-label="Move slides window" title="Drag to move" className="flex items-center gap-2 border-b p-2 cursor-grab touch-none shrink-0" onPointerDown={start("move")} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop}>
      <GripHorizontal className="h-4 w-4 text-muted-foreground" /><span className="font-medium text-sm flex-1 min-w-0 truncate">Slides / PDF</span>
      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={maximized ? "Restore slides window" : "Maximize slides window"} title={maximized ? "Restore window" : "Maximize"} onClick={() => setMaximized(v => !v)}>{maximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Close slides" title="Close slides" onClick={onClose}><X className="h-4 w-4" /></Button>
    </div>
    <div className="p-3 border-b space-y-2 shrink-0">
      {loading && <p role="status" className="text-sm text-muted-foreground">Loading slide links…</p>}
      {error && <div role="alert" className="text-sm text-destructive flex items-center gap-2"><span className="flex-1 break-words">{error}</span><Button variant="ghost" size="icon" aria-label="Retry slides" onClick={() => void load()}><RotateCcw className="h-4 w-4" /></Button></div>}
      {context && <>
        {linked.some(id => items.some(i => i.id === id)) && <div className="flex gap-2">
          <Select value={selected} onValueChange={setSelected}><SelectTrigger aria-label="Linked slides" className="flex-1 min-w-0"><SelectValue placeholder="Linked slides" /></SelectTrigger><SelectContent>{items.filter(i => linked.includes(i.id)).map(i => <SelectItem key={i.id} value={i.id}>{i.title}</SelectItem>)}</SelectContent></Select>
          <Button variant="ghost" size="icon" title="Unlink from this topic" aria-label="Unlink slides" disabled={busy || !selected} onClick={() => void unlink()}><Unlink className="h-4 w-4" /></Button>
        </div>}
        <div className="flex flex-wrap gap-2">
          <Select value={candidate} onValueChange={setCandidate}><SelectTrigger aria-label="Subject presentations" className="flex-1 min-w-0"><SelectValue placeholder="Choose from subject" /></SelectTrigger><SelectContent>{items.filter(i => !linked.includes(i.id) && i.file_path).map(i => <SelectItem key={i.id} value={i.id}>{i.title}</SelectItem>)}</SelectContent></Select>
          <Button variant="outline" size="icon" title="Link selected slides" aria-label="Link selected slides" disabled={!candidate || busy} onClick={() => void link(candidate)}><Link2 className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" disabled={busy} onClick={() => setUploadOpen(true)}><Upload className="h-4 w-4 mr-2" />Upload PDF</Button>
        </div>
      </>}
    </div>
    <div className="flex-1 min-h-0 overflow-auto bg-muted/30" tabIndex={0} aria-label="Slide pages">
      {url ? <Suspense fallback={<p className="p-4 text-muted-foreground">Opening PDF…</p>}><PdfViewer key={url} fileUrl={url} embedded /></Suspense> : !loading && <p className="p-4 text-sm text-muted-foreground">No PDF selected.</p>}
    </div>
    {context && <PresentationUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} userId={context.userId} subjectId={context.subjectId} onUploaded={p => void link(p.id)} />}
    {!maximized && <>
      <div aria-label="Resize slides width" className="absolute right-0 top-12 bottom-3 w-1.5 cursor-ew-resize touch-none" onPointerDown={start("e")} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} />
      <div aria-label="Resize slides height" className="absolute bottom-0 left-3 right-3 h-1.5 cursor-ns-resize touch-none" onPointerDown={start("s")} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} />
      <div aria-label="Resize slides window" className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize touch-none bg-border" onPointerDown={start("se")} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} />
    </>}
  </div>;
}