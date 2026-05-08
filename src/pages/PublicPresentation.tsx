import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SEOHead } from "@/components/SEOHead";
import { PresentationViewer } from "@/components/PresentationViewer";
import {
  Presentation,
  getPresentationPublicUrl,
  updatePageCount,
} from "@/hooks/usePresentations";
import { Button } from "@/components/ui/button";

const PUBLIC_OWNER_ID = "b6dc6569-25ba-4ea0-a7bf-607219aa8daf";

const PublicPresentation = () => {
  const { subjectSlug, presentationSlug } = useParams<{ subjectSlug: string; presentationSlug: string }>();
  const navigate = useNavigate();
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [subjectName, setSubjectName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: subject } = await supabase
        .from("subjects")
        .select("id, name")
        .eq("user_id", PUBLIC_OWNER_ID)
        .eq("slug", subjectSlug!)
        .maybeSingle();
      if (!subject) {
        if (!cancelled) { setNotFound(true); setLoading(false); }
        return;
      }
      setSubjectName(subject.name);
      const { data: p } = await supabase
        .from("presentations")
        .select("*")
        .eq("user_id", PUBLIC_OWNER_ID)
        .eq("subject_id", subject.id)
        .eq("slug", presentationSlug!)
        .maybeSingle();
      if (cancelled) return;
      if (!p) { setNotFound(true); setLoading(false); return; }
      setPresentation(p as Presentation);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [subjectSlug, presentationSlug]);

  const fileUrl = presentation ? getPresentationPublicUrl(presentation.file_path) : null;
  const canonical = typeof window !== "undefined" ? window.location.href : undefined;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading presentation…</div>;
  }
  if (notFound || !presentation || !fileUrl) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Presentation not found.</p>
        <Button onClick={() => navigate("/library")}>Back to library</Button>
      </div>
    );
  }

  const description = `${presentation.title} — PDF presentation${presentation.page_count ? ` (${presentation.page_count} pages)` : ""} from ${subjectName}.`;

  return (
    <>
      <SEOHead
        title={presentation.title}
        description={description}
        type="article"
        canonicalUrl={canonical}
        section={subjectName}
        publishedTime={presentation.created_at}
        modifiedTime={presentation.updated_at}
      />
      <div className="min-h-screen bg-muted/30 flex flex-col">
        <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b">
          <div className="max-w-[1200px] mx-auto px-4 h-14 flex items-center justify-between gap-4">
            <Link to={`/library/${subjectSlug}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              <span className="truncate">{subjectName}</span>
            </Link>
            <h1 className="font-semibold text-sm md:text-base truncate flex-1 text-center">
              {presentation.title}
            </h1>
            <Button asChild variant="ghost" size="sm">
              <a href={fileUrl} download target="_blank" rel="noreferrer">
                <Download className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Download</span>
              </a>
            </Button>
          </div>
        </header>

        <main className="flex-1 w-full">
          <div className="max-w-[1200px] mx-auto px-4">
            <PresentationViewer
              fileUrl={fileUrl}
              onLoadSuccess={(n) => {
                if (presentation && presentation.page_count !== n) {
                  // Best-effort; will silently fail for anon (RLS) — only owners can update
                  updatePageCount(presentation.id, n).catch(() => {});
                }
              }}
            />
          </div>
        </main>
      </div>
    </>
  );
};

export default PublicPresentation;
