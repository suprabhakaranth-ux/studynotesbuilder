import { BookOpen, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface TopicCardProps {
  topic: {
    id: string;
    title: string;
    summary?: string;
  };
  onClick: () => void;
}

export const TopicCard = ({ topic, onClick }: TopicCardProps) => {
  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2 border-border"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg mb-2 text-foreground truncate">
              {topic.title}
            </h3>
            {topic.summary && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {topic.summary}
              </p>
            )}
            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
              <FileText className="w-3 h-3" />
              <span>Click to view or edit</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
