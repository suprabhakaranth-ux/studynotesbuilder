import katex from "katex";
import { toPng } from "html-to-image";

/**
 * Render a LaTeX string to a PNG data URL using KaTeX + html-to-image.
 * Used as a fallback for formulas that won't render or when the user
 * explicitly wants the formula stored as an image.
 */
export const latexToImage = async (
  latex: string,
  displayMode: boolean = true
): Promise<string> => {
  // Render KaTeX into an offscreen container
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "0";
  container.style.background = "#ffffff";
  container.style.padding = "12px 16px";
  container.style.color = "#000000";
  container.style.fontSize = displayMode ? "20px" : "16px";
  container.style.display = "inline-block";
  container.style.lineHeight = "1.4";

  try {
    container.innerHTML = katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      output: "html",
    });
  } catch {
    // If KaTeX fails entirely, render the raw text as a fallback
    container.textContent = latex;
  }

  document.body.appendChild(container);

  try {
    // Wait a tick so fonts settle
    await new Promise((r) => requestAnimationFrame(() => r(null)));

    const dataUrl = await toPng(container, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      cacheBust: true,
    });
    return dataUrl;
  } finally {
    document.body.removeChild(container);
  }
};

/**
 * Build an inline <img> tag string for inserting a formula image
 * into the editor.
 */
export const buildFormulaImageHtml = (
  dataUrl: string,
  latex: string,
  displayMode: boolean
): string => {
  const alt = encodeAttr(latex);
  const cls = displayMode ? "formula-image formula-image-display" : "formula-image formula-image-inline";
  const style = displayMode
    ? "display:block;margin:0.5em auto;max-width:100%;"
    : "display:inline-block;vertical-align:middle;max-width:100%;";
  return `<img src="${dataUrl}" alt="${alt}" data-latex-image="${alt}" class="${cls}" style="${style}" />`;
};

const encodeAttr = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
