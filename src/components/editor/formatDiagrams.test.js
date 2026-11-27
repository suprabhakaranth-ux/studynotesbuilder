import { describe, it, expect } from "bun:test";
import { isDiagramLine } from "./formatDiagrams";

describe("isDiagramLine", () => {
  it("detects box-drawn and pipe diagram rows", () => {
    expect(isDiagramLine("│   SUBJECTIVE APPROACH   │")).toBe(true);
    expect(isDiagramLine("|   | • Internal Frame Reference |")).toBe(true);
    expect(isDiagramLine("+---------+")).toBe(true);
  });
  it("ignores ordinary prose", () => {
    expect(isDiagramLine("Clinicians must determine whether record entries are facts.")).toBe(false);
  });
});
