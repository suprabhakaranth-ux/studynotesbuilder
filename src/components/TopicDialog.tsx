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
import { Loader2 } from "lucide-react";

interface TopicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topicId?: string;
  topicTitle?: string;
  onSave: (title: string, topicId?: string) => Promise<void>;
}

export const TopicDialog = ({
  open,
  onOpenChange,
  topicId,
  topicTitle,
  onSave,
}: TopicDialogProps) => {
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(topicTitle || "");
      setSaving(false);
    }
  }, [open, topicTitle]);

  const handleSave = async () => {
    const trimmed = title.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      // Wait for the save (and, for new topics, for the note page to be
      // ready) before closing, so the popup swaps seamlessly into the editor.
      await onSave(trimmed, topicId);
      setTitle("");
      onOpenChange(false);
    } catch {
      // Save failed: keep the dialog open with the typed title intact.
    } finally {
      setSaving(false);
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim() || saving}>
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            {topicId ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};