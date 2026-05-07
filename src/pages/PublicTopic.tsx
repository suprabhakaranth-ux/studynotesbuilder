import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SEOHead } from "@/components/SEOHead";
import { PublicTopicViewer } from "@/components/PublicTopicViewer";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ArrowLeft, GraduationCap, LogIn } from "lucide-react";

interface Topic {
  id: string;
  title: string;
  subject_id: string | null;
  chapter_id: string | null;
  slug: string;
}

interface Subject { id: string; name: string; slug: string }
interface Chapter { id: string; name: string; slug: string }

const PUBLIC_OWNER_ID = "b6dc6569-25ba-4ea0-a7bf-607219aa8daf";
const NO_CHAPTER = "_";

const PublicTopic = () => {
  const { subjectSlug, chapterSlug, topicSlug } = useParams<{
    subjectSlug: string; chapterSlug: string; topicSlug: string;
  }>();
  const navigate = useNavigate();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [summary, setSummary] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [topicMeta, setTopicMeta] = useState<{ created_at?: string; updated_at?: string }>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!subjectSlug || !topicSlug) return;
      setLoading(true);
      setNotFound(false);

      const { data: subj } = await supabase
        .from("subjects").select("*")
        .eq("user_id", PUBLIC_OWNER_ID).eq("slug", subjectSlug).maybeSingle();

      if (!subj) { setNotFound(true); setLoading(false); return; }
      setSubject(subj as any);

      let chap: any = null;
      if (chapterSlug && chapterSlug !== NO_CHAPTER) {
        const { data } = await supabase
          .from("chapters").select("*")
          .eq("user_id", PUBLIC_OWNER_ID).eq("subject_id", subj.id).eq("slug", chapterSlug).maybeSingle();
        chap = data;
        if (chap) setChapter(chap as any);
      }

      let q = supabase
        .from("topics").select("*")
        .eq("user_id", PUBLIC_OWNER_ID).eq("subject_id", subj.id).eq("slug", topicSlug);
      q = chap ? q.eq("chapter_id", chap.id) : q.is("chapter_id", null);
      const { data: topicData } = await q.maybeSingle();

      if (!topicData) { setNotFound(true); setLoading(false); return; }
      setTopic(topicData as any);
      setTopicMeta({ created_at: (topicData as any).created_at, updated_at: (topicData as any).updated_at });

      const { data: summaryData } = await supabase
        .from("summaries").select("content").eq("topic_id", topicData.id).maybeSingle();
      const { data: blocksData } = await supabase
        .from("blocks").select("content").eq("topic_id", topicData.id);

      const summaryText = (summaryData?.content || "").replace(/<[^>]*>/g, '').trim();
      const blocksText = (blocksData || []).map(b => (b.content || "").replace(/<[^>]*>/g, ' ')).join(' ');
      const combined = `${summaryText} ${blocksText}`.replace(/\s+/g, ' ').trim();
      const words = combined ? combined.split(/\s+/).length : 0;
      setWordCount(words);

      const descSource = summaryText || blocksText.trim() || topicData.title;
      setSummary(descSource.substring(0, 155) + (descSource.length > 155 ? '...' : ''));
      setLoading(false);
    };
    loadData();
  }, [subjectSlug, chapterSlug, topicSlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-lg">Loading...</div>
      </div>
    );
  }

  if (notFound || !topic) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Topic Not Found</h1>
        <p className="text-muted-foreground">This topic doesn't exist or is not publicly available.</p>
        <Button onClick={() => navigate("/library")}>Back to Library</Button>
      </div>
    );
  }

  const canonical = typeof window !== "undefined"
    ? `${window.location.origin}${window.location.pathname}`
    : undefined;

  return (
    <>
      <SEOHead
        title={topic.title}
        description={summary || `Study notes for ${topic.title}. Learn more about ${subject?.name || 'this topic'}.`}
        type="article"
        canonicalUrl={canonical}
      />
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/library")}>
              <GraduationCap className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold hidden sm:inline">Study Notes Library</span>
            </div>
            <Button variant="outline" onClick={() => navigate("/auth")} className="gap-2">
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Sign In</span>
            </Button>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6">
          <div className="mb-6 flex items-center gap-4 flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink onClick={() => navigate("/library")} className="cursor-pointer hover:text-primary">Library</BreadcrumbLink>
                </BreadcrumbItem>
                {subject && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink onClick={() => navigate(`/library/${subject.slug}`)} className="cursor-pointer hover:text-primary">{subject.name}</BreadcrumbLink>
                    </BreadcrumbItem>
                  </>
                )}
                {chapter && subject && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink onClick={() => navigate(`/library/${subject.slug}/${chapter.slug}`)} className="cursor-pointer hover:text-primary">{chapter.name}</BreadcrumbLink>
                    </BreadcrumbItem>
                  </>
                )}
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{topic.title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <h1 className="text-3xl font-bold mb-8">{topic.title}</h1>
          <PublicTopicViewer topicId={topic.id} />
        </main>

        <footer className="border-t bg-card/50 mt-12">
          <div className="container mx-auto px-4 py-8 text-center">
            <h2 className="text-lg font-semibold mb-2">Want to create your own study notes?</h2>
            <p className="text-muted-foreground mb-4">Sign up for free and start organizing your learning materials.</p>
            <Button onClick={() => navigate("/auth")}>Get Started Free</Button>
          </div>
        </footer>
      </div>
    </>
  );
};

export default PublicTopic;
