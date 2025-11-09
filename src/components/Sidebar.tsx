import { Plus, BookOpen, Settings, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Subject {
  id: string;
  name: string;
  color: string;
}

interface SidebarProps {
  subjects: Subject[];
  activeSubject: string | null;
  onSubjectSelect: (id: string) => void;
  onNewSubject: () => void;
}

export const Sidebar = ({ subjects, activeSubject, onSubjectSelect, onNewSubject }: SidebarProps) => {
  return (
    <div className="w-64 border-r-2 border-border bg-gradient-to-b from-sidebar-background to-sidebar-accent/30 flex flex-col h-screen shadow-lg">
      <div className="p-4 border-b-2 border-border bg-gradient-to-br from-primary/10 to-secondary/10">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-primary to-secondary rounded-lg">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Psychology Notes
          </span>
        </h1>
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-accent" />
          Master's Program
        </p>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase">Subjects</h2>
            <Button size="sm" variant="ghost" onClick={onNewSubject} className="hover:bg-primary/10">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {subjects.length === 0 ? (
            <div className="text-center py-8 px-4 bg-muted/30 rounded-lg border-2 border-dashed border-border">
              <Sparkles className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No subjects yet. Click + to add one.
              </p>
            </div>
          ) : (
            subjects.map((subject) => (
              <button
                key={subject.id}
                onClick={() => onSubjectSelect(subject.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                  activeSubject === subject.id
                    ? "bg-gradient-to-r from-primary/20 to-secondary/20 text-foreground font-medium shadow-sm border border-primary/20"
                    : "hover:bg-sidebar-accent hover:scale-[1.02]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full shadow-sm"
                    style={{ backgroundColor: subject.color }}
                  />
                  <span className="text-sm font-medium truncate">{subject.name}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <Button variant="ghost" className="w-full justify-start" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </Button>
      </div>
    </div>
  );
};
