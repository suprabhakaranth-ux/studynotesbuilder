import { ChevronDown, ChevronRight, Edit, Trash2, MoveHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Chapter {
  id: string;
  subject_id: string;
  name: string;
  chapter_order: number;
}

interface Topic {
  id: string;
  subjectId: string;
  title: string;
  chapterId?: string | null;
}

interface ChapterSectionProps {
  chapter: Chapter;
  topics: Topic[];
  isExpanded: boolean;
  onToggle: () => void;
  onEditChapter: (id: string, name: string) => void;
  onDeleteChapter: (id: string, name: string) => void;
  onMoveChapter: (id: string, name: string) => void;
  onTopicClick: (id: string) => void;
  onMoveTopic: (topicId: string, topicTitle: string) => void;
  onDeleteTopic: (id: string, name: string) => void;
  activeTopic?: string | null;
}

export const ChapterSection = ({
  chapter,
  topics,
  isExpanded,
  onToggle,
  onEditChapter,
  onDeleteChapter,
  onMoveChapter,
  onTopicClick,
  onMoveTopic,
  onDeleteTopic,
  activeTopic,
}: ChapterSectionProps) => {
  return (
    <div className="mb-2">
      <div className="group relative px-2 py-1.5 rounded-md hover:bg-sidebar-accent/50 transition-all">
        <div className="flex items-center gap-1">
          <button
            onClick={onToggle}
            className="p-0.5 hover:bg-sidebar-accent rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </button>
          <button
            onClick={onToggle}
            className="flex-1 text-left text-sm font-medium text-foreground truncate"
          >
            {chapter.name}
          </button>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditChapter(chapter.id, chapter.name);
              }}
              className="p-1 hover:bg-primary/20 rounded"
              title="Edit chapter"
            >
              <Edit className="w-3 h-3 text-muted-foreground" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveChapter(chapter.id, chapter.name);
              }}
              className="p-1 hover:bg-primary/20 rounded"
              title="Move chapter"
            >
              <MoveHorizontal className="w-3 h-3 text-muted-foreground" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteChapter(chapter.id, chapter.name);
              }}
              className="p-1 hover:bg-destructive/20 rounded"
              title="Delete chapter"
            >
              <Trash2 className="w-3 h-3 text-destructive" />
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="ml-4 mt-1 space-y-1">
          {topics.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-1">
              No topics in this chapter
            </p>
          ) : (
            topics.map((topic) => (
              <div
                key={topic.id}
                className={cn(
                  "group relative px-2 py-1.5 rounded-md transition-all",
                  activeTopic === topic.id
                    ? "bg-primary/10 text-foreground font-medium"
                    : "hover:bg-sidebar-accent"
                )}
              >
                <button
                  onClick={() => onTopicClick(topic.id)}
                  className="w-full text-left text-sm truncate"
                >
                  {topic.title}
                </button>
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 md:opacity-0 md:group-hover:opacity-100 opacity-100 z-10 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveTopic(topic.id, topic.title);
                    }}
                    className="p-1 hover:bg-primary/20 rounded"
                    title="Move topic"
                  >
                    <MoveHorizontal className="w-3 h-3 text-muted-foreground" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteTopic(topic.id, topic.title);
                    }}
                    className="p-1 hover:bg-destructive/20 rounded"
                    title="Delete topic"
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
