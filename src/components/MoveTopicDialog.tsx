import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

interface Chapter {
  id: string;
  subject_id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

interface MoveTopicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topicId: string;
  topicTitle: string;
  currentSubjectId: string;
  currentChapterId?: string | null;
  allSubjects: Subject[];
  allChapters: Chapter[];
  onMove: (topicId: string, chapterId: string | null, newSubjectId?: string) => void;
}

export const MoveTopicDialog = ({
  open,
  onOpenChange,
  topicId,
  topicTitle,
  currentSubjectId,
  currentChapterId,
  allSubjects,
  allChapters,
  onMove,
}: MoveTopicDialogProps) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState(currentSubjectId);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(
    currentChapterId || null
  );

  useEffect(() => {
    if (open) {
      setSelectedSubjectId(currentSubjectId);
      setSelectedChapterId(currentChapterId || null);
    }
  }, [open, currentSubjectId, currentChapterId]);

  const currentSubject = allSubjects.find((s) => s.id === currentSubjectId);
  const selectedSubject = allSubjects.find((s) => s.id === selectedSubjectId);
  const availableChapters = allChapters.filter(
    (ch) => ch.subject_id === selectedSubjectId
  );

  const handleMove = () => {
    if (selectedSubjectId !== currentSubjectId) {
      // Moving to a different subject
      onMove(topicId, selectedChapterId, selectedSubjectId);
    } else {
      // Staying in same subject, just changing chapter
      onMove(topicId, selectedChapterId);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move Topic: {topicTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Subject</Label>
            <Select
              value={selectedSubjectId}
              onValueChange={(value) => {
                setSelectedSubjectId(value);
                // Reset chapter selection when subject changes
                setSelectedChapterId(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {allSubjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                    {subject.id === currentSubjectId && " (current)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Chapter (Optional)</Label>
            <Select
              value={selectedChapterId || "none"}
              onValueChange={(value) =>
                setSelectedChapterId(value === "none" ? null : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select chapter or leave at subject level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  No Chapter (Subject Level)
                </SelectItem>
                {availableChapters.map((chapter) => (
                  <SelectItem key={chapter.id} value={chapter.id}>
                    {chapter.name}
                    {chapter.id === currentChapterId && " (current)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableChapters.length === 0 && selectedSubjectId && (
              <p className="text-xs text-muted-foreground">
                No chapters in {selectedSubject?.name}. Topic will be at subject level.
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleMove}>Move Topic</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
