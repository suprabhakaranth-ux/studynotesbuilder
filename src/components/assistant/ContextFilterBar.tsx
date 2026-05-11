import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ContextFilter } from "@/lib/ai/types";

interface Subject { id: string; name: string; color: string }
interface Chapter { id: string; name: string; subject_id: string }
interface Topic { id: string; title: string; subject_id: string; chapter_id: string | null }

interface Props {
  filter: ContextFilter;
  onChange: (filter: ContextFilter) => void;
}

export const ContextFilterBar = ({ filter, onChange }: Props) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  useEffect(() => {
    supabase.from("subjects").select("id,name,color").order("name").then(({ data }) => {
      setSubjects(data || []);
    });
  }, []);

  const subjectId = filter.type !== "all" ? filter.subjectId : undefined;
  const chapterId = filter.type === "chapter" || filter.type === "topic" ? (filter as any).chapterId : undefined;

  useEffect(() => {
    if (!subjectId) { setChapters([]); return; }
    supabase
      .from("chapters")
      .select("id,name,subject_id")
      .eq("subject_id", subjectId)
      .order("chapter_order")
      .then(({ data }) => setChapters(data || []));
  }, [subjectId]);

  useEffect(() => {
    if (!chapterId) { setTopics([]); return; }
    supabase
      .from("topics")
      .select("id,title,subject_id,chapter_id")
      .eq("chapter_id", chapterId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setTopics(data || []));
  }, [chapterId]);

  const setType = (type: ContextFilter["type"]) => {
    if (type === "all") return onChange({ type: "all" });
    if (type === "subject") return onChange({ type: "subject", subjectId: subjectId || "" } as any);
    if (type === "chapter") return onChange({ type: "chapter", subjectId: subjectId || "", chapterId: chapterId || "" } as any);
    if (type === "topic") return onChange({ type: "topic", subjectId: subjectId || "", chapterId: chapterId || "", topicId: "" } as any);
  };

  const label = () => {
    if (filter.type === "all") return null;
    if (filter.type === "topic") return topics.find((t) => t.id === filter.topicId)?.title;
    if (filter.type === "chapter") return chapters.find((c) => c.id === filter.chapterId)?.name;
    if (filter.type === "subject") return subjects.find((s) => s.id === filter.subjectId)?.name;
  };

  const isReady = (() => {
    if (filter.type === "all") return true;
    if (filter.type === "subject") return !!filter.subjectId;
    if (filter.type === "chapter") return !!filter.chapterId;
    if (filter.type === "topic") return !!filter.topicId;
    return false;
  })();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground mr-1">Context:</span>
        {(["all", "subject", "chapter", "topic"] as const).map((t) => (
          <Button
            key={t}
            size="sm"
            variant={filter.type === t ? "default" : "outline"}
            onClick={() => setType(t)}
            className="capitalize"
          >
            {t === "all" ? "All notes" : t}
          </Button>
        ))}
        {label() && isReady && (
          <Badge variant="secondary" className="gap-2">
            {label()}
            <X className="w-3 h-3 cursor-pointer" onClick={() => onChange({ type: "all" })} />
          </Badge>
        )}
      </div>

      {filter.type !== "all" && (
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={subjectId || ""}
            onValueChange={(v) => onChange({ type: "subject", subjectId: v })}
          >
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Choose subject…" /></SelectTrigger>
            <SelectContent>
              {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>

          {(filter.type === "chapter" || filter.type === "topic") && subjectId && (
            <Select
              value={chapterId || ""}
              onValueChange={(v) => {
                const ch = chapters.find((c) => c.id === v);
                if (!ch) return;
                onChange({ type: "chapter", subjectId: ch.subject_id, chapterId: v });
              }}
            >
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Choose chapter…" /></SelectTrigger>
              <SelectContent>
                {chapters.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          {filter.type === "topic" && chapterId && (
            <Select
              value={(filter as any).topicId || ""}
              onValueChange={(v) => {
                const t = topics.find((x) => x.id === v);
                if (!t) return;
                onChange({ type: "topic", subjectId: t.subject_id, chapterId: t.chapter_id || undefined, topicId: v });
              }}
            >
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="Choose topic…" /></SelectTrigger>
              <SelectContent>
                {topics.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  );
};
