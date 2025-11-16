import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";

interface Subject {
  id: string;
  name: string;
}

interface MoveChapterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapterId: string;
  chapterName: string;
  currentSubjectId: string;
  allSubjects: Subject[];
  topicCount: number;
  onMove: (chapterId: string, newSubjectId: string) => void;
}

export const MoveChapterDialog = ({
  open,
  onOpenChange,
  chapterId,
  chapterName,
  currentSubjectId,
  allSubjects,
  topicCount,
  onMove,
}: MoveChapterDialogProps) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState(currentSubjectId);

  useEffect(() => {
    if (open) {
      setSelectedSubjectId(currentSubjectId);
    }
  }, [open, currentSubjectId]);

  const currentSubject = allSubjects.find((s) => s.id === currentSubjectId);
  const selectedSubject = allSubjects.find((s) => s.id === selectedSubjectId);

  const handleMove = () => {
    if (selectedSubjectId !== currentSubjectId) {
      onMove(chapterId, selectedSubjectId);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move Chapter: {chapterName}</DialogTitle>
          <DialogDescription>
            This chapter contains {topicCount} {topicCount === 1 ? "topic" : "topics"}.
            All topics will be moved with the chapter to the new subject.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Move to Subject</Label>
            <Select
              value={selectedSubjectId}
              onValueChange={setSelectedSubjectId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {allSubjects
                  .filter((s) => s.id !== currentSubjectId)
                  .map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          {selectedSubjectId !== currentSubjectId && (
            <div className="bg-muted p-3 rounded-md text-sm">
              <p className="font-medium mb-1">Moving:</p>
              <p className="text-muted-foreground">
                "{chapterName}" from {currentSubject?.name} → {selectedSubject?.name}
              </p>
              <p className="text-muted-foreground mt-1">
                Including {topicCount} {topicCount === 1 ? "topic" : "topics"}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleMove}
            disabled={selectedSubjectId === currentSubjectId}
          >
            Move Chapter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
