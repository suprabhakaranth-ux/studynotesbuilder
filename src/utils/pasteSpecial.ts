/**
 * Paste Special Utilities
 * Handles different paste modes for rich text content
 */

/**
 * Sanitizes HTML to clean semantic format (destination style)
 * Strips all inline styles, classes, and converts to semantic HTML
 */
export const sanitizeToDestinationStyle = (html: string): string => {
  const temp = document.createElement("div");
  temp.innerHTML = html;
  
  // Remove all style attributes, classes, and source-specific attributes
  const allElements = temp.querySelectorAll("*");
  allElements.forEach((el) => {
    const element = el as HTMLElement;
    
    // Remove all attributes except href for links
    const href = element.getAttribute("href");
    Array.from(element.attributes).forEach(attr => {
      element.removeAttribute(attr.name);
    });
    if (href && element.tagName === "A") {
      element.setAttribute("href", href);
    }
  });
  
  // Process the content recursively to keep only semantic elements
  const cleanElement = (element: Element): string => {
    const tagName = element.tagName.toLowerCase();
    let content = "";
    
    // Process children
    element.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        content += child.textContent || "";
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        content += cleanElement(child as Element);
      }
    });
    
    // Map to semantic tags and preserve allowed ones
    const semanticMap: Record<string, string> = {
      "b": "strong",
      "strong": "strong",
      "i": "em",
      "em": "em",
      "u": "u",
      "s": "s",
      "strike": "s",
      "del": "s",
      "p": "p",
      "br": "br",
      "ul": "ul",
      "ol": "ol",
      "li": "li",
      "a": "a",
      "h1": "p",
      "h2": "p",
      "h3": "p",
      "h4": "p",
      "h5": "p",
      "h6": "p",
      "blockquote": "p",
    };
    
    // Elements to flatten (just return content)
    const flattenTags = ["span", "font", "div", "section", "article", "header", "footer", "main", "aside", "nav"];
    
    if (tagName === "br") {
      return "<br>";
    }
    
    if (flattenTags.includes(tagName)) {
      // For divs that act as block containers, add line break if content exists
      if (tagName === "div" && content.trim()) {
        return content + "<br>";
      }
      return content;
    }
    
    const mappedTag = semanticMap[tagName];
    if (mappedTag) {
      if (tagName === "a") {
        const href = (element as HTMLAnchorElement).getAttribute("href");
        return href ? `<a href="${href}">${content}</a>` : content;
      }
      return content ? `<${mappedTag}>${content}</${mappedTag}>` : "";
    }
    
    // Default: just return content for unknown tags
    return content;
  };
  
  let result = cleanElement(temp);
  
  // Clean up multiple consecutive br tags
  result = result.replace(/(<br\s*\/?>\s*){3,}/gi, "<br><br>");
  
  // Clean up empty paragraphs
  result = result.replace(/<p>\s*<\/p>/gi, "");
  
  // Ensure content doesn't start or end with excessive breaks
  result = result.replace(/^(<br\s*\/?>\s*)+/gi, "");
  result = result.replace(/(<br\s*\/?>\s*)+$/gi, "");
  
  return result;
};

/**
 * Extracts plain text from HTML, preserving line breaks
 */
export const extractPlainText = (html: string): string => {
  const temp = document.createElement("div");
  temp.innerHTML = html;
  
  // Replace block elements with newlines first
  const blockElements = temp.querySelectorAll("p, div, br, li, h1, h2, h3, h4, h5, h6, tr");
  blockElements.forEach((el) => {
    if (el.tagName === "BR") {
      el.replaceWith("\n");
    } else {
      el.insertAdjacentText("afterend", "\n");
    }
  });
  
  // Get text content
  let text = temp.textContent || "";
  
  // Normalize whitespace but preserve intentional line breaks
  text = text.replace(/[ \t]+/g, " ");  // Collapse horizontal whitespace
  text = text.replace(/\n[ \t]+/g, "\n");  // Remove leading whitespace after newlines
  text = text.replace(/[ \t]+\n/g, "\n");  // Remove trailing whitespace before newlines
  text = text.replace(/\n{3,}/g, "\n\n");  // Max 2 consecutive newlines
  text = text.trim();
  
  return text;
};

/**
 * Converts plain text to HTML with preserved line breaks
 */
export const textToHtml = (text: string): string => {
  return text
    .split("\n")
    .map(line => line || "<br>")
    .join("<br>");
};

/**
 * Minimal cleanup for source formatting (keeps most formatting)
 * Only removes potentially dangerous elements
 */
export const sanitizeSourceFormatting = (html: string): string => {
  const temp = document.createElement("div");
  temp.innerHTML = html;
  
  // Remove script and style tags
  temp.querySelectorAll("script, style, iframe, object, embed").forEach(el => el.remove());
  
  // Remove event handlers
  temp.querySelectorAll("*").forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith("on")) {
        el.removeAttribute(attr.name);
      }
    });
  });
  
  return temp.innerHTML;
};

/**
 * Inserts content at the current cursor position in the active contenteditable
 */
export const insertContentAtCursor = (content: string): boolean => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  
  const range = selection.getRangeAt(0);
  const editableElement = (range.commonAncestorContainer instanceof Element 
    ? range.commonAncestorContainer 
    : range.commonAncestorContainer.parentElement)?.closest('[contenteditable="true"]') as HTMLElement;
  
  if (!editableElement) return false;
  
  // Delete any selected content first
  range.deleteContents();
  
  // Create fragment from HTML
  const fragment = document.createRange().createContextualFragment(content);
  range.insertNode(fragment);
  
  // Move cursor to end of inserted content
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
  
  // Trigger input event to sync state
  editableElement.dispatchEvent(new Event("input", { bubbles: true }));
  
  return true;
};

/**
 * Gets HTML content of current selection
 */
export const getSelectionHtml = (): string | null => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }
  
  const range = selection.getRangeAt(0);
  const fragment = range.cloneContents();
  const temp = document.createElement("div");
  temp.appendChild(fragment);
  
  return temp.innerHTML;
};

/**
 * Replaces current selection with new content
 */
export const replaceSelection = (content: string): boolean => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  
  const range = selection.getRangeAt(0);
  const editableElement = (range.commonAncestorContainer instanceof Element 
    ? range.commonAncestorContainer 
    : range.commonAncestorContainer.parentElement)?.closest('[contenteditable="true"]') as HTMLElement;
  
  if (!editableElement) return false;
  
  range.deleteContents();
  const fragment = document.createRange().createContextualFragment(content);
  range.insertNode(fragment);
  
  // Collapse selection after the inserted content
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
  
  // Trigger input event
  editableElement.dispatchEvent(new Event("input", { bubbles: true }));
  
  return true;
};
