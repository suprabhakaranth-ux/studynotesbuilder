import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ChapterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectId: string;
  chapterId?: string;
  chapterName?: string;
  onSave: (name: string, chapterId?: string) => void;
}

export const ChapterDialog = ({
  open,
  onOpenChange,
  subjectId,
  chapterId,
  chapterName,
  onSave,
}: ChapterDialogProps) => {
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) {
      setName(chapterName || "");
    }
  }, [open, chapterName]);

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim(), chapterId);
      setName("");
      onOpenChange(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {chapterId ? "Edit Chapter" : "New Chapter"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="chapter-name">Chapter Name</Label>
            <Input
              id="chapter-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter chapter name"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {chapterId ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
