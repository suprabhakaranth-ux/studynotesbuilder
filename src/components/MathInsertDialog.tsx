import { useState, useEffect, useMemo, useRef } from "react";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { latexToImage, buildFormulaImageHtml } from "@/utils/formulaToImage";
import { FORMULA_LIBRARY, SYMBOL_PALETTE } from "@/data/formulaLibrary";

type InsertMode = "inline" | "display" | "image";

interface MathInsertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the HTML/text snippet to insert at the cursor. */
  onInsert: (snippet: string) => void;
  initialLatex?: string;
}

export const MathInsertDialog = ({
  open,
  onOpenChange,
  onInsert,
  initialLatex = "",
}: MathInsertDialogProps) => {
  const [latex, setLatex] = useState(initialLatex);
  const [mode, setMode] = useState<InsertMode>("display");
  const [busy, setBusy] = useState(false);
  const [pickerValue, setPickerValue] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setLatex(initialLatex);
      setMode("display");
      setPickerValue("");
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

  /** Insert a snippet at the textarea cursor with optional caret placement. */
  const insertAtCursor = (snippet: string, caretOffset?: number) => {
    const ta = textareaRef.current;
    if (!ta) {
      setLatex((prev) => prev + snippet);
      return;
    }
    const start = ta.selectionStart ?? latex.length;
    const end = ta.selectionEnd ?? latex.length;
    const before = latex.slice(0, start);
    const after = latex.slice(end);
    const next = before + snippet + after;
    setLatex(next);

    // Restore caret on next tick
    requestAnimationFrame(() => {
      const target = ta;
      if (!target) return;
      const caret =
        caretOffset !== undefined
          ? start + caretOffset
          : start + snippet.length;
      target.focus();
      target.setSelectionRange(caret, caret);
    });
  };

  const handlePickFormula = (value: string) => {
    setPickerValue(value);
    const [catIdx, formIdx] = value.split(":").map(Number);
    const formula = FORMULA_LIBRARY[catIdx]?.formulas[formIdx];
    if (formula) {
      setLatex(formula.latex);
      setMode("display");
    }
  };

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
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle>Insert math formula</DialogTitle>
          <DialogDescription>
            Pick a formula from your booklet, click symbols to build one, or paste LaTeX.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-2 overflow-y-auto flex-1 min-w-0">
          {/* Formula library picker */}
          <div className="min-w-0">
            <Label className="text-sm mb-1 block">Formula library (booklet)</Label>
            <Select value={pickerValue} onValueChange={handlePickFormula}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a formula to insert…" />
              </SelectTrigger>
              <SelectContent className="max-h-[320px]">
                {FORMULA_LIBRARY.map((cat, ci) => (
                  <SelectGroup key={cat.category}>
                    <SelectLabel>{cat.category}</SelectLabel>
                    {cat.formulas.map((f, fi) => (
                      <SelectItem key={`${ci}:${fi}`} value={`${ci}:${fi}`}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Symbol palette */}
          <div className="rounded-md border border-border bg-muted/20 p-3 space-y-3 min-w-0">
            {SYMBOL_PALETTE.map((g) => (
              <div key={g.group}>
                <div className="text-xs text-muted-foreground mb-1.5 font-medium">
                  {g.group}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {g.symbols.map((s) => (
                    <Button
                      key={s.label + s.insert}
                      type="button"
                      variant="outline"
                      size="sm"
                      title={s.title || s.insert}
                      className="h-8 min-w-[2.25rem] px-2 text-sm font-serif"
                      onClick={() => insertAtCursor(s.insert, s.caretOffset)}
                    >
                      {s.label}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="min-w-0">
            <Label htmlFor="latex-input" className="text-sm">LaTeX</Label>
            <Textarea
              id="latex-input"
              ref={textareaRef}
              value={latex}
              onChange={(e) => setLatex(e.target.value)}
              placeholder={"Pick a formula above, click symbols, or paste LaTeX (e.g.  \\frac{a}{b})"}
              className="font-mono text-sm min-h-[100px] mt-1"
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1">
              Tip: click <span className="font-mono">a⁄b</span> to insert an empty fraction, then type the numerator and denominator.
            </p>
          </div>

          <div className="min-w-0">
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

          <div className="min-w-0">
            <Label className="text-sm">Preview</Label>
            <div
              className="math-preview mt-1 rounded-md border border-border bg-muted/30 p-4 min-h-[80px] max-w-full overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border bg-background shrink-0">
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
