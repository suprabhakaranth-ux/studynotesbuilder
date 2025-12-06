import { BookMarked, Trash2, MoveHorizontal, Edit, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface ChapterCardProps {
  chapter: {
    id: string;
    name: string;
    studied?: boolean;
  };
  onClick: () => void;
  onDelete: (id: string, name: string) => void;
  onMove: (id: string, name: string) => void;
  onEdit: (id: string, name: string) => void;
  onExport: (id: string, name: string) => void;
  onToggleStudied: (id: string) => void;
}

export const ChapterCard = ({ chapter, onClick, onDelete, onMove, onEdit, onExport, onToggleStudied }: ChapterCardProps) => {
  const isStudied = chapter.studied || false;

  return (
    <Card className={`relative hover:shadow-xl transition-all hover:scale-[1.02] border-2 hover:border-primary/30 bg-gradient-to-br from-card to-card/50 group ${isStudied ? 'border-green-500/50 bg-green-50/10' : 'border-border'}`}>
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-primary/20"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(chapter.id, chapter.name);
          }}
          title="Rename chapter"
        >
          <Edit className="w-4 h-4 text-muted-foreground" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-primary/20"
          onClick={(e) => {
            e.stopPropagation();
            onExport(chapter.id, chapter.name);
          }}
          title="Export chapter"
        >
          <Download className="w-4 h-4 text-muted-foreground" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-primary/20"
          onClick={(e) => {
            e.stopPropagation();
            onMove(chapter.id, chapter.name);
          }}
          title="Move chapter"
        >
          <MoveHorizontal className="w-4 h-4 text-muted-foreground" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-destructive/20"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(chapter.id, chapter.name);
          }}
          title="Delete chapter"
        >
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
      <CardContent className="p-6 cursor-pointer" onClick={onClick}>
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow ${isStudied ? 'bg-gradient-to-br from-green-500/20 to-green-600/20' : 'bg-gradient-to-br from-primary/20 to-secondary/20'}`}>
            <BookMarked className={`w-7 h-7 ${isStudied ? 'text-green-600' : 'text-primary'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-xl text-foreground truncate">
              {chapter.name}
            </h3>
            <div className="flex items-center justify-between gap-2 mt-4">
              <span className="text-xs text-primary font-medium">Click to view topics</span>
              <div 
                className="flex items-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={isStudied}
                  onCheckedChange={() => onToggleStudied(chapter.id)}
                  className={isStudied ? 'border-green-500 data-[state=checked]:bg-green-500 data-[state=checked]:text-white' : ''}
                />
                <span className={`text-xs ${isStudied ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
                  {isStudied ? 'Studied' : 'Mark studied'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
