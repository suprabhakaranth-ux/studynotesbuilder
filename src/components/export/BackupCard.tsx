import { useRef, useState } from "react";
import { saveAs } from "file-saver";
import { DatabaseBackup, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { buildBackup, restoreMissing, LAST_BACKUP_KEY } from "@/lib/backup";

export function BackupCard({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<"backup" | "restore" | null>(null);
  const [last, setLast] = useState(() => localStorage.getItem(LAST_BACKUP_KEY));
  const input = useRef<HTMLInputElement>(null);

  const backup = async () => {
    setBusy("backup");
    try {
      const file = await buildBackup(userId);
      const day = file.created_at.slice(0, 10);
      saveAs(new Blob([JSON.stringify(file)], { type: "application/json" }), `study-notes-backup-${day}.json`);
      localStorage.setItem(LAST_BACKUP_KEY, file.created_at);
      setLast(file.created_at);
      toast({ title: "Backup downloaded", description: `${file.data.topics.length} topics saved to your Downloads folder.` });
    } catch {
      toast({ title: "Backup failed", description: "Please check your connection and try again.", variant: "destructive" });
    } finally { setBusy(null); }
  };

  const restore = async (f: File) => {
    setBusy("restore");
    try {
      const n = await restoreMissing(JSON.parse(await f.text()), userId);
      toast({ title: n ? `Added back ${n} missing topics` : "Nothing missing", description: "Existing notes were not changed." });
    } catch (e: any) {
      toast({ title: "Restore failed", description: e?.message || "Could not read this file.", variant: "destructive" });
    } finally { setBusy(null); if (input.current) input.current.value = ""; }
  };

  return (
    <Card className="p-4 mb-6 flex flex-wrap items-center gap-3">
      <DatabaseBackup className="w-6 h-6 text-primary" />
      <div className="flex-1 min-w-[220px]">
        <h2 className="font-semibold">Backup all notes</h2>
        <p className="text-xs text-muted-foreground">
          Downloads one file with everything to your Downloads folder. {last ? `Last backup: ${new Date(last).toLocaleString()}` : "No backup yet."}
        </p>
      </div>
      <Button onClick={backup} disabled={!!busy}>{busy === "backup" ? "Preparing…" : "Backup all notes"}</Button>
      <Button variant="outline" onClick={() => input.current?.click()} disabled={!!busy}>
        <Upload className="w-4 h-4 mr-2" />{busy === "restore" ? "Restoring…" : "Restore from backup"}
      </Button>
      <input ref={input} type="file" accept="application/json,.json" className="hidden" onChange={e => e.target.files?.[0] && restore(e.target.files[0])} />
    </Card>
  );
}
