import { useState, useEffect, useRef } from "react";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Strikethrough,
  Highlighter,
  List,
  ListOrdered,
  Indent,
  Outdent,
  Heading,
  Undo,
  Redo,
  Paintbrush,
  ClipboardPaste,
  Sigma,
} from "lucide-react";
import { Editor } from "@tiptap/react";
import { MathInsertDialog } from "./MathInsertDialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  sanitizeToDestinationStyle,
  extractPlainText,
  textToHtml,
  sanitizeSourceFormatting,
} from "@/utils/pasteSpecial";
import {
  normalizeHtmlForTiptap,
} from "./editor/extensions/mathTokenizer";
import { cleanPastedHtml } from "./editor/extensions/wordPasteCleaner";

interface FormattingToolbarProps {
  onMarkHeading?: (text: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

const colorOptions = [
  { name: "Black", value: "#000000" },
  { name: "Red", value: "#EF4444" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Green", value: "#10B981" },
  { name: "Purple", value: "#A855F7" },
  { name: "Orange", value: "#F97316" },
  { name: "Pink", value: "#EC4899" },
  { name: "Yellow", value: "#EAB308" },
  { name: "Teal", value: "#14B8A6" },
];

/** Get the editor that the user most recently interacted with. */
const getActiveEditor = (): Editor | null => {
  return (window.__activeTiptapEditor as Editor | null) || null;
};

const withEditor = (fn: (e: Editor) => void) => {
  const e = getActiveEditor();
  if (!e) return;
  fn(e);
};

interface CapturedFormat {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  fontFamily: string | null;
  fontSize: string | null;
  color: string | null;
  highlight: string | null;
}

export const FormattingToolbar = ({
  onMarkHeading,
  onUndo,
  onRedo,
}: FormattingToolbarProps) => {
  const [formatPainterActive, setFormatPainterActive] = useState(false);
  const [mathDialogOpen, setMathDialogOpen] = useState(false);
  const copiedFormatRef = useRef<CapturedFormat | null>(null);
  const { toast } = useToast();

  const handleInsertMath = (snippet: string) => {
    // Snippet from MathInsertDialog is "$..$" or "$$..$$" (or HTML for image).
    const e = getActiveEditor();
    if (!e) {
      toast({ title: "Click in an editor first", variant: "destructive" });
      return;
    }
    e.chain().focus().run();
    // Image fallback path inserts raw <img ...> HTML
    if (/^<img/i.test(snippet)) {
      e.commands.insertContent(snippet);
      return;
    }
    const display = snippet.startsWith("$$") && snippet.endsWith("$$");
    const latex = display
      ? snippet.slice(2, -2).trim()
      : snippet.replace(/^\$|\$$/g, "").trim();
    if (display) e.commands.insertMathDisplay(latex);
    else e.commands.insertMathInline(latex);
  };

  const handlePasteSpecial = async (mode: "source" | "destination" | "text") => {
    const e = getActiveEditor();
    if (!e) {
      toast({ title: "Click in an editor first", variant: "destructive" });
      return;
    }
    try {
      let html = "";
      let text = "";
      if (navigator.clipboard?.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          if (item.types.includes("text/html")) {
            html = await (await item.getType("text/html")).text();
          }
          if (item.types.includes("text/plain")) {
            text = await (await item.getType("text/plain")).text();
          }
        }
      } else if (navigator.clipboard?.readText) {
        text = await navigator.clipboard.readText();
      }
      if (!html && !text) {
        toast({ title: "Clipboard empty", variant: "destructive" });
        return;
      }
      let toInsert = "";
      switch (mode) {
        case "source":
          toInsert = cleanPastedHtml(
            sanitizeSourceFormatting(html || textToHtml(text))
          );
          break;
        case "destination":
          toInsert = sanitizeToDestinationStyle(html || textToHtml(text));
          break;
        case "text":
          toInsert = textToHtml(extractPlainText(html || text));
          break;
      }
      const normalized = normalizeHtmlForTiptap(toInsert);
      e.chain().focus().insertContent(normalized).run();
      toast({
        title: "Pasted",
        description:
          mode === "source"
            ? "with source formatting"
            : mode === "destination"
            ? "with destination style"
            : "as plain text",
      });
    } catch (err) {
      console.error("Paste special failed", err);
      toast({
        title: "Paste failed",
        description: "Could not access clipboard. Try Ctrl+V.",
        variant: "destructive",
      });
    }
  };

  const handleStandardizeSelection = () => {
    const e = getActiveEditor();
    if (!e || e.state.selection.empty) {
      toast({ title: "No selection", variant: "destructive" });
      return;
    }
    const { from, to } = e.state.selection;
    const slice = e.state.doc.cut(from, to);
    const tmp = document.createElement("div");
    // Use the schema's serializer via getHTML on a transient editor would be heavy;
    // simplest: clear marks and indent on the selection.
    e.chain()
      .focus()
      .unsetAllMarks()
      .run();
    toast({ title: "Selection standardized" });
  };

  const handleUndo = () => {
    if (onUndo) return onUndo();
    withEditor((e) => e.chain().focus().undo().run());
  };

  const handleRedo = () => {
    if (onRedo) return onRedo();
    withEditor((e) => e.chain().focus().redo().run());
  };

  const handleMarkHeading = () => {
    if (!onMarkHeading) return;
    const e = getActiveEditor();
    if (!e) return;
    const text = e.state.doc.textBetween(
      e.state.selection.from,
      e.state.selection.to,
      " "
    );
    if (text.trim()) onMarkHeading(text.trim());
  };

  const captureFormatting = (): CapturedFormat | null => {
    const e = getActiveEditor();
    if (!e) return null;
    const attrs = e.getAttributes("textStyle") || {};
    return {
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      fontFamily: (attrs.fontFamily as string) || null,
      fontSize: (attrs.fontSize as string) || null,
      color: (attrs.color as string) || null,
      highlight: e.isActive("highlight")
        ? (e.getAttributes("highlight").color as string) || "yellow"
        : null,
    };
  };

  const applyCapturedFormat = (fmt: CapturedFormat) => {
    withEditor((e) => {
      const c = e.chain().focus();
      c.unsetAllMarks();
      if (fmt.bold) c.setMark("bold");
      if (fmt.italic) c.setMark("italic");
      if (fmt.underline) c.setMark("underline");
      if (fmt.strike) c.setMark("strike");
      if (fmt.fontFamily) c.setFontFamily(fmt.fontFamily);
      if (fmt.fontSize) c.setFontSize(fmt.fontSize);
      if (fmt.color) c.setColor(fmt.color);
      if (fmt.highlight) c.toggleHighlight({ color: fmt.highlight });
      c.run();
    });
  };

  // Format painter: capture on click, apply on next selection
  useEffect(() => {
    if (!formatPainterActive) return;
    const handleMouseUp = () => {
      setTimeout(() => {
        const e = getActiveEditor();
        if (e && !e.state.selection.empty && copiedFormatRef.current) {
          applyCapturedFormat(copiedFormatRef.current);
          setFormatPainterActive(false);
          copiedFormatRef.current = null;
        }
      }, 10);
    };
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [formatPainterActive]);

  const handleFormatPainter = () => {
    if (formatPainterActive) {
      setFormatPainterActive(false);
      copiedFormatRef.current = null;
      return;
    }
    const fmt = captureFormatting();
    if (fmt) {
      copiedFormatRef.current = fmt;
      setFormatPainterActive(true);
    }
  };

  // Shortcut helpers
  const tBold = () => withEditor((e) => e.chain().focus().toggleBold().run());
  const tItalic = () =>
    withEditor((e) => e.chain().focus().toggleItalic().run());
  const tUnderline = () =>
    withEditor((e) => e.chain().focus().toggleUnderline().run());
  const tStrike = () =>
    withEditor((e) => e.chain().focus().toggleStrike().run());
  const tHighlight = () =>
    withEditor((e) => e.chain().focus().toggleHighlight({ color: "yellow" }).run());
  const tBullet = () =>
    withEditor((e) => e.chain().focus().toggleBulletList().run());
  const tOrdered = () =>
    withEditor((e) => e.chain().focus().toggleOrderedList().run());
  const tIndent = () =>
    withEditor((e) => {
      // Inside lists, sinkListItem; otherwise increase paragraph indent
      if (!e.chain().focus().sinkListItem("listItem").run()) {
        e.chain().focus().indentBlock().run();
      }
    });
  const tOutdent = () =>
    withEditor((e) => {
      if (!e.chain().focus().liftListItem("listItem").run()) {
        e.chain().focus().outdentBlock().run();
      }
    });
  const tAlign = (a: "left" | "center" | "right") =>
    withEditor((e) => e.chain().focus().setTextAlign(a).run());
  const tColor = (c: string) =>
    withEditor((e) => e.chain().focus().setColor(c).run());
  const tFontFamily = (f: string) =>
    withEditor((e) => e.chain().focus().setFontFamily(f).run());
  const tFontSize = (s: string) =>
    withEditor((e) => e.chain().focus().setFontSize(s).run());

  return (
    <>
      <div
        className="flex flex-wrap items-center gap-1.5 p-2 border-b border-border bg-gradient-to-r from-primary/5 to-secondary/5"
        onMouseDown={(e) => e.preventDefault()}
      >
        <Select onValueChange={tFontFamily}>
          <SelectTrigger className="w-[110px] h-8 bg-card text-xs">
            <SelectValue placeholder="Font" />
          </SelectTrigger>
          <SelectContent className="bg-card">
            <SelectItem value="Arial">Arial</SelectItem>
            <SelectItem value="Georgia">Georgia</SelectItem>
            <SelectItem value="Times New Roman">Times</SelectItem>
            <SelectItem value="Courier New">Courier</SelectItem>
            <SelectItem value="Verdana">Verdana</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={tFontSize}>
          <SelectTrigger className="w-[70px] h-8 bg-card text-xs">
            <SelectValue placeholder="Size" />
          </SelectTrigger>
          <SelectContent className="bg-card">
            {["12px", "14px", "16px", "18px", "20px", "22px", "24px"].map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace("px", "")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="w-px h-6 bg-border" />

        <Button size="sm" variant="ghost" onClick={tBold} className="h-8 w-8 p-0 hover:bg-primary/10" title="Bold">
          <Bold className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="ghost" onClick={tItalic} className="h-8 w-8 p-0 hover:bg-primary/10" title="Italic">
          <Italic className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="ghost" onClick={tUnderline} className="h-8 w-8 p-0 hover:bg-primary/10" title="Underline">
          <Underline className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="ghost" onClick={tStrike} className="h-8 w-8 p-0 hover:bg-primary/10" title="Strikethrough">
          <Strikethrough className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="ghost" onClick={tHighlight} className="h-8 w-8 p-0 hover:bg-primary/10" title="Highlight">
          <Highlighter className="w-3.5 h-3.5" />
        </Button>

        <Button
          size="sm"
          variant={formatPainterActive ? "default" : "ghost"}
          onClick={handleFormatPainter}
          className={`h-8 w-8 p-0 ${
            formatPainterActive ? "bg-primary text-primary-foreground" : "hover:bg-primary/10"
          }`}
          title="Format Painter"
        >
          <Paintbrush className="w-3.5 h-3.5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-primary/10" title="Paste Special">
              <ClipboardPaste className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-card z-50">
            <DropdownMenuItem onClick={() => handlePasteSpecial("source")}>
              Keep Source Formatting
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePasteSpecial("destination")}>
              Match Destination Style
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePasteSpecial("text")}>
              Keep Text Only
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleStandardizeSelection}>
              Standardize Selection
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => setMathDialogOpen(true)}
          className="h-8 w-8 p-0 hover:bg-primary/10"
          title="Insert math formula"
        >
          <Sigma className="w-3.5 h-3.5" />
        </Button>

        <div className="w-px h-6 bg-border" />

        <Button size="sm" variant="ghost" onClick={tBullet} className="h-8 w-8 p-0 hover:bg-primary/10" title="Bullet List">
          <List className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="ghost" onClick={tOrdered} className="h-8 w-8 p-0 hover:bg-primary/10" title="Numbered List">
          <ListOrdered className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="ghost" onClick={tIndent} className="h-8 w-8 p-0 hover:bg-primary/10" title="Indent">
          <Indent className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="ghost" onClick={tOutdent} className="h-8 w-8 p-0 hover:bg-primary/10" title="Outdent">
          <Outdent className="w-3.5 h-3.5" />
        </Button>

        <div className="w-px h-6 bg-border" />

        <Button size="sm" variant="ghost" onClick={() => tAlign("left")} className="h-8 w-8 p-0 hover:bg-primary/10" title="Align Left">
          <AlignLeft className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => tAlign("center")} className="h-8 w-8 p-0 hover:bg-primary/10" title="Align Center">
          <AlignCenter className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => tAlign("right")} className="h-8 w-8 p-0 hover:bg-primary/10" title="Align Right">
          <AlignRight className="w-3.5 h-3.5" />
        </Button>

        <div className="w-px h-6 bg-border" />

        <Select onValueChange={tColor}>
          <SelectTrigger className="w-[100px] h-8 bg-card text-xs">
            <SelectValue placeholder="Color" />
          </SelectTrigger>
          <SelectContent className="bg-card">
            {colorOptions.map((color) => (
              <SelectItem key={color.value} value={color.value}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded border" style={{ backgroundColor: color.value }} />
                  {color.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <input
          type="color"
          className="w-8 h-8 rounded cursor-pointer border border-border"
          onChange={(e) => tColor(e.target.value)}
          title="Custom color"
        />

        {onMarkHeading && (
          <>
            <div className="w-px h-6 bg-border" />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleMarkHeading}
              className="h-8 px-2 hover:bg-secondary/50 text-xs"
              title="Mark selected text as heading"
            >
              <Heading className="w-3.5 h-3.5 mr-1" />
              Mark Heading
            </Button>
          </>
        )}

        <div className="w-px h-6 bg-border" />

        <Button size="sm" variant="ghost" onClick={handleUndo} className="h-8 w-8 p-0 hover:bg-primary/10" title="Undo">
          <Undo className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="ghost" onClick={handleRedo} className="h-8 w-8 p-0 hover:bg-primary/10" title="Redo">
          <Redo className="w-3.5 h-3.5" />
        </Button>
      </div>
      <MathInsertDialog
        open={mathDialogOpen}
        onOpenChange={setMathDialogOpen}
        onInsert={handleInsertMath}
      />
    </>
  );
};
