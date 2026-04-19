import { useState, useEffect, useMemo } from "react";
import katex from "katex";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { latexToImage, buildFormulaImageHtml } from "@/utils/formulaToImage";

type InsertMode = "inline" | "display" | "image";

interface MathInsertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the HTML/text snippet to insert at the cursor. */
  onInsert: (snippet: string) => void;
  initialLatex?: string;
}

const EXAMPLES = [
  { label: "Quadratic", latex: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}" },
  { label: "Regression", latex: "b = \\frac{\\sum xy - \\frac{(\\sum x)(\\sum y)}{n}}{\\sum x^2 - \\frac{(\\sum x)^2}{n}}" },
  { label: "Einstein", latex: "E = mc^2" },
  { label: "Sum", latex: "\\sum_{i=1}^{n} x_i" },
];

export const MathInsertDialog = ({
  open,
  onOpenChange,
  onInsert,
  initialLatex = "",
}: MathInsertDialogProps) => {
  const [latex, setLatex] = useState(initialLatex);
  const [mode, setMode] = useState<InsertMode>("display");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setLatex(initialLatex);
      setMode("display");
    }
  }, [open, initialLatex]);

  const previewHtml = useMemo(() => {
    if (!latex.trim()) {
      return '<span class="text-muted-foreground text-sm">Preview appears here…</span>';
    }
    try {
      return katex.renderToString(latex, {
        displayMode: mode !== "inline",
        throwOnError: true,
        output: "html",
      });
    } catch (e: any) {
      const msg = e?.message || "Invalid LaTeX";
      return `<span class="text-destructive text-sm">${escapeHtml(msg)}</span>`;
    }
  }, [latex, mode]);

  const isValid = useMemo(() => {
    if (!latex.trim()) return false;
    try {
      katex.renderToString(latex, { throwOnError: true });
      return true;
    } catch {
      return false;
    }
  }, [latex]);

  const handleInsert = async () => {
    const trimmed = latex.trim();
    if (!trimmed) return;

    if (mode === "image") {
      try {
        setBusy(true);
        const dataUrl = await latexToImage(trimmed, true);
        const html = buildFormulaImageHtml(dataUrl, trimmed, true);
        onInsert(html);
        onOpenChange(false);
      } catch (err) {
        console.error("Formula → image failed", err);
        toast({
          title: "Image render failed",
          description: "Could not convert formula to image.",
          variant: "destructive",
        });
      } finally {
        setBusy(false);
      }
      return;
    }

    const snippet = mode === "display" ? `$$${trimmed}$$` : `$${trimmed}$`;
    onInsert(snippet);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Insert math formula</DialogTitle>
          <DialogDescription>
            Paste LaTeX from ChatGPT, Claude, Wikipedia, or type your own.
            Choose how it should be inserted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="latex-input" className="text-sm">LaTeX</Label>
            <Textarea
              id="latex-input"
              value={latex}
              onChange={(e) => setLatex(e.target.value)}
              placeholder={"e.g.  x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}"}
              className="font-mono text-sm min-h-[100px] mt-1"
              autoFocus
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground self-center">Examples:</span>
            {EXAMPLES.map((ex) => (
              <Button
                key={ex.label}
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => setLatex(ex.latex)}
              >
                {ex.label}
              </Button>
            ))}
          </div>

          <div>
            <Label className="text-sm mb-2 block">Insert as</Label>
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as InsertMode)}
              className="flex flex-wrap gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="inline" id="m-inline" />
                <Label htmlFor="m-inline" className="text-sm font-normal cursor-pointer">
                  Inline <span className="text-muted-foreground">($…$)</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="display" id="m-display" />
                <Label htmlFor="m-display" className="text-sm font-normal cursor-pointer">
                  Display <span className="text-muted-foreground">($$…$$, centered)</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="image" id="m-image" />
                <Label htmlFor="m-image" className="text-sm font-normal cursor-pointer">
                  Image <span className="text-muted-foreground">(PNG fallback)</span>
                </Label>
              </div>
            </RadioGroup>
            {mode === "image" && (
              <p className="text-xs text-muted-foreground mt-2">
                Inserted as a PNG. Best for pixel-perfect appearance or formulas
                that won't render as text.
              </p>
            )}
          </div>

          <div>
            <Label className="text-sm">Preview</Label>
            <div
              className="mt-1 rounded-md border border-border bg-muted/30 p-4 min-h-[80px] flex items-center justify-center overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleInsert} disabled={!isValid || busy}>
            {busy ? "Rendering…" : mode === "image" ? "Insert as image" : "Insert"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const escapeHtml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
