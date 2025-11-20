import { BookOpen, FileText, Sparkles, Trash2, MoveHorizontal, Edit } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TopicCardProps {
  topic: {
    id: string;
    title: string;
    summary?: string;
  };
  onClick: () => void;
  onDelete: (id: string, title: string) => void;
  onMove: (id: string, title: string) => void;
  onEdit: (id: string, title: string) => void;
}

export const TopicCard = ({ topic, onClick, onDelete, onMove, onEdit }: TopicCardProps) => {
  return (
    <Card className="relative hover:shadow-xl transition-all hover:scale-[1.02] border-2 border-border hover:border-primary/30 bg-gradient-to-br from-card to-card/50 group">
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-primary/20"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(topic.id, topic.title);
          }}
          title="Rename topic"
        >
          <Edit className="w-4 h-4 text-muted-foreground" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-primary/20"
          onClick={(e) => {
            e.stopPropagation();
            onMove(topic.id, topic.title);
          }}
          title="Move topic"
        >
          <MoveHorizontal className="w-4 h-4 text-muted-foreground" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-destructive/20"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(topic.id, topic.title);
          }}
          title="Delete topic"
        >
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
      <CardContent className="p-6 cursor-pointer" onClick={onClick}>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
            <BookOpen className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-xl mb-2 text-foreground line-clamp-2 flex items-center gap-2">
              {topic.title}
              <Sparkles className="w-4 h-4 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            {topic.summary && (
              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {topic.summary}
              </p>
            )}
            <div className="flex items-center gap-2 mt-4 text-xs text-primary font-medium">
              <FileText className="w-3 h-3" />
              <span>Click to view or edit</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
