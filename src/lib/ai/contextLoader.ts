import { supabase } from "@/integrations/supabase/client";
import type { ContextFilter } from "./types";

interface LoadedContext {
  scopeLabel: string;
  text: string;
}

const stripHtml = (html: string) =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const loadContext = async (filter: ContextFilter): Promise<LoadedContext> => {
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) {
    return { scopeLabel: "no user", text: "" };
  }

  let subjects: any[] = [];
  let chapters: any[] = [];
  let topics: any[] = [];
  let blocks: any[] = [];

  if (filter.type === "topic") {
    const [tRes, bRes] = await Promise.all([
      supabase.from("topics").select("*").eq("id", filter.topicId).eq("user_id", userId),
      supabase.from("blocks").select("*").eq("topic_id", filter.topicId).eq("user_id", userId).order("block_order"),
    ]);
    topics = tRes.data || [];
    blocks = bRes.data || [];
  } else if (filter.type === "chapter") {
    const [cRes, tRes] = await Promise.all([
      supabase.from("chapters").select("*").eq("id", filter.chapterId).eq("user_id", userId),
      supabase.from("topics").select("*").eq("chapter_id", filter.chapterId).eq("user_id", userId),
    ]);
    chapters = cRes.data || [];
    topics = tRes.data || [];
    if (topics.length) {
      const ids = topics.map((t) => t.id);
      const { data } = await supabase
        .from("blocks")
        .select("*")
        .in("topic_id", ids)
        .eq("user_id", userId)
        .order("block_order");
      blocks = data || [];
    }
  } else if (filter.type === "subject") {
    const [sRes, cRes, tRes] = await Promise.all([
      supabase.from("subjects").select("*").eq("id", filter.subjectId).eq("user_id", userId),
      supabase.from("chapters").select("*").eq("subject_id", filter.subjectId).eq("user_id", userId),
      supabase.from("topics").select("*").eq("subject_id", filter.subjectId).eq("user_id", userId),
    ]);
    subjects = sRes.data || [];
    chapters = cRes.data || [];
    topics = tRes.data || [];
    if (topics.length) {
      const ids = topics.map((t) => t.id);
      const { data } = await supabase
        .from("blocks")
        .select("*")
        .in("topic_id", ids)
        .eq("user_id", userId)
        .order("block_order");
      blocks = data || [];
    }
  } else {
    const [sRes, cRes, tRes, bRes] = await Promise.all([
      supabase.from("subjects").select("*").eq("user_id", userId),
      supabase.from("chapters").select("*").eq("user_id", userId),
      supabase
        .from("topics")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("blocks")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    subjects = sRes.data || [];
    chapters = cRes.data || [];
    topics = tRes.data || [];
    blocks = bRes.data || [];
  }

  let text = "# Student's Study Materials (MA Psychology, IGNOU)\n\n";
  let scopeLabel = "all recent notes";

  if (filter.type === "topic") {
    const t = topics[0];
    scopeLabel = `topic: ${t?.title ?? "Unknown"}`;
    text += `## Focus: Single Topic\nTopic: ${t?.title ?? "Unknown"}\n\n`;
  } else if (filter.type === "chapter") {
    const c = chapters[0];
    scopeLabel = `chapter: ${c?.name ?? "Unknown"}`;
    text += `## Focus: Chapter\nChapter: ${c?.name ?? "Unknown"}\nTopics: ${topics.length}\n\n`;
  } else if (filter.type === "subject") {
    const s = subjects[0];
    scopeLabel = `subject: ${s?.name ?? "Unknown"}`;
    text += `## Focus: Subject\nSubject: ${s?.name ?? "Unknown"}\nChapters: ${chapters.length}\nTopics: ${topics.length}\n\n`;
  } else {
    text += `Subjects: ${subjects.map((s) => s.name).join(", ") || "(none)"}\n`;
    text += `Chapters: ${chapters.length} | Topics: ${topics.length}\n\n`;
  }

  text += "## Content\n\n";
  const topicsToShow = filter.type === "all" ? topics.slice(0, 20) : topics;
  topicsToShow.forEach((topic) => {
    const chapter = chapters.find((c) => c.id === topic.chapter_id);
    const subject = subjects.find((s) => s.id === topic.subject_id);
    text += `### ${topic.title}\n`;
    if (chapter || subject) {
      text += `_(${subject?.name ?? ""}${subject && chapter ? " — " : ""}${chapter?.name ?? ""})_\n`;
    }
    const topicBlocks = blocks.filter((b) => b.topic_id === topic.id);
    const blocksToShow = filter.type === "topic" ? topicBlocks : topicBlocks.slice(0, 3);
    const maxLen = filter.type === "topic" ? 2000 : 500;
    blocksToShow.forEach((block) => {
      if (!block.content) return;
      const plain = stripHtml(String(block.content));
      if (!plain) return;
      text += `${plain.length > maxLen ? plain.slice(0, maxLen) + "…" : plain}\n\n`;
    });
  });

  return { scopeLabel, text };
};
