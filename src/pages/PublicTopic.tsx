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
}

interface Subject {
  id: string;
  name: string;
}

interface Chapter {
  id: string;
  name: string;
}

const PublicTopic = () => {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!topicId) return;
      setLoading(true);

      // Load topic
      const { data: topicData } = await supabase
        .from("topics")
        .select("*")
        .eq("id", topicId)
        .maybeSingle();

      if (topicData) {
        setTopic({
          id: topicData.id,
          title: topicData.title,
          subject_id: topicData.subject_id,
          chapter_id: topicData.chapter_id,
        });

        // Load subject
        if (topicData.subject_id) {
          const { data: subjectData } = await supabase
            .from("subjects")
            .select("*")
            .eq("id", topicData.subject_id)
            .maybeSingle();
          if (subjectData) setSubject(subjectData);
        }

        // Load chapter
        if (topicData.chapter_id) {
          const { data: chapterData } = await supabase
            .from("chapters")
            .select("*")
            .eq("id", topicData.chapter_id)
            .maybeSingle();
          if (chapterData) setChapter(chapterData);
        }

        // Load summary for SEO description
        const { data: summaryData } = await supabase
          .from("summaries")
          .select("content")
          .eq("topic_id", topicId)
          .maybeSingle();
        if (summaryData?.content) {
          // Strip HTML and truncate for meta description
          const text = summaryData.content.replace(/<[^>]*>/g, '').trim();
          setSummary(text.substring(0, 155) + (text.length > 155 ? '...' : ''));
        }
      }

      setLoading(false);
    };

    loadData();
  }, [topicId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-lg">Loading...</div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Topic Not Found</h1>
        <p className="text-muted-foreground">This topic doesn't exist or is not publicly available.</p>
        <Button onClick={() => navigate("/library")}>
          Back to Library
        </Button>
      </div>
    );
  }

  return (
    <>
      <SEOHead 
        title={topic.title}
        description={summary || `Study notes for ${topic.title}. Learn more about ${subject?.name || 'this topic'}.`}
        type="article"
      />
      
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold hidden sm:inline">Study Notes Library</span>
            </div>
            <Button variant="outline" onClick={() => navigate("/auth")} className="gap-2">
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Sign In</span>
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-6">
          {/* Navigation */}
          <div className="mb-6 flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/library")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink 
                    onClick={() => navigate("/library")} 
                    className="cursor-pointer hover:text-primary"
                  >
                    Library
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {subject && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink className="cursor-default">
                        {subject.name}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  </>
                )}
                {chapter && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink className="cursor-default">
                        {chapter.name}
                      </BreadcrumbLink>
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

          {/* Topic Title */}
          <h1 className="text-3xl font-bold mb-8">{topic.title}</h1>

          {/* Topic Content */}
          <PublicTopicViewer topicId={topic.id} />
        </main>

        {/* Footer CTA */}
        <footer className="border-t bg-card/50 mt-12">
          <div className="container mx-auto px-4 py-8 text-center">
            <h2 className="text-lg font-semibold mb-2">Want to create your own study notes?</h2>
            <p className="text-muted-foreground mb-4">
              Sign up for free and start organizing your learning materials.
            </p>
            <Button onClick={() => navigate("/auth")}>
              Get Started Free
            </Button>
          </div>
        </footer>
      </div>
    </>
  );
};

export default PublicTopic;
