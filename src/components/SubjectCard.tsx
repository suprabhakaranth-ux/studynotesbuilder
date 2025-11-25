import { FolderOpen, Trash2, Edit } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SubjectCardProps {
  subject: {
    id: string;
    name: string;
    color: string;
  };
  chapterCount?: number;
  onClick: () => void;
  onDelete: (id: string, name: string) => void;
  onEdit: (id: string, name: string) => void;
}

export const SubjectCard = ({ subject, chapterCount = 0, onClick, onDelete, onEdit }: SubjectCardProps) => {
  return (
    <Card className="relative hover:shadow-xl transition-all hover:scale-[1.02] border-2 border-border hover:border-primary/30 bg-gradient-to-br from-card to-card/50 group">
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-primary/20"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(subject.id, subject.name);
          }}
          title="Rename subject"
        >
          <Edit className="w-4 h-4 text-muted-foreground" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-destructive/20"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(subject.id, subject.name);
          }}
          title="Delete subject"
        >
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
      <CardContent className="p-6 cursor-pointer" onClick={onClick}>
        <div className="flex items-start gap-4">
          <div 
            className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow"
            style={{ 
              background: `linear-gradient(135deg, ${subject.color}33, ${subject.color}1a)`,
            }}
          >
            <FolderOpen className="w-7 h-7" style={{ color: subject.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-xl text-foreground truncate">
              {subject.name}
            </h3>
            <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
              <span>
                {chapterCount} {chapterCount === 1 ? "chapter" : "chapters"}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
