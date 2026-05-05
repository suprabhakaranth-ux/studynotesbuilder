import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AIChat from "./pages/AIChat";
import Showcase from "./pages/Showcase";
import PublicLibrary from "./pages/PublicLibrary";
import PublicTopic from "./pages/PublicTopic";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Legacy /library/topic/:topicId → /library/:subjectSlug/:chapterSlug/:topicSlug
const LegacyTopicRedirect = () => {
  const { topicId } = useParams<{ topicId: string }>();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!topicId) return;
      const { data: topic } = await supabase
        .from("topics")
        .select("slug, subject_id, chapter_id")
        .eq("id", topicId)
        .maybeSingle();
      if (!topic || cancelled) {
        setTarget("/library");
        return;
      }
      const [subjRes, chapRes] = await Promise.all([
        topic.subject_id
          ? supabase.from("subjects").select("slug").eq("id", topic.subject_id).maybeSingle()
          : Promise.resolve({ data: null } as any),
        topic.chapter_id
          ? supabase.from("chapters").select("slug").eq("id", topic.chapter_id).maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);
      if (cancelled) return;
      const subjSlug = (subjRes as any).data?.slug;
      const chapSlug = (chapRes as any).data?.slug || "_";
      if (subjSlug && topic.slug) {
        setTarget(`/library/${subjSlug}/${chapSlug}/${topic.slug}`);
      } else {
        setTarget("/library");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [topicId]);

  if (!target) return null;
  return <Navigate to={target} replace />;
};

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/app" element={<Index />} />
            <Route path="/app/t/:topicSlug" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/ai-chat" element={<AIChat />} />
            <Route path="/showcase" element={<Showcase />} />
            <Route path="/library" element={<PublicLibrary />} />
            <Route path="/library/topic/:topicId" element={<LegacyTopicRedirect />} />
            <Route path="/library/:subjectSlug" element={<PublicLibrary />} />
            <Route path="/library/:subjectSlug/:chapterSlug" element={<PublicLibrary />} />
            <Route path="/library/:subjectSlug/:chapterSlug/:topicSlug" element={<PublicTopic />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
