import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
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

type TriState = "all" | "some" | "none";

function Selector({
  state,
  onClick,
  size = "md",
}: {
  state: TriState;
  onClick: (e: React.MouseEvent) => void;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-[18px] w-[18px]" : "h-5 w-5";
  const icon = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
  const filled = state !== "none";
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={state === "all" ? "true" : state === "some" ? "mixed" : "false"}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      className={cn(
        "shrink-0 rounded-[4px] border-2 flex items-center justify-center transition-colors",
        dim,
        filled
          ? "bg-primary border-primary text-primary-foreground"
          : "bg-background border-foreground/40 hover:border-foreground/70",
      )}
    >
      {state === "all" && <Check className={icon} strokeWidth={3} />}
      {state === "some" && <Minus className={icon} strokeWidth={3} />}
    </button>
  );
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

  const setMany = (ids: string[], on: boolean) => {
    const next = new Set(selectedTopicIds);
    ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
    onChange(next);
  };

  const toggleTopic = (id: string) => setMany([id], !selectedTopicIds.has(id));

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

  const tri = (ids: string[]): TriState => {
    if (ids.length === 0) return "none";
    const on = ids.filter((i) => selectedTopicIds.has(i)).length;
    if (on === 0) return "none";
    if (on === ids.length) return "all";
    return "some";
  };

  const toggleExpand = (
    set: Set<string>,
    setSet: (s: Set<string>) => void,
    id: string,
  ) => {
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

  const rowTint = (s: TriState) =>
    s === "all"
      ? "bg-primary/10"
      : s === "some"
      ? "bg-primary/5"
      : "";

  return (
    <div className="space-y-1.5">
      {subjects.map((s) => {
        const subjChaps = chaptersBySubject.get(s.id) || [];
        const looseTopics = topicsForSubjectNoChapter(s.id);
        const allIds = allTopicsForSubject(s.id).map((t) => t.id);
        const state = tri(allIds);
        const isOpen = expandedSubjects.has(s.id);
        const onCount = allIds.filter((i) => selectedTopicIds.has(i)).length;

        return (
          <div key={s.id} className="border border-border rounded-md bg-card overflow-hidden">
            <div
              onClick={() => toggleSubject(s)}
              className={cn(
                "flex items-center gap-2 p-2.5 cursor-pointer hover:bg-accent/40 transition-colors",
                rowTint(state),
              )}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(expandedSubjects, setExpandedSubjects, s.id);
                }}
                className="p-0.5 hover:bg-accent rounded"
                aria-label="Toggle"
              >
                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              <Selector state={state} onClick={() => toggleSubject(s)} />
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: s.color }}
              />
              <span className="font-medium">{s.name}</span>
              <span className="text-xs text-muted-foreground ml-auto tabular-nums">
                {onCount} / {allIds.length}
              </span>
            </div>

            {isOpen && (
              <div className="pl-8 pb-2 pr-2 space-y-1">
                {subjChaps.map((c) => {
                  const cIds = topicsForChapter(c.id).map((t) => t.id);
                  const cState = tri(cIds);
                  const cTopics = topicsForChapter(c.id);
                  const cOpen = expandedChapters.has(c.id);
                  const cOn = cIds.filter((i) => selectedTopicIds.has(i)).length;
                  return (
                    <div key={c.id} className="rounded">
                      <div
                        onClick={() => toggleChapter(c)}
                        className={cn(
                          "flex items-center gap-2 py-1.5 px-1 cursor-pointer hover:bg-accent/40 rounded transition-colors",
                          rowTint(cState),
                        )}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(expandedChapters, setExpandedChapters, c.id);
                          }}
                          className="p-0.5 hover:bg-accent rounded"
                        >
                          {cOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                        <Selector state={cState} onClick={() => toggleChapter(c)} size="sm" />
                        <span className="text-sm">{c.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto tabular-nums">
                          {cOn} / {cIds.length}
                        </span>
                      </div>
                      {cOpen && (
                        <div className="pl-8 space-y-0.5 mt-0.5">
                          {cTopics.map((t) => {
                            const on = selectedTopicIds.has(t.id);
                            return (
                              <div
                                key={t.id}
                                onClick={() => toggleTopic(t.id)}
                                className={cn(
                                  "flex items-center gap-2 py-1 text-sm cursor-pointer hover:bg-accent/40 rounded px-1.5 transition-colors",
                                  on && "bg-primary/10",
                                )}
                              >
                                <Selector
                                  state={on ? "all" : "none"}
                                  onClick={() => toggleTopic(t.id)}
                                  size="sm"
                                />
                                <span className="truncate">{t.title}</span>
                              </div>
                            );
                          })}
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
                      {looseTopics.map((t) => {
                        const on = selectedTopicIds.has(t.id);
                        return (
                          <div
                            key={t.id}
                            onClick={() => toggleTopic(t.id)}
                            className={cn(
                              "flex items-center gap-2 py-1 text-sm cursor-pointer hover:bg-accent/40 rounded px-1.5 transition-colors",
                              on && "bg-primary/10",
                            )}
                          >
                            <Selector
                              state={on ? "all" : "none"}
                              onClick={() => toggleTopic(t.id)}
                              size="sm"
                            />
                            <span className="truncate">{t.title}</span>
                          </div>
                        );
                      })}
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
