import { CalendarRange, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface YearCardProps {
  year: number;
  subjectCount: number;
  onClick: () => void;
}

export const YearCard = ({ year, subjectCount, onClick }: YearCardProps) => {
  const label = year === 1 ? "1st Year" : "2nd Year";

  return (
    <Card
      className="group cursor-pointer border-2 border-border bg-gradient-to-br from-card to-card/50 transition-all hover:scale-[1.02] hover:border-primary/30 hover:shadow-xl"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 shadow-sm transition-shadow group-hover:shadow-md">
            <CalendarRange className="h-7 w-7 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-bold text-foreground">{label}</h3>
            <div className="mt-4 flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {subjectCount} {subjectCount === 1 ? "subject" : "subjects"}
              </span>
              <ChevronRight className="h-4 w-4 text-primary" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
