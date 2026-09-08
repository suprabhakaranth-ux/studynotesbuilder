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

interface MoveSubjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectId: string;
  subjectName: string;
  currentYear: number;
  onMove: (subjectId: string, newYear: number) => void;
}

const YEARS = [
  { value: 1, label: "1st Year" },
  { value: 2, label: "2nd Year" },
];

export const MoveSubjectDialog = ({
  open,
  onOpenChange,
  subjectId,
  subjectName,
  currentYear,
  onMove,
}: MoveSubjectDialogProps) => {
  const [selectedYear, setSelectedYear] = useState(currentYear);

  useEffect(() => {
    if (open) setSelectedYear(currentYear);
  }, [open, currentYear]);

  const handleMove = () => {
    if (selectedYear !== currentYear) {
      onMove(subjectId, selectedYear);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move Subject: {subjectName}</DialogTitle>
          <DialogDescription>
            All chapters and topics stay with the subject when it moves to another year.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Move to Year</Label>
            <Select
              value={String(selectedYear)}
              onValueChange={(v) => setSelectedYear(Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y.value} value={String(y.value)}>
                    {y.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedYear !== currentYear && (
            <div className="bg-muted p-3 rounded-md text-sm">
              <p className="font-medium mb-1">Moving:</p>
              <p className="text-muted-foreground">
                "{subjectName}" from {YEARS.find((y) => y.value === currentYear)?.label} →{" "}
                {YEARS.find((y) => y.value === selectedYear)?.label}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleMove} disabled={selectedYear === currentYear}>
            Move Subject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
