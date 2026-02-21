import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SEOHead } from "@/components/SEOHead";
import { Sidebar } from "@/components/Sidebar";
import { TopicEditor } from "@/components/TopicEditor";
import { BookOpen, Sparkles, FolderOpen, BookMarked, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

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

// The public owner ID for read-only access
const PUBLIC_OWNER_ID = "b6dc6569-25ba-4ea0-a7bf-607219aa8daf";

const PublicLibrary = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [activeChapter, setActiveChapter] = useState<string | null>(null);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [editingTopic, setEditingTopic] = useState<string | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      const [subjectsRes, chaptersRes, topicsRes] = await Promise.all([
        supabase.from("subjects").select("*").eq("user_id", PUBLIC_OWNER_ID).order("created_at", { ascending: false }),
        supabase.from("chapters").select("*").eq("user_id", PUBLIC_OWNER_ID).order("chapter_order", { ascending: true }),
        supabase.from("topics").select("*").eq("user_id", PUBLIC_OWNER_ID).order("created_at", { ascending: false }),
      ]);

      if (subjectsRes.data) setSubjects(subjectsRes.data);
      if (chaptersRes.data) setChapters(chaptersRes.data);
      if (topicsRes.data) {
        setTopics(topicsRes.data.map(t => ({
          id: t.id,
          subjectId: t.subject_id || "",
          title: t.title,
          chapterId: t.chapter_id,
        })));
      }

      setLoading(false);
    };

    loadData();
  }, []);

  const handleSubjectSelect = (id: string) => {
    setActiveSubject(id);
    setActiveChapter(null);
    setActiveTopic(null);
    setEditingTopic(null);
  };

  const handleChapterSelect = (id: string) => {
    const chapter = chapters.find(ch => ch.id === id);
    if (chapter) {
      setActiveSubject(chapter.subject_id);
      setActiveChapter(id);
      setActiveTopic(null);
      setEditingTopic(null);
    }
  };

  const handleTopicSelect = (id: string) => {
    setActiveTopic(id);
    setEditingTopic(id);
  };

  const handleToggleSubject = (id: string) => {
    setExpandedSubjects(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleChapter = (id: string) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getActiveTopicTitle = () => {
    const topic = topics.find(t => t.id === editingTopic);
    return topic?.title || "";
  };

  const totalTopics = topics.length;
  const activeSubjectData = subjects.find(s => s.id === activeSubject);
  const activeChapterData = chapters.find(ch => ch.id === activeChapter);

  const activeTopics = activeChapter
    ? topics.filter(t => t.chapterId === activeChapter)
    : topics.filter(t => t.subjectId === activeSubject && !t.chapterId);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-lg">Loading library...</div>
      </div>
    );
  }

  // Show TopicEditor full screen when editing a topic (mirrors Index.tsx behavior)
  if (editingTopic) {
    return (
      <>
        <SEOHead 
          title="IGNOU MA Psychology Study Notes"
          description={`Browse ${totalTopics} study notes organized by subjects and chapters.`}
        />
        <div className="flex h-screen w-full bg-background">
          <Sidebar
            subjects={subjects}
            chapters={chapters}
            topics={topics}
            activeSubject={activeSubject}
            activeChapter={activeChapter}
            activeTopic={activeTopic}
            expandedSubjects={expandedSubjects}
            expandedChapters={expandedChapters}
            onSubjectSelect={handleSubjectSelect}
            onChapterSelect={handleChapterSelect}
            onTopicSelect={handleTopicSelect}
            onToggleSubject={handleToggleSubject}
            onToggleChapter={handleToggleChapter}
            readOnly={true}
          />
          <main className="flex-1 overflow-hidden">
            <TopicEditor
              topicId={editingTopic}
              topicTitle={getActiveTopicTitle()}
              onBack={() => setEditingTopic(null)}
              readOnly={true}
              userId={PUBLIC_OWNER_ID}
            />
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead 
        title="IGNOU MA Psychology Study Notes"
        description={`Browse ${totalTopics} study notes organized by subjects and chapters. Free educational resources for IGNOU MA Psychology students.`}
      />
      
      <div className="flex h-screen w-full bg-background">
        <Sidebar
          subjects={subjects}
          chapters={chapters}
          topics={topics}
          activeSubject={activeSubject}
          activeChapter={activeChapter}
          activeTopic={activeTopic}
          expandedSubjects={expandedSubjects}
          expandedChapters={expandedChapters}
          onSubjectSelect={handleSubjectSelect}
          onChapterSelect={handleChapterSelect}
          onTopicSelect={handleTopicSelect}
          onToggleSubject={handleToggleSubject}
          onToggleChapter={handleToggleChapter}
          readOnly={true}
        />

        <div className="flex-1 overflow-auto">
          {activeSubject ? (
            <div className="p-8">
              {/* Breadcrumb Navigation */}
              <Breadcrumb className="mb-6">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      className="cursor-pointer hover:text-primary"
                      onClick={() => {
                        setActiveSubject(null);
                        setActiveChapter(null);
                      }}
                    >
                      All Subjects
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {activeChapter ? (
                      <BreadcrumbLink
                        className="cursor-pointer hover:text-primary"
                        onClick={() => setActiveChapter(null)}
                      >
                        {activeSubjectData?.name}
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{activeSubjectData?.name}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                  {activeChapter && (
                    <>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage>{activeChapterData?.name}</BreadcrumbPage>
                      </BreadcrumbItem>
                    </>
                  )}
                </BreadcrumbList>
              </Breadcrumb>

              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-foreground">
                    {activeChapterData ? activeChapterData.name : activeSubjectData?.name}
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    {activeChapterData && `${activeSubjectData?.name} • `}
                    {activeChapter 
                      ? `${activeTopics.length} ${activeTopics.length === 1 ? "topic" : "topics"}`
                      : `${chapters.filter(c => c.subject_id === activeSubject).length} ${chapters.filter(c => c.subject_id === activeSubject).length === 1 ? "chapter" : "chapters"}`
                    }
                  </p>
                </div>
              </div>

              {activeChapter ? (
                // Display topics when a chapter is selected
                activeTopics.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-muted-foreground">No topics in this chapter yet.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {activeTopics.map((topic) => (
                      <Card 
                        key={topic.id} 
                        className="relative hover:shadow-xl transition-all hover:scale-[1.02] border-2 border-border hover:border-primary/30 bg-gradient-to-br from-card to-card/50 group cursor-pointer"
                        onClick={() => handleTopicSelect(topic.id)}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
                              <BookOpen className="w-7 h-7 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-xl mb-2 text-foreground line-clamp-2 flex items-center gap-2">
                                {topic.title}
                                <Sparkles className="w-4 h-4 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                              </h3>
                              <div className="flex items-center gap-2 text-xs text-primary font-medium mt-4">
                                <FileText className="w-3 h-3" />
                                <span>Click to read</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )
              ) : (
                // Display chapters when a subject is selected
                chapters.filter(c => c.subject_id === activeSubject).length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-muted-foreground">No chapters in this subject yet.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {chapters
                      .filter(c => c.subject_id === activeSubject)
                      .sort((a, b) => a.chapter_order - b.chapter_order)
                      .map((chapter) => (
                        <Card 
                          key={chapter.id}
                          className="relative hover:shadow-xl transition-all hover:scale-[1.02] border-2 border-border hover:border-primary/30 bg-gradient-to-br from-card to-card/50 group cursor-pointer"
                          onClick={() => {
                            setActiveChapter(chapter.id);
                            setExpandedSubjects(prev => new Set(prev).add(activeSubject!));
                            setExpandedChapters(prev => new Set(prev).add(chapter.id));
                          }}
                        >
                          <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
                                <BookMarked className="w-7 h-7 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-xl text-foreground truncate">
                                  {chapter.name}
                                </h3>
                                <div className="flex items-center gap-2 mt-4 text-xs text-primary font-medium">
                                  <span>
                                    {topics.filter(t => t.chapterId === chapter.id).length} topics
                                  </span>
                                  <span>•</span>
                                  <span>Click to view</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )
              )}
            </div>
          ) : (
            // No subject selected — show all subjects as cards
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-foreground">
                    All Subjects
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    {subjects.length} {subjects.length === 1 ? "subject" : "subjects"} • {totalTopics} topics
                  </p>
                </div>
              </div>

              {subjects.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground">No subjects available yet.</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {subjects.map((subject) => (
                    <Card 
                      key={subject.id}
                      className="relative hover:shadow-xl transition-all hover:scale-[1.02] border-2 border-border hover:border-primary/30 bg-gradient-to-br from-card to-card/50 group cursor-pointer"
                      onClick={() => {
                        handleSubjectSelect(subject.id);
                        setExpandedSubjects(prev => new Set(prev).add(subject.id));
                      }}
                    >
                      <CardContent className="p-6">
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
                                {chapters.filter(c => c.subject_id === subject.id).length} chapters
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <div className="mt-12 text-center">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>Want to create your own study notes?</span>
                  <a 
                    href="https://lovable.dev" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-medium"
                  >
                    Remix this app with Lovable
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PublicLibrary;
