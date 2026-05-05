import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SEOHead } from "@/components/SEOHead";
import { Sidebar } from "@/components/Sidebar";
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
  slug: string;
}

interface Chapter {
  id: string;
  subject_id: string;
  name: string;
  chapter_order: number;
  slug: string;
}

interface Topic {
  id: string;
  subjectId: string;
  title: string;
  chapterId?: string | null;
  slug: string;
}

const PUBLIC_OWNER_ID = "b6dc6569-25ba-4ea0-a7bf-607219aa8daf";
const NO_CHAPTER = "_";

const PublicLibrary = () => {
  const navigate = useNavigate();
  const { subjectSlug, chapterSlug } = useParams<{ subjectSlug?: string; chapterSlug?: string }>();
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
        supabase.from("subjects").select("*").eq("user_id", PUBLIC_OWNER_ID).order("created_at", { ascending: false }),
        supabase.from("chapters").select("*").eq("user_id", PUBLIC_OWNER_ID).order("chapter_order", { ascending: true }),
        supabase.from("topics").select("*").eq("user_id", PUBLIC_OWNER_ID).order("created_at", { ascending: false }),
      ]);

      if (subjectsRes.data) setSubjects(subjectsRes.data as any);
      if (chaptersRes.data) setChapters(chaptersRes.data as any);
      if (topicsRes.data) {
        setTopics(topicsRes.data.map((t: any) => ({
          id: t.id,
          subjectId: t.subject_id || "",
          title: t.title,
          chapterId: t.chapter_id,
          slug: t.slug,
        })));
      }
      setLoading(false);
    };
    loadData();
  }, []);

  const activeSubjectData = useMemo(
    () => subjects.find(s => s.slug === subjectSlug) || null,
    [subjects, subjectSlug]
  );
  const activeChapterData = useMemo(
    () => chapters.find(c => c.slug === chapterSlug && c.subject_id === activeSubjectData?.id) || null,
    [chapters, chapterSlug, activeSubjectData]
  );
  const activeSubject = activeSubjectData?.id || null;
  const activeChapter = activeChapterData?.id || null;

  // Auto-expand sidebar nodes for current path
  useEffect(() => {
    if (activeSubject) setExpandedSubjects(prev => new Set(prev).add(activeSubject));
    if (activeChapter) setExpandedChapters(prev => new Set(prev).add(activeChapter));
  }, [activeSubject, activeChapter]);

  const handleSubjectSelect = (id: string) => {
    const s = subjects.find(x => x.id === id);
    if (s) navigate(`/library/${s.slug}`);
  };

  const handleChapterSelect = (id: string) => {
    const c = chapters.find(x => x.id === id);
    const s = c ? subjects.find(x => x.id === c.subject_id) : null;
    if (c && s) navigate(`/library/${s.slug}/${c.slug}`);
  };

  const handleTopicSelect = (id: string) => {
    const t = topics.find(x => x.id === id);
    if (!t) return;
    const s = subjects.find(x => x.id === t.subjectId);
    const c = t.chapterId ? chapters.find(x => x.id === t.chapterId) : null;
    if (s) navigate(`/library/${s.slug}/${c?.slug || NO_CHAPTER}/${t.slug}`);
  };

  const handleToggleSubject = (id: string) => {
    setExpandedSubjects(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const handleToggleChapter = (id: string) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const totalTopics = topics.length;
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

  const canonical = typeof window !== "undefined"
    ? `${window.location.origin}${window.location.pathname}`
    : undefined;

  return (
    <>
      <SEOHead
        title={activeChapterData?.name || activeSubjectData?.name || "IGNOU MA Psychology Study Notes"}
        description={`Browse ${totalTopics} study notes organized by subjects and chapters. Free educational resources for IGNOU MA Psychology students.`}
        canonicalUrl={canonical}
      />
      <div className="flex h-screen w-full bg-background">
        <Sidebar
          subjects={subjects}
          chapters={chapters}
          topics={topics}
          activeSubject={activeSubject}
          activeChapter={activeChapter}
          activeTopic={null}
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
          {activeSubjectData ? (
            <div className="p-8">
              <Breadcrumb className="mb-6">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink className="cursor-pointer hover:text-primary" onClick={() => navigate("/library")}>
                      All Subjects
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {activeChapterData ? (
                      <BreadcrumbLink className="cursor-pointer hover:text-primary" onClick={() => navigate(`/library/${activeSubjectData.slug}`)}>
                        {activeSubjectData.name}
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{activeSubjectData.name}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                  {activeChapterData && (
                    <>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage>{activeChapterData.name}</BreadcrumbPage>
                      </BreadcrumbItem>
                    </>
                  )}
                </BreadcrumbList>
              </Breadcrumb>

              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">
                    {activeChapterData ? activeChapterData.name : activeSubjectData.name}
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    {activeChapterData && `${activeSubjectData.name} • `}
                    {activeChapter
                      ? `${activeTopics.length} ${activeTopics.length === 1 ? "topic" : "topics"}`
                      : `${chapters.filter(c => c.subject_id === activeSubject).length} chapters`}
                  </p>
                </div>
              </div>

              {activeChapter ? (
                activeTopics.length === 0 ? (
                  <div className="text-center py-16"><p className="text-muted-foreground">No topics in this chapter yet.</p></div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {activeTopics.map(topic => (
                      <Card key={topic.id} className="relative hover:shadow-xl transition-all hover:scale-[1.02] border-2 border-border hover:border-primary/30 bg-gradient-to-br from-card to-card/50 group cursor-pointer" onClick={() => handleTopicSelect(topic.id)}>
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0 shadow-sm">
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
                chapters.filter(c => c.subject_id === activeSubject).length === 0 ? (
                  <div className="text-center py-16"><p className="text-muted-foreground">No chapters in this subject yet.</p></div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {chapters.filter(c => c.subject_id === activeSubject).sort((a, b) => a.chapter_order - b.chapter_order).map(chapter => (
                      <Card key={chapter.id} className="relative hover:shadow-xl transition-all hover:scale-[1.02] border-2 border-border hover:border-primary/30 bg-gradient-to-br from-card to-card/50 group cursor-pointer" onClick={() => navigate(`/library/${activeSubjectData.slug}/${chapter.slug}`)}>
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0 shadow-sm">
                              <BookMarked className="w-7 h-7 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-xl text-foreground truncate">{chapter.name}</h3>
                              <div className="flex items-center gap-2 mt-4 text-xs text-primary font-medium">
                                <span>{topics.filter(t => t.chapterId === chapter.id).length} topics</span>
                                <span>•</span><span>Click to view</span>
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
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">All Subjects</h1>
                  <p className="text-muted-foreground mt-1">{subjects.length} subjects • {totalTopics} topics</p>
                </div>
              </div>
              {subjects.length === 0 ? (
                <div className="text-center py-16"><p className="text-muted-foreground">No subjects available yet.</p></div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {subjects.map(subject => (
                    <Card key={subject.id} className="relative hover:shadow-xl transition-all hover:scale-[1.02] border-2 border-border hover:border-primary/30 bg-gradient-to-br from-card to-card/50 group cursor-pointer" onClick={() => navigate(`/library/${subject.slug}`)}>
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: `linear-gradient(135deg, ${subject.color}33, ${subject.color}1a)` }}>
                            <FolderOpen className="w-7 h-7" style={{ color: subject.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-xl text-foreground truncate">{subject.name}</h3>
                            <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
                              <span>{chapters.filter(c => c.subject_id === subject.id).length} chapters</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PublicLibrary;
