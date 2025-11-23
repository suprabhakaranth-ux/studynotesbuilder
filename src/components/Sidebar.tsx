import { Plus, BookOpen, Settings, Sparkles, Trash2, FolderPlus, ChevronDown, ChevronRight, MoveHorizontal, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChapterSection } from "@/components/ChapterSection";
import { useNavigate } from "react-router-dom";

interface Subject {
  id: string;
  name: string;
  color: string;
}

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

interface SidebarProps {
  subjects: Subject[];
  chapters: Chapter[];
  topics: Topic[];
  activeSubject: string | null;
  activeChapter: string | null;
  activeTopic: string | null;
  expandedSubjects: Set<string>;
  expandedChapters: Set<string>;
  onSubjectSelect: (id: string) => void;
  onChapterSelect: (id: string) => void;
  onTopicSelect: (id: string) => void;
  onNewSubject: () => void;
  onEditSubject: (id: string, name: string) => void;
  onDeleteSubject: (id: string, name: string) => void;
  onNewChapter: (subjectId: string) => void;
  onEditChapter: (chapterId: string, name: string) => void;
  onDeleteChapter: (chapterId: string, name: string) => void;
  onMoveChapter: (chapterId: string, name: string) => void;
  onMoveTopic: (topicId: string, topicTitle: string) => void;
  onDeleteTopic: (topicId: string, topicTitle: string) => void;
  onToggleSubject: (id: string) => void;
  onToggleChapter: (id: string) => void;
}
export const Sidebar = ({
  subjects,
  chapters,
  topics,
  activeSubject,
  activeChapter,
  activeTopic,
  expandedSubjects,
  expandedChapters,
  onSubjectSelect,
  onChapterSelect,
  onTopicSelect,
  onNewSubject,
  onEditSubject,
  onDeleteSubject,
  onNewChapter,
  onEditChapter,
  onDeleteChapter,
  onMoveChapter,
  onMoveTopic,
  onDeleteTopic,
  onToggleSubject,
  onToggleChapter,
}: SidebarProps) => {
  const navigate = useNavigate();
  
  return <div className="w-64 border-r-2 border-border bg-gradient-to-b from-sidebar-background to-sidebar-accent/30 flex flex-col h-screen shadow-lg">
      <div className="p-4 border-b-2 border-border bg-gradient-to-br from-primary/10 to-secondary/10">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-primary to-secondary rounded-lg">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Study Notes</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">Create your study notes<Sparkles className="w-3 h-3 text-accent" />
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
            subjects.map((subject) => {
              const isExpanded = expandedSubjects.has(subject.id);
              const subjectChapters = chapters.filter(
                (ch) => ch.subject_id === subject.id
              );
              const subjectTopicsNoChapter = topics.filter(
                (t) => t.subjectId === subject.id && !t.chapterId
              );

              return (
                <div key={subject.id} className="mb-3">
                  <div
                    className={`group relative px-3 py-2.5 rounded-lg transition-all ${
                      activeSubject === subject.id
                        ? "bg-gradient-to-r from-primary/20 to-secondary/20 text-foreground font-medium shadow-sm border border-primary/20"
                        : "hover:bg-sidebar-accent hover:scale-[1.02]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onToggleSubject(subject.id)}
                        className="p-0.5 hover:bg-sidebar-accent rounded"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </button>
                      <button
                        onClick={() => onSubjectSelect(subject.id)}
                        className="flex-1 text-left flex items-center gap-2"
                      >
                        <div
                          className="w-3 h-3 rounded-full shadow-sm"
                          style={{ backgroundColor: subject.color }}
                        />
                        <span className="text-sm font-medium truncate">
                          {subject.name}
                        </span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSubject(subject.id, subject.name);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/20 rounded"
                        title="Delete subject"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="ml-3 mt-2 space-y-2">
                      {/* Add Chapter Button */}
                      <button
                        onClick={() => onNewChapter(subject.id)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-md transition-colors"
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                        Add Chapter
                      </button>

                      {/* Chapters */}
                      {subjectChapters.map((chapter) => {
                        const chapterTopics = topics.filter(
                          (t) => t.chapterId === chapter.id
                        );
                        return (
                          <ChapterSection
                            key={chapter.id}
                            chapter={chapter}
                            topics={chapterTopics}
                            isExpanded={expandedChapters.has(chapter.id)}
                            isActive={activeChapter === chapter.id}
                            onToggle={() => onToggleChapter(chapter.id)}
                            onChapterClick={onChapterSelect}
                            onEditChapter={onEditChapter}
                            onDeleteChapter={onDeleteChapter}
                            onMoveChapter={onMoveChapter}
                            onTopicClick={onTopicSelect}
                            onMoveTopic={onMoveTopic}
                            onDeleteTopic={onDeleteTopic}
                            activeTopic={activeTopic}
                          />
                        );
                      })}

                      {/* Topics without chapter (directly under subject) */}
                      {subjectTopicsNoChapter.length > 0 && (
                        <div className="space-y-1">
                          {subjectTopicsNoChapter.map((topic) => (
                            <div
                              key={topic.id}
                              className={`group relative px-3 py-1.5 rounded-md transition-all ${
                                activeTopic === topic.id
                                  ? "bg-primary/10 text-foreground font-medium"
                                  : "hover:bg-sidebar-accent"
                              }`}
                            >
                              <button
                                onClick={() => onTopicSelect(topic.id)}
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
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border space-y-2">
        <Button 
          variant="outline" 
          className="w-full justify-start bg-gradient-to-r from-primary/10 to-secondary/10 hover:from-primary/20 hover:to-secondary/20 border-primary/20" 
          size="sm"
          onClick={() => navigate('/ai-chat')}
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          AI Study Assistant
        </Button>
        <Button 
          variant="outline" 
          className="w-full justify-start" 
          size="sm"
          onClick={() => window.open('/showcase', '_blank')}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          View Demo
        </Button>
        <Button variant="ghost" className="w-full justify-start" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </Button>
      </div>
    </div>;
};