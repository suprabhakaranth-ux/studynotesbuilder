import { useEffect, useMemo, useState } from "react";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sanitizePublicHtml } from "@/utils/sanitizePublicHtml";

interface Version {
  id: string;
  topic_id: string;
  created_at: string;
  word_count: number;
  blocks: Array<{ type: string; content: string | null }>;
}

/** Hidden-away safety net: lists topics with saved previous versions. */
export function VersionRestorePanel({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [versions, setVersions] = useState<Version[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [topicId, setTopicId] = useState<string | null>(null);
  const [preview, setPreview] = useState<Version | null>(null);
  const [confirm, setConfirm] = useState<Version | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("topic_versions")
      .select("id, topic_id, created_at, word_count, blocks")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    const rows = (data || []) as unknown as Version[];
    setVersions(rows);
    const ids = [...new Set(rows.map(r => r.topic_id))];
    if (ids.length) {
      const { data: t } = await supabase.from("topics").select("id, title").in("id", ids);
      setTitles(Object.fromEntries((t || []).map(x => [x.id, x.title])));
    }
  };
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [userId]);

  const topicIds = useMemo(() => [...new Set(versions.map(v => v.topic_id))]
    .filter(id => titles[id] && titles[id].toLowerCase().includes(query.toLowerCase())), [versions, titles, query]);

  const restore = async () => {
    if (!confirm || typed !== "RESTORE") return;
    setBusy(true);
    const { error } = await supabase.rpc("restore_topic_version", { _version_id: confirm.id });
    setBusy(false);
    if (error) {
      toast({ title: "Restore failed", description: "Nothing was changed. Please try again.", variant: "destructive" });
      return;
    }
    toast({ title: "Version restored", description: "The text you replaced is kept as a previous version, so you can undo this." });
    setConfirm(null); setTyped("");
    void load();
  };

  const list = versions.filter(v => v.topic_id === topicId);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <p className="text-sm text-muted-foreground">
        The app keeps the last 2 saved versions of each topic. Use this only if a topic's notes were lost or changed by mistake.
      </p>
      {!topicId ? (
        <>
          <Input placeholder="Search topic…" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search topic" />
          {topicIds.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">No previous versions yet. They appear after you edit a topic.</p>
          ) : topicIds.map(id => (
            <Card key={id} className="cursor-pointer hover:border-primary" onClick={() => setTopicId(id)}>
              <CardContent className="p-4 flex items-center gap-3">
                <History className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium flex-1">{titles[id]}</span>
                <span className="text-xs text-muted-foreground">{versions.filter(v => v.topic_id === id).length} versions</span>
              </CardContent>
            </Card>
          ))}
        </>
      ) : (
        <>
          <Button variant="ghost" size="sm" onClick={() => setTopicId(null)}>← All topics</Button>
          <h3 className="text-lg font-semibold">{titles[topicId]}</h3>
          {list.map(v => (
            <Card key={v.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{new Date(v.created_at).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{v.word_count} words</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPreview(v)}>Preview</Button>
                  <Button variant="secondary" size="sm" onClick={() => { setConfirm(v); setTyped(""); }}>Restore</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}

      <Dialog open={!!preview} onOpenChange={o => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Preview (read-only)</DialogTitle></DialogHeader>
          <div className="prose max-w-none">
            {preview?.blocks.filter(b => b.type !== "drawing").map((b, i) => (
              <div key={i} dangerouslySetInnerHTML={{ __html: sanitizePublicHtml(b.content || "") }} />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirm} onOpenChange={o => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore this version?</DialogTitle>
            <DialogDescription>
              The topic's current notes will be replaced by the version from {confirm && new Date(confirm.created_at).toLocaleString()}.
              The current notes are kept as a previous version. Type RESTORE to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input value={typed} onChange={e => setTyped(e.target.value)} placeholder="RESTORE" aria-label="Type RESTORE to confirm" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button disabled={typed !== "RESTORE" || busy} onClick={restore}>{busy ? "Restoring…" : "Restore"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
