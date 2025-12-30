import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SEOHead } from "@/components/SEOHead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BookOpen, ChevronDown, ChevronRight, FileText, GraduationCap, LogIn } from "lucide-react";

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
  subject_id: string;
  chapter_id: string | null;
  title: string;
}

const PublicLibrary = () => {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      const [subjectsRes, chaptersRes, topicsRes] = await Promise.all([
        supabase.from("subjects").select("*").order("created_at", { ascending: false }),
        supabase.from("chapters").select("*").order("chapter_order", { ascending: true }),
        supabase.from("topics").select("*").order("created_at", { ascending: false }),
      ]);

      if (subjectsRes.data) setSubjects(subjectsRes.data);
      if (chaptersRes.data) setChapters(chaptersRes.data);
      if (topicsRes.data) {
        setTopics(topicsRes.data.map(t => ({
          id: t.id,
          subject_id: t.subject_id || "",
          chapter_id: t.chapter_id,
          title: t.title,
        })));
      }

      setLoading(false);
    };

    loadData();
  }, []);

  const toggleSubject = (subjectId: string) => {
    setExpandedSubjects(prev => {
      const next = new Set(prev);
      if (next.has(subjectId)) {
        next.delete(subjectId);
      } else {
        next.add(subjectId);
      }
      return next;
    });
  };

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  };

  const getSubjectChapters = (subjectId: string) => 
    chapters.filter(c => c.subject_id === subjectId);

  const getChapterTopics = (chapterId: string) => 
    topics.filter(t => t.chapter_id === chapterId);

  const getUnchapteredTopics = (subjectId: string) => 
    topics.filter(t => t.subject_id === subjectId && !t.chapter_id);

  const totalTopics = topics.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-lg">Loading library...</div>
      </div>
    );
  }

  return (
    <>
      <SEOHead 
        title="Study Notes Library"
        description={`Browse ${totalTopics} study notes organized by subjects and chapters. Free educational resources for students.`}
      />
      
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">Study Notes Library</h1>
            </div>
            <Button variant="outline" onClick={() => navigate("/auth")} className="gap-2">
              <LogIn className="h-4 w-4" />
              Sign In
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          {subjects.length === 0 ? (
            <Card className="max-w-md mx-auto text-center py-12">
              <CardContent>
                <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h2 className="text-xl font-semibold mb-2">No Notes Available</h2>
                <p className="text-muted-foreground">
                  Check back later for study materials.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <p className="text-muted-foreground">
                  Browse {totalTopics} study notes across {subjects.length} subjects
                </p>
              </div>

              <div className="grid gap-4">
                {subjects.map(subject => {
                  const subjectChapters = getSubjectChapters(subject.id);
                  const unchapteredTopics = getUnchapteredTopics(subject.id);
                  const isExpanded = expandedSubjects.has(subject.id);
                  const subjectTopicCount = topics.filter(t => t.subject_id === subject.id).length;

                  return (
                    <Card key={subject.id} className="overflow-hidden">
                      <Collapsible open={isExpanded} onOpenChange={() => toggleSubject(subject.id)}>
                        <CollapsibleTrigger className="w-full">
                          <CardHeader className="flex flex-row items-center gap-4 hover:bg-accent/50 transition-colors cursor-pointer">
                            <div 
                              className="w-4 h-4 rounded-full shrink-0"
                              style={{ backgroundColor: subject.color }}
                            />
                            <CardTitle className="flex-1 text-left text-lg">
                              {subject.name}
                            </CardTitle>
                            <span className="text-sm text-muted-foreground mr-2">
                              {subjectTopicCount} topics
                            </span>
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            )}
                          </CardHeader>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                          <CardContent className="pt-0 space-y-4">
                            {/* Chapters */}
                            {subjectChapters.map(chapter => {
                              const chapterTopics = getChapterTopics(chapter.id);
                              const isChapterExpanded = expandedChapters.has(chapter.id);

                              return (
                                <Collapsible 
                                  key={chapter.id} 
                                  open={isChapterExpanded} 
                                  onOpenChange={() => toggleChapter(chapter.id)}
                                >
                                  <CollapsibleTrigger className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium flex-1 text-left">{chapter.name}</span>
                                    <span className="text-sm text-muted-foreground">
                                      {chapterTopics.length} topics
                                    </span>
                                    {isChapterExpanded ? (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </CollapsibleTrigger>
                                  
                                  <CollapsibleContent>
                                    <div className="ml-7 mt-2 space-y-1">
                                      {chapterTopics.map(topic => (
                                        <button
                                          key={topic.id}
                                          onClick={() => navigate(`/library/topic/${topic.id}`)}
                                          className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-accent transition-colors text-left"
                                        >
                                          <FileText className="h-4 w-4 text-muted-foreground" />
                                          <span className="text-sm">{topic.title}</span>
                                        </button>
                                      ))}
                                      {chapterTopics.length === 0 && (
                                        <p className="text-sm text-muted-foreground py-2">
                                          No topics in this chapter yet.
                                        </p>
                                      )}
                                    </div>
                                  </CollapsibleContent>
                                </Collapsible>
                              );
                            })}

                            {/* Unchaptered Topics */}
                            {unchapteredTopics.length > 0 && (
                              <div className="space-y-1">
                                {subjectChapters.length > 0 && (
                                  <p className="text-sm text-muted-foreground mb-2 font-medium">
                                    Other Topics
                                  </p>
                                )}
                                {unchapteredTopics.map(topic => (
                                  <button
                                    key={topic.id}
                                    onClick={() => navigate(`/library/topic/${topic.id}`)}
                                    className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-accent transition-colors text-left"
                                  >
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{topic.title}</span>
                                  </button>
                                ))}
                              </div>
                            )}

                            {subjectChapters.length === 0 && unchapteredTopics.length === 0 && (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                No topics in this subject yet.
                              </p>
                            )}
                          </CardContent>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t bg-card/50 mt-12">
          <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
            <p>Want to create your own study notes?</p>
            <Button variant="link" onClick={() => navigate("/auth")} className="text-primary">
              Sign up for free
            </Button>
          </div>
        </footer>
      </div>
    </>
  );
};

export default PublicLibrary;
