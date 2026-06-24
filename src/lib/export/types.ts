export interface ExportSubject {
  id: string;
  name: string;
  color: string;
}

export interface ExportChapter {
  id: string;
  subject_id: string;
  name: string;
  chapter_order: number;
}

export interface ExportTopic {
  id: string;
  subject_id: string | null;
  chapter_id: string | null;
  title: string;
  created_at: string | null;
}

export interface ExportBlock {
  id: string;
  type: string;
  content: string;
  block_order: number;
  headings: string[];
}

export interface ExportHeadingNode {
  id: string;
  title: string;
  notes: string;
  children: ExportHeadingNode[];
}

export interface TopicBundle {
  topic: ExportTopic;
  subject: ExportSubject;
  chapter: ExportChapter | null;
  blocks: ExportBlock[];
  summary: string;
  mnemonic: string;
  headingTree: ExportHeadingNode[];
}

export interface ExportSelection {
  topicIds: Set<string>;
}

export interface ExportOptions {
  paper: "a4" | "letter";
  includeSummary: boolean;
  includeMnemonic: boolean;
  includeOutline: boolean;
}

export type ProgressStage =
  | "fetching"
  | "rendering"
  | "html"
  | "pdf"
  | "docx"
  | "zipping"
  | "done"
  | "error";

export interface ProgressEvent {
  stage: ProgressStage;
  message: string;
  percent?: number;
}

export type ProgressCallback = (e: ProgressEvent) => void;
