import { describe, expect, test } from "bun:test";
import { readStudyPosition, resolveStudyPosition, studyPositionKey } from "./studyPosition";

const subjects = [{ id: "s", year: 2 }];
const chapters = [{ id: "c", subject_id: "s" }];
const topics = [{ id: "t", subjectId: "s", chapterId: "c", slug: "topic" }];
const saved = { year: 2, subjectId: "s", chapterId: "c", topicId: "t" };

describe("per-tab study navigation", () => {
  test("restores the same year, chapter and topic after reload", () => {
    expect(resolveStudyPosition(saved, subjects, chapters, topics)).toEqual(saved);
  });
  test("direct topic link wins over saved navigation", () => {
    expect(resolveStudyPosition(null, subjects, chapters, topics, "topic")).toEqual(saved);
  });
  test("deleted topic safely falls back to its chapter", () => {
    expect(resolveStudyPosition(saved, subjects, chapters, [])).toEqual({ ...saved, topicId: null });
  });
  test("does not restore a removed subject or a mismatched chapter", () => {
    expect(resolveStudyPosition(saved, [], chapters, topics).subjectId).toBeNull();
    expect(resolveStudyPosition(saved, subjects, [{ id: "c", subject_id: "other" }], topics).chapterId).toBeNull();
  });
  test("a fresh tab starts at the year cards", () => {
    expect(resolveStudyPosition(null, subjects, chapters, topics)).toEqual({ year: null, subjectId: null, chapterId: null, topicId: null });
  });
  test("storage is scoped to the account and tolerates unavailable storage", () => {
    expect(studyPositionKey("primary")).not.toEqual(studyPositionKey("other"));
    expect(readStudyPosition({ getItem() { throw new Error("blocked"); } }, "primary")).toBeNull();
    expect(readStudyPosition({ getItem: () => "invalid" }, "primary")).toBeNull();
  });
});