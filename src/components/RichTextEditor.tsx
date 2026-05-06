// Backwards-compatible re-export: the project's editor is now Tiptap-based.
// All call sites continue to import RichTextEditor with the same props.
export { TiptapEditor as RichTextEditor } from "./editor/TiptapEditor";
