import { Bold, Italic, Underline, AlignLeft, AlignCenter, Strikethrough, Highlighter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FormattingToolbarProps {
  onFormatChange: (format: string, value?: string) => void;
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
];

export const FormattingToolbar = ({ onFormatChange }: FormattingToolbarProps) => {
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 border-b border-border bg-gradient-to-r from-primary/5 to-secondary/5">
      <Select defaultValue="inter" onValueChange={(value) => onFormatChange("font", value)}>
        <SelectTrigger className="w-[140px] h-9 bg-card">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-card">
          <SelectItem value="inter">Inter</SelectItem>
          <SelectItem value="serif">Serif</SelectItem>
          <SelectItem value="mono">Monospace</SelectItem>
        </SelectContent>
      </Select>

      <div className="w-px h-6 bg-border" />

      <Select defaultValue="18" onValueChange={(value) => onFormatChange("size", value)}>
        <SelectTrigger className="w-[90px] h-9 bg-card">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-card">
          <SelectItem value="14">14px</SelectItem>
          <SelectItem value="16">16px</SelectItem>
          <SelectItem value="18">18px</SelectItem>
          <SelectItem value="20">20px</SelectItem>
          <SelectItem value="22">22px</SelectItem>
          <SelectItem value="24">24px</SelectItem>
          <SelectItem value="28">28px</SelectItem>
          <SelectItem value="32">32px</SelectItem>
        </SelectContent>
      </Select>

      <div className="w-px h-6 bg-border" />

      <Button
        size="sm"
        variant="ghost"
        onClick={() => onFormatChange("bold")}
        className="h-9 w-9 p-0 hover:bg-primary/10"
        title="Bold"
      >
        <Bold className="w-4 h-4" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => onFormatChange("italic")}
        className="h-9 w-9 p-0 hover:bg-primary/10"
        title="Italic"
      >
        <Italic className="w-4 h-4" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => onFormatChange("underline")}
        className="h-9 w-9 p-0 hover:bg-primary/10"
        title="Underline"
      >
        <Underline className="w-4 h-4" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => onFormatChange("strikethrough")}
        className="h-9 w-9 p-0 hover:bg-primary/10"
        title="Strikethrough"
      >
        <Strikethrough className="w-4 h-4" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => onFormatChange("highlight")}
        className="h-9 w-9 p-0 hover:bg-accent/50"
        title="Highlight"
      >
        <Highlighter className="w-4 h-4" />
      </Button>

      <div className="w-px h-6 bg-border" />

      <Button
        size="sm"
        variant="ghost"
        onClick={() => onFormatChange("alignLeft")}
        className="h-9 w-9 p-0 hover:bg-primary/10"
        title="Align Left"
      >
        <AlignLeft className="w-4 h-4" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => onFormatChange("alignCenter")}
        className="h-9 w-9 p-0 hover:bg-primary/10"
        title="Align Center"
      >
        <AlignCenter className="w-4 h-4" />
      </Button>

      <div className="w-px h-6 bg-border" />

      <Select onValueChange={(value) => onFormatChange("color", value)}>
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
        onChange={(e) => onFormatChange("color", e.target.value)}
        title="Custom color"
      />
    </div>
  );
};
