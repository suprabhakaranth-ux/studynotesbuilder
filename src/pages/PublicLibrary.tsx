import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SEOHead } from "@/components/SEOHead";
import { Sidebar } from "@/components/Sidebar";
import { TopicEditor } from "@/components/TopicEditor";
import { BookOpen, Sparkles } from "lucide-react";

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
  };

  const handleChapterSelect = (id: string) => {
    setActiveChapter(id);
    setActiveTopic(null);
  };

  const handleTopicSelect = (id: string) => {
    setActiveTopic(id);
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
    const topic = topics.find(t => t.id === activeTopic);
    return topic?.title || "";
  };

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
        title="IGNOU MA Psychology Study Notes"
        description={`Browse ${totalTopics} study notes organized by subjects and chapters. Free educational resources for IGNOU MA Psychology students.`}
      />
      
      <div className="flex min-h-screen w-full">
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
          {activeTopic ? (
            <TopicEditor
              topicId={activeTopic}
              topicTitle={getActiveTopicTitle()}
              onBack={() => setActiveTopic(null)}
              readOnly={true}
              userId={PUBLIC_OWNER_ID}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
              <div className="text-center max-w-2xl">
                <div className="p-4 bg-gradient-to-br from-primary to-secondary rounded-2xl inline-block mb-6">
                  <BookOpen className="w-12 h-12 text-white" />
                </div>
                <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  IGNOU MA Psychology Study Notes
                </h1>
                <p className="text-lg text-muted-foreground mb-8">
                  Browse {totalTopics} study notes across {subjects.length} subjects. 
                  Select a topic from the sidebar to start reading.
                </p>
                
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
        </main>
      </div>
    </>
  );
};

export default PublicLibrary;
