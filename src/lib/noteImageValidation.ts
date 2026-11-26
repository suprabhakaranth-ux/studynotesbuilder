export const MAX_NOTE_IMAGE_BYTES = 20 * 1024 * 1024;
export const NOTE_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
export function validateNoteImage(file: { type: string; size: number }) {
  if (!NOTE_IMAGE_TYPES.includes(file.type)) throw new Error("Choose a PNG, JPG, WebP, GIF or SVG image.");
  if (file.size > MAX_NOTE_IMAGE_BYTES) throw new Error("Choose an image smaller than 20 MB.");
}