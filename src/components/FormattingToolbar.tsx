import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Strikethrough, Highlighter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FormattingToolbarProps {
  // No props needed - works directly with document selection
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

export const FormattingToolbar = ({ }: FormattingToolbarProps) => {
  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  const applyFontSize = (size: string) => {
    document.execCommand("fontSize", false, "7");
    const fontElements = document.getElementsByTagName("font");
    for (let i = 0; i < fontElements.length; i++) {
      if (fontElements[i].size === "7") {
        fontElements[i].removeAttribute("size");
        fontElements[i].style.fontSize = size;
      }
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 border-b border-border bg-gradient-to-r from-primary/5 to-secondary/5">
      <Select onValueChange={(value) => applyFormat("fontName", value)}>
        <SelectTrigger className="w-[140px] h-9 bg-card">
          <SelectValue placeholder="Font" />
        </SelectTrigger>
        <SelectContent className="bg-card">
          <SelectItem value="Arial">Arial</SelectItem>
          <SelectItem value="Georgia">Georgia</SelectItem>
          <SelectItem value="Times New Roman">Times New Roman</SelectItem>
          <SelectItem value="Courier New">Courier New</SelectItem>
          <SelectItem value="Verdana">Verdana</SelectItem>
        </SelectContent>
      </Select>

      <div className="w-px h-6 bg-border" />

      <Select onValueChange={applyFontSize}>
        <SelectTrigger className="w-[90px] h-9 bg-card">
          <SelectValue placeholder="Size" />
        </SelectTrigger>
        <SelectContent className="bg-card">
          <SelectItem value="16px">16px</SelectItem>
          <SelectItem value="18px">18px</SelectItem>
          <SelectItem value="20px">20px</SelectItem>
          <SelectItem value="22px">22px</SelectItem>
          <SelectItem value="24px">24px</SelectItem>
          <SelectItem value="28px">28px</SelectItem>
          <SelectItem value="32px">32px</SelectItem>
        </SelectContent>
      </Select>

      <div className="w-px h-6 bg-border" />

      <Button
        size="sm"
        variant="ghost"
        onClick={() => applyFormat("bold")}
        className="h-9 w-9 p-0 hover:bg-primary/10"
        title="Bold"
      >
        <Bold className="w-4 h-4" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => applyFormat("italic")}
        className="h-9 w-9 p-0 hover:bg-primary/10"
        title="Italic"
      >
        <Italic className="w-4 h-4" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => applyFormat("underline")}
        className="h-9 w-9 p-0 hover:bg-primary/10"
        title="Underline"
      >
        <Underline className="w-4 h-4" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => applyFormat("strikeThrough")}
        className="h-9 w-9 p-0 hover:bg-primary/10"
        title="Strikethrough"
      >
        <Strikethrough className="w-4 h-4" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => applyFormat("hiliteColor", "yellow")}
        className="h-9 w-9 p-0 hover:bg-accent/50"
        title="Highlight"
      >
        <Highlighter className="w-4 h-4" />
      </Button>

      <div className="w-px h-6 bg-border" />

      <Button
        size="sm"
        variant="ghost"
        onClick={() => applyFormat("justifyLeft")}
        className="h-9 w-9 p-0 hover:bg-primary/10"
        title="Align Left"
      >
        <AlignLeft className="w-4 h-4" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => applyFormat("justifyCenter")}
        className="h-9 w-9 p-0 hover:bg-primary/10"
        title="Align Center"
      >
        <AlignCenter className="w-4 h-4" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => applyFormat("justifyRight")}
        className="h-9 w-9 p-0 hover:bg-primary/10"
        title="Align Right"
      >
        <AlignRight className="w-4 h-4" />
      </Button>

      <div className="w-px h-6 bg-border" />

      <Select onValueChange={(value) => applyFormat("foreColor", value)}>
        <SelectTrigger className="w-[120px] h-9 bg-card">
          <SelectValue placeholder="Text Color" />
        </SelectTrigger>
        <SelectContent className="bg-card">
          {colorOptions.map((color) => (
            <SelectItem key={color.value} value={color.value}>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded border"
                  style={{ backgroundColor: color.value }}
                />
                {color.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <input
        type="color"
        className="w-9 h-9 rounded cursor-pointer border border-border"
        onChange={(e) => applyFormat("foreColor", e.target.value)}
        title="Custom color"
      />
    </div>
  );
};
