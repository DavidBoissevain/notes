import TurndownService from "turndown";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

// Task list support
turndown.addRule("taskListItem", {
  filter: (node) => {
    return (
      node.nodeName === "LI" &&
      node.getAttribute("data-type") === "taskItem"
    );
  },
  replacement: (content, node) => {
    const checked = (node as HTMLElement).getAttribute("data-checked") === "true";
    const prefix = checked ? "[x]" : "[ ]";
    return `${prefix} ${content.trim()}\n`;
  },
});

// Highlight/mark support
turndown.addRule("highlight", {
  filter: "mark",
  replacement: (content) => `==${content}==`,
});

export function htmlToMarkdown(html: string): string {
  if (!html || html === "<p></p>") return "";
  return turndown.turndown(html);
}
