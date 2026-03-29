/**
 * Extracts a title and preview from HTML content (Bear-style).
 * Title = first <h1> text, or first text node if no H1.
 * Preview = remaining text after the title element.
 */
export function extractTitle(html: string): { title: string; preview: string } {
  if (!html || html === "<p></p>" || html === "<h1></h1>") {
    return { title: "", preview: "" };
  }

  const div = document.createElement("div");
  div.innerHTML = html;

  const children = Array.from(div.childNodes);
  let titleText = "";
  let titleNodeIndex = -1;

  // Look for first H1
  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    if (node instanceof HTMLHeadingElement && node.tagName === "H1") {
      titleText = node.textContent?.trim() ?? "";
      titleNodeIndex = i;
      break;
    }
  }

  // No H1 found — use first text-bearing element
  if (titleNodeIndex === -1) {
    for (let i = 0; i < children.length; i++) {
      const text = children[i].textContent?.trim() ?? "";
      if (text) {
        titleText = text;
        titleNodeIndex = i;
        break;
      }
    }
  }

  // Build preview from everything after the title node
  let preview = "";
  if (titleNodeIndex >= 0) {
    const remaining: string[] = [];
    for (let i = titleNodeIndex + 1; i < children.length; i++) {
      const text = children[i].textContent?.trim() ?? "";
      if (text) remaining.push(text);
    }
    preview = remaining.join(" ");
  }

  return { title: titleText, preview };
}
