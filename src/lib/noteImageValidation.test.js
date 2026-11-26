import { describe, expect, test } from "bun:test";
import { validateNoteImage } from "./noteImageValidation";

describe("uploaded study diagrams", () => {
  test("accepts PNG, JPG, WebP, GIF and Napkin SVG diagrams", () => {
    for (const type of ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"]) {
      expect(() => validateNoteImage({ type, size: 1024 })).not.toThrow();
    }
  });
  test("rejects PDF and executable files in the image picker", () => {
    for (const type of ["application/pdf", "text/html", "application/octet-stream"]) {
      expect(() => validateNoteImage({ type, size: 1024 })).toThrow("Choose a PNG");
    }
  });
  test("rejects images larger than the storage limit", () => {
    expect(() => validateNoteImage({ type: "image/png", size: 20 * 1024 * 1024 + 1 })).toThrow("20 MB");
  });
});