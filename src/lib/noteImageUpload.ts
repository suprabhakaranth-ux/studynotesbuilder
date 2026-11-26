import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import { validateNoteImage } from "./noteImageValidation";

// SVG diagrams are sanitized and rasterized: exports can render PNG consistently,
// and embedded SVG scripts or external references cannot enter the study note.
async function rasterizeSvg(file: File): Promise<Blob> {
  const clean = DOMPurify.sanitize(await file.text(), { USE_PROFILES: { svg: true, svgFilters: true }, FORBID_TAGS: ["foreignObject", "image", "use", "style"], FORBID_ATTR: ["href", "xlink:href", "style"] });
  const url = URL.createObjectURL(new Blob([clean], { type: "image/svg+xml" }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    const width = image.naturalWidth || 1200, height = image.naturalHeight || 800;
    const scale = Math.min(2, 4096 / Math.max(width, height));
    canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare the SVG image.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Could not prepare the SVG image.")), "image/png"));
  } finally { URL.revokeObjectURL(url); }
}

export async function uploadNoteImage(file: File, userId: string) {
  validateNoteImage(file);
  const blob = file.type === "image/svg+xml" ? await rasterizeSvg(file) : file;
  const extension = ({ "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" } as Record<string, string>)[blob.type];
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const result = await supabase.storage.from("note-images").upload(path, blob, { contentType: blob.type, upsert: false });
  if (result.error) throw new Error(`Image upload failed: ${result.error.message}. Your study text has not changed.`);
  return { path, src: supabase.storage.from("note-images").getPublicUrl(path).data.publicUrl };
}