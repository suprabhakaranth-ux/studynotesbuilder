import { Bold, Italic, Underline, Type, Palette } from "lucide-react";
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

export const FormattingToolbar = ({ onFormatChange }: FormattingToolbarProps) => {
  return (
    <div className="flex items-center gap-2 p-3 border-b border-border bg-muted/30">
      <Select defaultValue="inter" onValueChange={(value) => onFormatChange("font", value)}>
        <SelectTrigger className="w-[140px] h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="inter">Inter</SelectItem>
          <SelectItem value="serif">Serif</SelectItem>
          <SelectItem value="mono">Monospace</SelectItem>
        </SelectContent>
      </Select>

      <div className="w-px h-6 bg-border" />

      <Select defaultValue="16" onValueChange={(value) => onFormatChange("size", value)}>
        <SelectTrigger className="w-[80px] h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="12">12px</SelectItem>
          <SelectItem value="14">14px</SelectItem>
          <SelectItem value="16">16px</SelectItem>
          <SelectItem value="18">18px</SelectItem>
          <SelectItem value="20">20px</SelectItem>
          <SelectItem value="24">24px</SelectItem>
        </SelectContent>
      </Select>

      <div className="w-px h-6 bg-border" />

      <Button
        size="sm"
        variant="ghost"
        onClick={() => onFormatChange("bold")}
        className="h-8 w-8 p-0"
      >
        <Bold className="w-4 h-4" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => onFormatChange("italic")}
        className="h-8 w-8 p-0"
      >
        <Italic className="w-4 h-4" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => onFormatChange("underline")}
        className="h-8 w-8 p-0"
      >
        <Underline className="w-4 h-4" />
      </Button>

      <div className="w-px h-6 bg-border" />

      <input
        type="color"
        className="w-8 h-8 rounded cursor-pointer"
        onChange={(e) => onFormatChange("color", e.target.value)}
        title="Text color"
      />
    </div>
  );
};
