import { Plus, BookOpen, Settings } from "lucide-react";
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
    <div className="w-64 border-r border-border bg-sidebar flex flex-col h-screen">
      <div className="p-4 border-b border-border">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          Psychology Notes
        </h1>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase">Subjects</h2>
            <Button size="sm" variant="ghost" onClick={onNewSubject}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {subjects.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No subjects yet. Click + to add one.
            </p>
          ) : (
            subjects.map((subject) => (
              <button
                key={subject.id}
                onClick={() => onSubjectSelect(subject.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  activeSubject === subject.id
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-sidebar-accent"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
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
