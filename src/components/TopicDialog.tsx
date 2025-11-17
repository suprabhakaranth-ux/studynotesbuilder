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

interface TopicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topicId?: string;
  topicTitle?: string;
  onSave: (title: string, topicId?: string) => void;
}

export const TopicDialog = ({
  open,
  onOpenChange,
  topicId,
  topicTitle,
  onSave,
}: TopicDialogProps) => {
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(topicTitle || "");
    }
  }, [open, topicTitle]);

  const handleSave = () => {
    if (title.trim()) {
      onSave(title.trim(), topicId);
      setTitle("");
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
            {topicId ? "Rename Topic" : "New Topic"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="topic-title">Topic Title</Label>
            <Input
              id="topic-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter topic title"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            {topicId ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};