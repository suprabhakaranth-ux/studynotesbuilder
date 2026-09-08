import { CalendarRange, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface YearCardProps {
  year: number;
  subjectCount: number;
  expanded: boolean;
  onToggle: () => void;
}

export const YearCard = ({ year, subjectCount, expanded, onToggle }: YearCardProps) => {
  const label = year === 1 ? "1st Year" : "2nd Year";

  return (
    <Card className="group border-2 border-border bg-gradient-to-br from-card to-card/50 transition-all hover:scale-[1.02] hover:border-primary/30 hover:shadow-xl">
      <CardContent className="p-0">
        <Button
          type="button"
          variant="ghost"
          className="h-auto w-full justify-start rounded-lg p-6 text-left hover:bg-transparent"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={`${expanded ? "Collapse" : "Expand"} ${label}`}
        >
          <span className="flex w-full items-start gap-4">
            <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 shadow-sm transition-shadow group-hover:shadow-md">
              <CalendarRange className="h-7 w-7 text-primary" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xl font-bold text-foreground">{label}</span>
              <span className="mt-4 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  {subjectCount} {subjectCount === 1 ? "subject" : "subjects"}
                </span>
                <span className="flex items-center gap-1 font-medium text-primary">
                  {expanded ? "Collapse" : "Expand"}
                  {expanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </span>
              </span>
            </span>
          </span>
        </Button>
      </CardContent>
    </Card>
  );
};