import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Package, Eye, Sparkles, X, ExternalLink } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { saveAs } from "file-saver";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ExportTree } from "@/components/export/ExportTree";
import { ExportProgressDialog } from "@/components/export/ExportProgressDialog";
import { fetchHierarchy } from "@/lib/export/fetchStudyData";
import { buildStudyPack, type StudyPackArtifacts } from "@/lib/export/zipStudyPack";
import type {
  ExportSubject,
  ExportChapter,
  ExportTopic,
  ExportOptions,
  ProgressEvent,
} from "@/lib/export/types";

interface ExportCenterProps {
  embedded?: boolean;
  onBack?: () => void;
}

export default function ExportCenter({ embedded = false, onBack }: ExportCenterProps) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [subjects, setSubjects] = useState<ExportSubject[]>([]);
  const [chapters, setChapters] = useState<ExportChapter[]>([]);
  const [topics, setTopics] = useState<ExportTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [opts, setOpts] = useState<ExportOptions>({
    paper: "a4",
    includeSummary: true,
    includeMnemonic: true,
    includeOutline: true,
  });

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<ProgressEvent[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    (async () => {
      try {
        const h = await fetchHierarchy(user.id);
        setSubjects(h.subjects);
        setChapters(h.chapters);
        setTopics(h.topics);
      } catch (e: any) {
        toast({
          title: "Failed to load",
          description: e?.message || "Could not load hierarchy.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [user, authLoading, navigate, toast]);

  const allTopicIds = useMemo(() => topics.map((t) => t.id), [topics]);
  const selectAll = () => setSelected(new Set(allTopicIds));
  const deselectAll = () => setSelected(new Set());

  const selectedCount = selected.size;
  const selectedChapterCount = useMemo(() => {
    const chSet = new Set<string>();
    topics.forEach((t) => {
      if (selected.has(t.id) && t.chapter_id) chSet.add(t.chapter_id);
    });
    return chSet.size;
  }, [selected, topics]);
  const selectedSubjectCount = useMemo(() => {
    const sSet = new Set<string>();
    topics.forEach((t) => {
      if (selected.has(t.id) && t.subject_id) sSet.add(t.subject_id);
    });
    return sSet.size;
  }, [selected, topics]);

  // Page estimate: cover (1) + TOC (~1 per 40 topics) + topics * 2 avg
  const estimatedPages = selectedCount === 0
    ? 0
    : 1 + Math.max(1, Math.ceil(selectedCount / 40)) + selectedCount * 2;

  const [artifacts, setArtifacts] = useState<StudyPackArtifacts | null>(null);
  const [format, setFormat] = useState<"zip" | "pdf" | "docx" | "html">("pdf");

  // Invalidate a previously built pack when selection or options change.
  useEffect(() => {
    setArtifacts(null);
  }, [selected, opts]);

  const onGenerate = async () => {
    if (!user || selected.size === 0) return;
    setRunning(true);
    setProgress([]);
    setDone(false);
    setError(null);
    setArtifacts(null);
    setDialogOpen(true);
    try {
      const built = await buildStudyPack({
        topicIds: Array.from(selected),
        userId: user.id,
        opts,
        onProgress: (e) => setProgress((p) => [...p, e]),
      });
      setArtifacts(built);
      setDone(true);
      toast({
        title: "Study Pack ready",
        description: `Choose a format to download or view online.`,
      });
    } catch (e: any) {
      console.error("Study Pack failed:", e);
      setError(e?.message || "Unknown error.");
    } finally {
      setRunning(false);
    }
  };

  const getBlobForFormat = (a: StudyPackArtifacts, f: typeof format): { blob: Blob; filename: string; viewable: boolean } => {
    switch (f) {
      case "zip":  return { blob: a.zipBlob,  filename: a.zipFilename,               viewable: false };
      case "pdf":  return { blob: a.pdfBlob,  filename: `StudyPack-${a.stamp}.pdf`,  viewable: true  };
      case "docx": return { blob: a.docxBlob, filename: `StudyPack-${a.stamp}.docx`, viewable: false };
      case "html": return { blob: a.htmlBlob, filename: `StudyPack-${a.stamp}.html`, viewable: true  };
    }
  };

  const onDownload = () => {
    if (!artifacts) return;
    const { blob, filename } = getBlobForFormat(artifacts, format);
    saveAs(blob, filename);
  };

  const onView = () => {
    if (!artifacts) return;
    const { blob, viewable } = getBlobForFormat(artifacts, format);
    if (!viewable) {
      toast({
        title: "Preview not available",
        description: "Word and ZIP formats can't be viewed in-browser. Please download instead.",
        variant: "destructive",
      });
      return;
    }
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  return (
    <div className={embedded ? "bg-background" : "min-h-screen bg-background"}>
      <div className={embedded ? "p-8" : "max-w-4xl mx-auto p-6"}>
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => (embedded ? onBack?.() : navigate("/app"))}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Export Center</h1>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
          Generate a self-contained <strong>Study Pack</strong> — a single ZIP
          containing PDF, Word, and standalone HTML versions of your notes.
          Designed as a long-term offline backup that stays usable even without
          this application.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 p-0 overflow-hidden">
            <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 p-3 border-b bg-card/95 backdrop-blur">
              <h2 className="font-semibold mr-2">Select what to export</h2>
              <span className="text-sm text-muted-foreground">
                {selectedCount === 0
                  ? "Select at least one topic to enable export"
                  : `${selectedCount} topic${selectedCount === 1 ? "" : "s"} selected`}
              </span>
              <div className="flex gap-2 ml-auto">
                <Button size="sm" variant="outline" onClick={selectAll} disabled={loading}>
                  Select all
                </Button>
                <Button size="sm" variant="outline" onClick={deselectAll} disabled={loading}>
                  Deselect all
                </Button>
                <Button
                  size="sm"
                  disabled={selectedCount === 0 || running}
                  onClick={onGenerate}
                  variant={artifacts ? "outline" : "default"}
                >
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  {running ? "Generating…" : artifacts ? "Regenerate" : "Generate Study Pack"}
                </Button>
              </div>
            </div>
            <div className="p-4">
              {loading ? (
                <div className="text-sm text-muted-foreground p-4">Loading hierarchy…</div>
              ) : (
                <div className="max-h-[60vh] overflow-y-auto">
                  <ExportTree
                    subjects={subjects}
                    chapters={chapters}
                    topics={topics}
                    selectedTopicIds={selected}
                    onChange={setSelected}
                  />
                </div>
              )}
            </div>
          </Card>

          <Card className="p-4 space-y-4 h-fit sticky top-4">
            <div>
              <h2 className="font-semibold mb-2">Summary</h2>
              <div className="text-sm space-y-1">
                <div>{selectedSubjectCount} subject{selectedSubjectCount === 1 ? "" : "s"}</div>
                <div>{selectedChapterCount} chapter{selectedChapterCount === 1 ? "" : "s"}</div>
                <div className="font-medium">
                  {selectedCount} topic{selectedCount === 1 ? "" : "s"} selected
                </div>
                <div className="text-muted-foreground text-xs">
                  ≈ {estimatedPages} pages
                </div>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <h3 className="font-semibold text-sm">Options</h3>

              <div className="flex items-center justify-between">
                <Label htmlFor="paper" className="text-sm">Paper</Label>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={opts.paper === "a4" ? "default" : "outline"}
                    onClick={() => setOpts({ ...opts, paper: "a4" })}
                  >
                    A4
                  </Button>
                  <Button
                    size="sm"
                    variant={opts.paper === "letter" ? "default" : "outline"}
                    onClick={() => setOpts({ ...opts, paper: "letter" })}
                  >
                    Letter
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="outline" className="text-sm">Include outline</Label>
                <Switch
                  id="outline"
                  checked={opts.includeOutline}
                  onCheckedChange={(c) => setOpts({ ...opts, includeOutline: c })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="summary" className="text-sm">Include Summary tab</Label>
                <Switch
                  id="summary"
                  checked={opts.includeSummary}
                  onCheckedChange={(c) => setOpts({ ...opts, includeSummary: c })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="mnemonic" className="text-sm">Include Mnemonic tab</Label>
                <Switch
                  id="mnemonic"
                  checked={opts.includeMnemonic}
                  onCheckedChange={(c) => setOpts({ ...opts, includeMnemonic: c })}
                />
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <Button
                className="w-full"
                disabled={selectedCount === 0 || running}
                onClick={onGenerate}
                variant={artifacts ? "outline" : "default"}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {running
                  ? "Generating…"
                  : artifacts
                    ? "Regenerate Study Pack"
                    : "Generate Study Pack"}
              </Button>

              <div className="space-y-2">
                <Label className="text-sm">Format</Label>
                <Select value={format} onValueChange={(v) => setFormat(v as typeof format)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF — paginated, viewable</SelectItem>
                    <SelectItem value="html">HTML — continuous scroll, viewable</SelectItem>
                    <SelectItem value="docx">Word (.docx) — download only</SelectItem>
                    <SelectItem value="zip">ZIP bundle (all formats) — download only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  disabled={!artifacts || format === "docx" || format === "zip"}
                  onClick={onView}
                  title={
                    !artifacts
                      ? "Generate the pack first"
                      : format === "docx" || format === "zip"
                        ? "This format can't be viewed in-browser"
                        : "Open in a new tab"
                  }
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View online
                </Button>
                <Button
                  disabled={!artifacts}
                  onClick={onDownload}
                  title={!artifacts ? "Generate the pack first" : "Download this format"}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>

              {!artifacts && !running && (
                <p className="text-[11px] text-muted-foreground">
                  Generate the pack once, then download or view any format.
                </p>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground">
              Large packs may take a minute or two. Keep this tab open.
            </p>
          </Card>
        </div>
      </div>

      <ExportProgressDialog
        open={dialogOpen}
        events={progress}
        done={done}
        error={error}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
