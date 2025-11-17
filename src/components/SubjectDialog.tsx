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

interface SubjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectId?: string;
  subjectName?: string;
  onSave: (name: string, subjectId?: string) => void;
}

export const SubjectDialog = ({
  open,
  onOpenChange,
  subjectId,
  subjectName,
  onSave,
}: SubjectDialogProps) => {
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) {
      setName(subjectName || "");
    }
  }, [open, subjectName]);

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim(), subjectId);
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
            {subjectId ? "Rename Subject" : "New Subject"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="subject-name">Subject Name</Label>
            <Input
              id="subject-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter subject name"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {subjectId ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};