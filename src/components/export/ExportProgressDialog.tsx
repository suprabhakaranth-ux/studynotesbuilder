import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import type { ProgressEvent } from "@/lib/export/types";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  events: ProgressEvent[];
  done: boolean;
  error: string | null;
  onClose: () => void;
}

const STAGE_LABEL: Record<string, string> = {
  fetching: "Loading data",
  rendering: "Rendering topics",
  html: "Building HTML",
  pdf: "Building PDF",
  docx: "Building Word document",
  zipping: "Packaging ZIP",
  done: "Done",
  error: "Error",
};

export function ExportProgressDialog({ open, events, done, error, onClose }: Props) {
  const last = events[events.length - 1];
  const percent = last?.percent ?? (done ? 100 : 0);
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && (done || error)) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {error ? "Export failed" : done ? "Study Pack ready" : "Generating Study Pack…"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {!error && (
            <>
              <Progress value={percent} />
              <div className="text-sm text-muted-foreground">
                {last?.message || "Starting…"}
              </div>
            </>
          )}

          {error && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="max-h-48 overflow-y-auto border rounded p-2 text-xs space-y-1 bg-muted/30">
            {events.map((e, i) => (
              <div key={i} className="flex items-center gap-2">
                {i === events.length - 1 && !done && !error ? (
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                ) : (
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                )}
                <span className="font-mono text-[10px] text-muted-foreground">
                  {STAGE_LABEL[e.stage] || e.stage}
                </span>
                <span className="text-foreground/80">{e.message}</span>
              </div>
            ))}
          </div>

          {(done || error) && (
            <button
              onClick={onClose}
              className="text-sm text-primary underline hover:no-underline"
            >
              Close
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
