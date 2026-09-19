import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Presentation as PresentationIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SEOHead } from "@/components/SEOHead";
import { Sidebar } from "@/components/Sidebar";
import { YearCard } from "@/components/YearCard";
import { SubjectCard } from "@/components/SubjectCard";
import { ChapterCard } from "@/components/ChapterCard";
import { TopicCard } from "@/components/TopicCard";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  year?: number | null;
  studied?: boolean;
}

interface Chapter {
  id: string;
  subject_id: string;
  name: string;
  chapter_order: number;
  slug: string;
  studied?: boolean;
}

interface Topic {
  id: string;
  subjectId: string;
  title: string;
  chapterId?: string | null;
  slug: string;
  summary?: string;
  studied?: boolean;
}

interface Presentation {
  id: string;
  subject_id: string;
  title: string;
  slug: string;
  page_count: number | null;
}

const PUBLIC_OWNER_ID = "b6dc6569-25ba-4ea0-a7bf-607219aa8daf";
const NO_CHAPTER = "_";

const PublicLibrary = () => {
  const navigate = useNavigate();
  const { subjectSlug, chapterSlug } = useParams<{ subjectSlug?: string; chapterSlug?: string }>();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [activeYear, setActiveYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [subjectsRes, chaptersRes, topicsRes, presentationsRes] = await Promise.all([
        supabase.from("subjects").select("*").eq("user_id", PUBLIC_OWNER_ID).eq("year", 1).order("created_at", { ascending: false }),
        supabase.from("chapters").select("*").eq("user_id", PUBLIC_OWNER_ID).order("chapter_order", { ascending: true }),
        supabase.from("topics").select("*").eq("user_id", PUBLIC_OWNER_ID).order("created_at", { ascending: false }),
        supabase.from("presentations").select("id, subject_id, title, slug, page_count").eq("user_id", PUBLIC_OWNER_ID).order("presentation_order"),
      ]);

      setSubjects((subjectsRes.data || []) as Subject[]);
      setChapters((chaptersRes.data || []) as Chapter[]);
      setPresentations((presentationsRes.data || []) as Presentation[]);
      setTopics((topicsRes.data || []).map((topic) => ({
        id: topic.id,
        subjectId: topic.subject_id || "",
        title: topic.title,
        chapterId: topic.chapter_id,
        slug: topic.slug,
        studied: topic.studied,
      })));
      setLoading(false);
    };
    loadData();
  }, []);

  const activeSubjectData = useMemo(
    () => subjects.find((subject) => subject.slug === subjectSlug) || null,
    [subjects, subjectSlug],
  );
  const activeChapterData = useMemo(
    () => chapters.find((chapter) => chapter.slug === chapterSlug && chapter.subject_id === activeSubjectData?.id) || null,
    [chapters, chapterSlug, activeSubjectData],
  );
  const activeSubject = activeSubjectData?.id || null;
  const activeChapter = activeChapterData?.id || null;

  useEffect(() => {
    if (activeSubject) {
      setActiveYear(1);
      setExpandedSubjects((previous) => new Set(previous).add(activeSubject));
    }
    if (activeChapter) setExpandedChapters((previous) => new Set(previous).add(activeChapter));
  }, [activeSubject, activeChapter]);

  const handleSubjectSelect = (id: string) => {
    const subject = subjects.find((item) => item.id === id);
    if (subject) navigate(`/library/${subject.slug}`);
  };

  const handleChapterSelect = (id: string) => {
    const chapter = chapters.find((item) => item.id === id);
    const subject = chapter ? subjects.find((item) => item.id === chapter.subject_id) : null;
    if (chapter && subject) navigate(`/library/${subject.slug}/${chapter.slug}`);
  };

  const handleTopicSelect = (id: string) => {
    const topic = topics.find((item) => item.id === id);
    if (!topic) return;
    const subject = subjects.find((item) => item.id === topic.subjectId);
    const chapter = topic.chapterId ? chapters.find((item) => item.id === topic.chapterId) : null;
    if (subject) navigate(`/library/${subject.slug}/${chapter?.slug || NO_CHAPTER}/${topic.slug}`);
  };

  const toggleSubject = (id: string) => {
    setExpandedSubjects((previous) => {
      const next = new Set(previous);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleChapter = (id: string) => {
    setExpandedChapters((previous) => {
      const next = new Set(previous);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-lg text-muted-foreground">Loading library...</div>
      </div>
    );
  }

  const totalTopics = topics.length;
  const activeTopics = activeChapter
    ? topics.filter((topic) => topic.chapterId === activeChapter)
    : topics.filter((topic) => topic.subjectId === activeSubject && !topic.chapterId);
  const canonical = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : undefined;

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
          onToggleSubject={toggleSubject}
          onToggleChapter={toggleChapter}
          readOnly
        />

        <div className="flex-1 overflow-auto">
          {activeSubjectData ? (
            <div className="p-8">
              <Breadcrumb className="mb-6">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink className="cursor-pointer hover:text-primary" onClick={() => { setActiveYear(null); navigate("/library"); }}>
                      All Subjects
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink className="cursor-pointer hover:text-primary" onClick={() => { setActiveYear(1); navigate("/library"); }}>
                      1st Year
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {activeChapterData ? (
                      <BreadcrumbLink className="cursor-pointer hover:text-primary" onClick={() => navigate(`/library/${activeSubjectData.slug}`)}>
                        {activeSubjectData.name}
                      </BreadcrumbLink>
                    ) : <BreadcrumbPage>{activeSubjectData.name}</BreadcrumbPage>}
                  </BreadcrumbItem>
                  {activeChapterData && <><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>{activeChapterData.name}</BreadcrumbPage></BreadcrumbItem></>}
                </BreadcrumbList>
              </Breadcrumb>

              <div className="mb-8">
                <h2 className="text-3xl font-bold text-foreground">{activeChapterData?.name || activeSubjectData.name}</h2>
                <p className="mt-1 text-muted-foreground">
                  {activeChapterData && `${activeSubjectData.name} • `}
                  {activeChapter
                    ? `${activeTopics.length} ${activeTopics.length === 1 ? "topic" : "topics"}`
                    : `${chapters.filter((chapter) => chapter.subject_id === activeSubject).length} ${chapters.filter((chapter) => chapter.subject_id === activeSubject).length === 1 ? "chapter" : "chapters"}`}
                </p>
              </div>

              {activeChapter ? (
                activeTopics.length === 0 ? <EmptyState text="No topics in this chapter yet." /> : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {activeTopics.map((topic) => (
                      <TopicCard key={topic.id} topic={topic} onClick={() => handleTopicSelect(topic.id)} readOnly />
                    ))}
                  </div>
                )
              ) : (
                <Tabs defaultValue="chapters" className="w-full">
                  <TabsList>
                    <TabsTrigger value="chapters">Chapters</TabsTrigger>
                    <TabsTrigger value="presentations">Presentations</TabsTrigger>
                  </TabsList>
                  <TabsContent value="chapters" className="mt-6">
                    {chapters.filter((chapter) => chapter.subject_id === activeSubject).length === 0 ? <EmptyState text="No chapters in this subject yet." /> : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {chapters.filter((chapter) => chapter.subject_id === activeSubject).sort((a, b) => a.chapter_order - b.chapter_order).map((chapter) => (
                          <ChapterCard key={chapter.id} chapter={chapter} onClick={() => handleChapterSelect(chapter.id)} readOnly />
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="presentations" className="mt-6">
                    {presentations.filter((presentation) => presentation.subject_id === activeSubject).length === 0 ? <EmptyState text="No presentations in this subject yet." /> : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {presentations.filter((presentation) => presentation.subject_id === activeSubject).map((presentation) => (
                          <Card key={presentation.id} className="cursor-pointer border-2 border-border bg-gradient-to-br from-card to-card/50 transition-all hover:scale-[1.02] hover:border-primary/30 hover:shadow-xl" onClick={() => navigate(`/library/${activeSubjectData.slug}/presentations/${presentation.slug}`)}>
                            <CardContent className="p-6">
                              <div className="flex items-start gap-4">
                                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 shadow-sm">
                                  <PresentationIcon className="h-7 w-7 text-primary" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h3 className="line-clamp-2 text-lg font-bold text-foreground">{presentation.title}</h3>
                                  <p className="mt-2 text-xs text-muted-foreground">{presentation.page_count ? `${presentation.page_count} pages` : "PDF deck"}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </div>
          ) : (
            <div className="p-8">
              {activeYear !== null && (
                <Breadcrumb className="mb-6">
                  <BreadcrumbList>
                    <BreadcrumbItem><BreadcrumbLink className="cursor-pointer hover:text-primary" onClick={() => setActiveYear(null)}>All Subjects</BreadcrumbLink></BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem><BreadcrumbPage>1st Year</BreadcrumbPage></BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              )}
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-foreground">{activeYear === null ? "All Subjects" : "1st Year"}</h2>
                <p className="mt-1 text-muted-foreground">
                  {activeYear === null ? `${subjects.length} ${subjects.length === 1 ? "subject" : "subjects"}` : `${subjects.length} ${subjects.length === 1 ? "subject" : "subjects"}`}
                </p>
              </div>
              {subjects.length === 0 ? <EmptyState text="No subjects available yet." /> : activeYear === null ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <YearCard year={1} subjectCount={subjects.length} onClick={() => setActiveYear(1)} />
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {subjects.map((subject) => (
                    <SubjectCard
                      key={subject.id}
                      subject={subject}
                      chapterCount={chapters.filter((chapter) => chapter.subject_id === subject.id).length}
                      onClick={() => handleSubjectSelect(subject.id)}
                      onDelete={() => undefined}
                      onEdit={() => undefined}
                      readOnly
                    />
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

const EmptyState = ({ text }: { text: string }) => (
  <div className="py-16 text-center"><p className="text-muted-foreground">{text}</p></div>
);

export default PublicLibrary;
