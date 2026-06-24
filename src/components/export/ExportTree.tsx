import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type {
  ExportSubject,
  ExportChapter,
  ExportTopic,
} from "@/lib/export/types";

interface Props {
  subjects: ExportSubject[];
  chapters: ExportChapter[];
  topics: ExportTopic[];
  selectedTopicIds: Set<string>;
  onChange: (next: Set<string>) => void;
}

export function ExportTree({
  subjects,
  chapters,
  topics,
  selectedTopicIds,
  onChange,
}: Props) {
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(
    () => new Set(subjects.map((s) => s.id))
  );
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  const chaptersBySubject = useMemo(() => {
    const m = new Map<string, ExportChapter[]>();
    chapters.forEach((c) => {
      const arr = m.get(c.subject_id) || [];
      arr.push(c);
      m.set(c.subject_id, arr);
    });
    return m;
  }, [chapters]);

  const topicsByChapter = useMemo(() => {
    const m = new Map<string, ExportTopic[]>();
    topics.forEach((t) => {
      const key = t.chapter_id || `__nochap_${t.subject_id || "none"}`;
      const arr = m.get(key) || [];
      arr.push(t);
      m.set(key, arr);
    });
    return m;
  }, [topics]);

  const topicsForSubjectNoChapter = (subjectId: string) =>
    topicsByChapter.get(`__nochap_${subjectId}`) || [];

  const topicsForChapter = (chapterId: string) =>
    topicsByChapter.get(chapterId) || [];

  const allTopicsForSubject = (subjectId: string): ExportTopic[] => {
    const chaps = chaptersBySubject.get(subjectId) || [];
    const fromChaps = chaps.flatMap((c) => topicsForChapter(c.id));
    return [...fromChaps, ...topicsForSubjectNoChapter(subjectId)];
  };

  const toggleTopic = (id: string) => {
    const next = new Set(selectedTopicIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    onChange(next);
  };

  const setMany = (ids: string[], on: boolean) => {
    const next = new Set(selectedTopicIds);
    ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
    onChange(next);
  };

  const toggleSubject = (s: ExportSubject) => {
    const ids = allTopicsForSubject(s.id).map((t) => t.id);
    const allOn = ids.length > 0 && ids.every((i) => selectedTopicIds.has(i));
    setMany(ids, !allOn);
  };

  const toggleChapter = (c: ExportChapter) => {
    const ids = topicsForChapter(c.id).map((t) => t.id);
    const allOn = ids.length > 0 && ids.every((i) => selectedTopicIds.has(i));
    setMany(ids, !allOn);
  };

  const subjectState = (s: ExportSubject): "all" | "some" | "none" => {
    const ids = allTopicsForSubject(s.id).map((t) => t.id);
    if (ids.length === 0) return "none";
    const on = ids.filter((i) => selectedTopicIds.has(i)).length;
    if (on === 0) return "none";
    if (on === ids.length) return "all";
    return "some";
  };

  const chapterState = (c: ExportChapter): "all" | "some" | "none" => {
    const ids = topicsForChapter(c.id).map((t) => t.id);
    if (ids.length === 0) return "none";
    const on = ids.filter((i) => selectedTopicIds.has(i)).length;
    if (on === 0) return "none";
    if (on === ids.length) return "all";
    return "some";
  };

  const toggleExpand = (set: Set<string>, setSet: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSet(next);
  };

  if (subjects.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-4">
        No subjects to export yet.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {subjects.map((s) => {
        const state = subjectState(s);
        const subjChaps = chaptersBySubject.get(s.id) || [];
        const looseTopics = topicsForSubjectNoChapter(s.id);
        const isOpen = expandedSubjects.has(s.id);
        return (
          <div key={s.id} className="border border-border rounded-md bg-card">
            <div className="flex items-center gap-2 p-2">
              <button
                onClick={() => toggleExpand(expandedSubjects, setExpandedSubjects, s.id)}
                className="p-0.5 hover:bg-accent rounded"
                aria-label="Toggle"
              >
                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              <Checkbox
                checked={state === "all" ? true : state === "some" ? "indeterminate" : false}
                onCheckedChange={() => toggleSubject(s)}
              />
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="font-medium">{s.name}</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {allTopicsForSubject(s.id).filter((t) => selectedTopicIds.has(t.id)).length}
                {" / "}
                {allTopicsForSubject(s.id).length}
              </span>
            </div>
            {isOpen && (
              <div className="pl-8 pb-2 space-y-1">
                {subjChaps.map((c) => {
                  const cState = chapterState(c);
                  const cTopics = topicsForChapter(c.id);
                  const cOpen = expandedChapters.has(c.id);
                  return (
                    <div key={c.id}>
                      <div className="flex items-center gap-2 py-1">
                        <button
                          onClick={() => toggleExpand(expandedChapters, setExpandedChapters, c.id)}
                          className="p-0.5 hover:bg-accent rounded"
                        >
                          {cOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                        <Checkbox
                          checked={cState === "all" ? true : cState === "some" ? "indeterminate" : false}
                          onCheckedChange={() => toggleChapter(c)}
                        />
                        <span className="text-sm">{c.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {cTopics.filter((t) => selectedTopicIds.has(t.id)).length}
                          {" / "}
                          {cTopics.length}
                        </span>
                      </div>
                      {cOpen && (
                        <div className="pl-8 space-y-0.5">
                          {cTopics.map((t) => (
                            <label
                              key={t.id}
                              className="flex items-center gap-2 py-0.5 text-sm cursor-pointer hover:bg-accent/40 rounded px-1"
                            >
                              <Checkbox
                                checked={selectedTopicIds.has(t.id)}
                                onCheckedChange={() => toggleTopic(t.id)}
                              />
                              <span className="truncate">{t.title}</span>
                            </label>
                          ))}
                          {cTopics.length === 0 && (
                            <div className="text-xs text-muted-foreground px-1 py-1">
                              No topics in this chapter.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {looseTopics.length > 0 && (
                  <div className="pt-1">
                    <div className="text-xs font-medium text-muted-foreground px-1 py-1">
                      Unfiled topics
                    </div>
                    <div className="pl-4 space-y-0.5">
                      {looseTopics.map((t) => (
                        <label
                          key={t.id}
                          className="flex items-center gap-2 py-0.5 text-sm cursor-pointer hover:bg-accent/40 rounded px-1"
                        >
                          <Checkbox
                            checked={selectedTopicIds.has(t.id)}
                            onCheckedChange={() => toggleTopic(t.id)}
                          />
                          <span className="truncate">{t.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
