// Per-tab navigation only: never store note content or pending edits here.
export interface StudyPosition {
  year: number | null;
  subjectId: string | null;
  chapterId: string | null;
  topicId: string | null;
}

export const studyPositionKey = (userId: string) => `study-position:v1:${userId}`;

export function readStudyPosition(storage: Pick<Storage, "getItem">, userId: string): StudyPosition | null {
  try {
    const value = JSON.parse(storage.getItem(studyPositionKey(userId)) || "null");
    if (!value || typeof value !== "object") return null;
    return {
      year: value.year === 1 || value.year === 2 ? value.year : null,
      subjectId: typeof value.subjectId === "string" ? value.subjectId : null,
      chapterId: typeof value.chapterId === "string" ? value.chapterId : null,
      topicId: typeof value.topicId === "string" ? value.topicId : null,
    };
  } catch {
    return null;
  }
}

export function resolveStudyPosition(
  saved: StudyPosition | null,
  subjects: { id: string; year?: number | null }[],
  chapters: { id: string; subject_id: string }[],
  topics: { id: string; subjectId: string; chapterId?: string | null; slug?: string }[],
  routeSlug?: string,
): StudyPosition {
  // A direct link takes precedence; a removed topic falls back to its saved parent.
  const topic = routeSlug ? topics.find(t => t.slug === routeSlug) : topics.find(t => t.id === saved?.topicId);
  const subject = subjects.find(s => s.id === (topic?.subjectId ?? saved?.subjectId));
  const chapter = chapters.find(c => c.id === (topic ? topic.chapterId : saved?.chapterId) && c.subject_id === subject?.id);
  return {
    year: subject ? (subject.year ?? 1) : saved?.year ?? null,
    subjectId: subject?.id ?? null,
    chapterId: chapter?.id ?? null,
    topicId: subject ? topic?.id ?? null : null,
  };
}