import { useRef, useEffect, useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { FloatingToolbar } from "./FloatingToolbar";
import { renderMathInHTML, restoreMathSource, containsMath } from "@/utils/mathRenderer";
import { latexToImage, buildFormulaImageHtml } from "@/utils/formulaToImage";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import katex from "katex";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  onMarkHeading?: (text: string) => void;
  readOnly?: boolean;
}

interface EditorHistoryState {
  content: string;
  timestamp: number;
}

export const RichTextEditor = ({
  value,
  onChange,
  placeholder = "Start typing...",
  className,
  minHeight = "150px",
  onMarkHeading,
  readOnly = false,
}: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const historyStack = useRef<EditorHistoryState[]>([]);
  const historyPosition = useRef<number>(-1);
  const lastSavedContent = useRef<string>("");
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();
  const selectedMathNode = useRef<HTMLElement | null>(null);

  // Fallback prompt state when math fails to render
  const [fallbackPrompt, setFallbackPrompt] = useState<{
    open: boolean;
    latex: string;
    displayMode: boolean;
  }>({ open: false, latex: "", displayMode: false });

  // Sync incoming value into the editor, rendering math for display
  useEffect(() => {
    if (!editorRef.current) return;

    // Compare against the source-form snapshot we last saved
    const currentRendered = editorRef.current.innerHTML;
    const currentSource = restoreMathSource(currentRendered);
    if (currentSource === value) return;

    const renderedValue = containsMath(value) ? renderMathInHTML(value) : value;
    editorRef.current.innerHTML = renderedValue;

    if (historyStack.current.length === 0 && value) {
      historyStack.current = [{ content: value, timestamp: Date.now() }];
      historyPosition.current = 0;
      lastSavedContent.current = value;
    }
  }, [value]);

  const saveToHistory = useCallback((content: string) => {
    if (content === lastSavedContent.current) return;

    if (historyPosition.current < historyStack.current.length - 1) {
      historyStack.current = historyStack.current.slice(0, historyPosition.current + 1);
    }

    historyStack.current.push({ content, timestamp: Date.now() });

    if (historyStack.current.length > 50) {
      historyStack.current.shift();
    } else {
      historyPosition.current++;
    }

    lastSavedContent.current = content;
  }, []);

  // Convert rendered editor HTML back to source ($..$ / $$..$$) before saving
  const emitChange = useCallback(() => {
    if (!editorRef.current) return;
    const rendered = editorRef.current.innerHTML;
    const source = restoreMathSource(rendered);
    onChange(source);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveToHistory(source);
    }, 300);
  }, [onChange, saveToHistory]);

  const handleInput = () => emitChange();

  const clearMathSelection = useCallback(() => {
    selectedMathNode.current?.classList.remove("math-node-selected");
    selectedMathNode.current = null;
  }, []);

  const placeCursorAfter = useCallback((node: Node) => {
    const selection = window.getSelection();
    if (!selection || !editorRef.current) return;
    const range = document.createRange();
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    editorRef.current.focus();
  }, []);

  const ensureEditableLineAfter = useCallback((node: HTMLElement) => {
    if (!node.classList.contains("math-display")) return node.nextSibling;
    const next = node.nextSibling;
    if (next instanceof HTMLElement && next.matches("p, div") && !next.classList.contains("math-node")) {
      return next;
    }
    const paragraph = document.createElement("p");
    paragraph.innerHTML = "<br>";
    node.after(paragraph);
    return paragraph;
  }, []);

  const removeMathNode = useCallback((node: HTMLElement) => {
    const target = ensureEditableLineAfter(node) || node.previousSibling || editorRef.current;
    node.remove();
    clearMathSelection();
    if (target) placeCursorAfter(target);
    emitChange();
  }, [clearMathSelection, emitChange, ensureEditableLineAfter, placeCursorAfter]);

  const performUndo = useCallback(() => {
    if (historyPosition.current <= 0) return;
    historyPosition.current--;
    const previousState = historyStack.current[historyPosition.current];
    if (editorRef.current && previousState) {
      const rendered = containsMath(previousState.content)
        ? renderMathInHTML(previousState.content)
        : previousState.content;
      editorRef.current.innerHTML = rendered;
      onChange(previousState.content);
      lastSavedContent.current = previousState.content;
    }
  }, [onChange]);

  const performRedo = useCallback(() => {
    if (historyPosition.current >= historyStack.current.length - 1) return;
    historyPosition.current++;
    const nextState = historyStack.current[historyPosition.current];
    if (editorRef.current && nextState) {
      const rendered = containsMath(nextState.content)
        ? renderMathInHTML(nextState.content)
        : nextState.content;
      editorRef.current.innerHTML = rendered;
      onChange(nextState.content);
      lastSavedContent.current = nextState.content;
    }
  }, [onChange]);

  useEffect(() => {
    if (editorRef.current) {
      (editorRef.current as any).__performUndo = performUndo;
      (editorRef.current as any).__performRedo = performRedo;
      // Expose insertContent for the math dialog to use
      (editorRef.current as any).__insertContent = (snippet: string) => {
        clearMathSelection();
        const contentToInsert = containsMath(snippet)
          ? renderMathInHTML(snippet)
          : snippet;
        insertHtmlAtCursor(contentToInsert);
        const insertedMath = editorRef.current?.querySelector<HTMLElement>(".math-node:last-of-type");
        if (insertedMath?.classList.contains("math-display")) {
          const editableLine = ensureEditableLineAfter(insertedMath);
          if (editableLine) placeCursorAfter(editableLine);
        } else if (insertedMath?.classList.contains("math-inline")) {
          insertedMath.after(document.createTextNode(" "));
          placeCursorAfter(insertedMath.nextSibling || insertedMath);
        }
        emitChange();
      };
    }
  }, [clearMathSelection, emitChange, ensureEditableLineAfter, performUndo, performRedo, placeCursorAfter]);

  // Insert HTML at the current cursor position inside the editor
  const insertHtmlAtCursor = (html: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      // Append to end if no selection
      const div = document.createElement("div");
      div.innerHTML = html;
      while (div.firstChild) editorRef.current.appendChild(div.firstChild);
      return;
    }
    const range = selection.getRangeAt(0);
    // Make sure cursor is inside this editor
    if (!editorRef.current.contains(range.commonAncestorContainer)) {
      const div = document.createElement("div");
      div.innerHTML = html;
      while (div.firstChild) editorRef.current.appendChild(div.firstChild);
      return;
    }
    range.deleteContents();
    const fragment = document.createDocumentFragment();
    const div = document.createElement("div");
    div.innerHTML = html;
    while (div.firstChild) fragment.appendChild(div.firstChild);
    range.insertNode(fragment);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  // Detect formulas in pasted text, validate, and prompt image fallback if invalid
  const checkAndHandleMathPaste = (rawText: string): boolean => {
    // Find the first $$..$$ or $..$ expression and try to validate it
    const display = rawText.match(/\$\$([\s\S]+?)\$\$/);
    const inline = !display ? rawText.match(/\$([^\$\n]+?)\$/) : null;
    const match = display || inline;
    if (!match) return false;
    const latex = match[1].trim();
    if (!latex) return false;
    try {
      katex.renderToString(latex, { throwOnError: true });
      return false; // Valid — let normal paste flow render it
    } catch {
      // Invalid LaTeX — offer image fallback
      setFallbackPrompt({
        open: true,
        latex,
        displayMode: !!display,
      });
      return true;
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");

    // If pasted text contains LaTeX delimiters, check whether KaTeX accepts it
    if (text && /\$|\\\(|\\\[/.test(text)) {
      const handled = checkAndHandleMathPaste(text);
      if (handled) return; // dialog will take over
    }

    if (html) {
      const temp = document.createElement("div");
      temp.innerHTML = html;

      const allElements = temp.querySelectorAll("*");
      allElements.forEach((el) => {
        const element = el as HTMLElement;
        if (element.style.fontWeight) {
          element.style.removeProperty("font-weight");
        }
        if (element.tagName === "B" || element.tagName === "STRONG") {
          const parent = element.parentNode;
          while (element.firstChild) {
            parent?.insertBefore(element.firstChild, element);
          }
          parent?.removeChild(element);
        }
      });

      let content = temp.innerHTML
        .replace(/<br\s*\/?>/gi, "<br>")
        .replace(/<\/p>/gi, "</p><br>")
        .replace(/<p>/gi, "<p>");

      // Render any math delimiters present in the pasted HTML
      if (containsMath(content)) {
        content = renderMathInHTML(content);
      }

      insertHtmlAtCursor(content);
    } else {
      // Plain text fallback (with optional math rendering)
      let toInsert: string;
      if (containsMath(text)) {
        // Convert text to HTML preserving line breaks, then render math
        const escaped = text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\n/g, "<br>");
        toInsert = renderMathInHTML(escaped);
        insertHtmlAtCursor(toInsert);
      } else {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          const lines = text.split("\n");
          const fragment = document.createDocumentFragment();
          lines.forEach((line, index) => {
            fragment.appendChild(document.createTextNode(line));
            if (index < lines.length - 1) {
              fragment.appendChild(document.createElement("br"));
            }
          });
          range.insertNode(fragment);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    }

    emitChange();
    setTimeout(() => {
      if (editorRef.current) {
        saveToHistory(restoreMathSource(editorRef.current.innerHTML));
      }
    }, 100);
  };

  const handleFallbackInsertImage = async () => {
    try {
      const dataUrl = await latexToImage(fallbackPrompt.latex, fallbackPrompt.displayMode);
      const imgHtml = buildFormulaImageHtml(
        dataUrl,
        fallbackPrompt.latex,
        fallbackPrompt.displayMode
      );
      insertHtmlAtCursor(imgHtml);
      emitChange();
      toast({
        title: "Inserted as image",
        description: "Formula was rendered to a PNG and inserted.",
      });
    } catch (err) {
      console.error("Fallback image render failed", err);
      toast({
        title: "Image render failed",
        description: "Could not convert formula to image.",
        variant: "destructive",
      });
    } finally {
      setFallbackPrompt({ open: false, latex: "", displayMode: false });
    }
  };

  return (
    <>
      <div
        ref={editorRef}
        contentEditable={!readOnly}
        onInput={readOnly ? undefined : handleInput}
        onPaste={readOnly ? undefined : handlePaste}
        className={cn(
          "w-full rounded-md border-0 p-0 focus-visible:outline-none bg-transparent text-lg leading-relaxed",
          !readOnly &&
            "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none",
          readOnly && "cursor-default",
          className
        )}
        style={{ minHeight }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
      {!readOnly && <FloatingToolbar onMarkHeading={onMarkHeading} />}

      <AlertDialog
        open={fallbackPrompt.open}
        onOpenChange={(o) =>
          setFallbackPrompt((p) => ({ ...p, open: o }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Couldn't render this formula</AlertDialogTitle>
            <AlertDialogDescription>
              The pasted LaTeX couldn't be parsed. Would you like to insert it
              as an image instead?
              <pre className="mt-3 max-h-32 overflow-auto rounded bg-muted p-2 text-xs whitespace-pre-wrap break-all">
                {fallbackPrompt.latex}
              </pre>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFallbackInsertImage}>
              Insert as image
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
