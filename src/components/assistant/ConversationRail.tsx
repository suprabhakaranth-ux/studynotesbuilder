import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, MessageSquare, Trash2 } from "lucide-react";

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export const ConversationRail = ({ conversations, activeId, onSelect, onNew, onDelete }: Props) => {
  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col">
      <div className="p-3 border-b border-border">
        <Button onClick={onNew} className="w-full" size="sm">
          <Plus className="w-4 h-4 mr-2" /> New chat
        </Button>
      </div>
      <ScrollArea className="flex-1 p-2">
        {conversations.length === 0 ? (
          <p className="text-xs text-muted-foreground p-3">No conversations yet.</p>
        ) : (
          conversations.map((c) => (
            <div
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`group flex items-center gap-2 p-2.5 rounded-md cursor-pointer mb-1 transition-colors ${
                activeId === c.id ? "bg-accent" : "hover:bg-accent/60"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
              <span className="text-sm truncate flex-1">{c.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 rounded"
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </button>
            </div>
          ))
        )}
      </ScrollArea>
    </aside>
  );
};
