import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import { Typography } from "@tiptap/extension-typography";
import { CharacterCount } from "@tiptap/extension-character-count";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { all, createLowlight } from "lowlight";
import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { TextSelection } from "@tiptap/pm/state";
import { dropPoint } from "@tiptap/pm/transform";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Highlighter,
  Link as LinkIcon,
} from "lucide-react";

import { useAutoSave } from "../../hooks/useAutoSave";

export const FONT_SIZE_STEP = 1;
export const FONT_SIZE_MIN = 10;
export const FONT_SIZE_MAX = 120;
export const FONT_SIZE_DEFAULT = 15.5;

const lowlight = createLowlight(all);

// ---------- Current-line highlight (visual-line aware) ----------
// Uses a ProseMirror plugin view() so it fires on every state change.
// Finds the ".current-line-overlay" div in the DOM and positions it.
const CurrentLineExtension = Extension.create({
  name: "currentLine",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        view() {
          return {
            update(view) {
              const { selection } = view.state;
              // Walk up to the flex wrapper that contains the overlay
              const overlay = view.dom
                .closest(".editor-scroll")
                ?.querySelector(
                  ".current-line-overlay",
                ) as HTMLElement | null;
              const flex = overlay?.parentElement;
              if (!overlay) return;

              if (!selection.empty) {
                overlay.style.display = "none";
                return;
              }

              const coords = view.coordsAtPos(selection.head);
              const flexRect = flex!.getBoundingClientRect();
              const lh =
                parseFloat(getComputedStyle(view.dom).lineHeight) || 20;

              overlay.style.display = "block";
              overlay.style.top = `${coords.top - flexRect.top}px`;
              overlay.style.height = `${lh}px`;
            },
          };
        },
      }),
    ];
  },
});

// ---------- Drag-and-drop text extension ----------
// Implements text-selection drag-and-drop via a ProseMirror Plugin,
// which guarantees the handlers are properly registered in PM's event chain.
const DragTextExtension = Extension.create({
  name: "dragText",
  addProseMirrorPlugins() {
    let dragState: { from: number; to: number; slice: any } | null = null;

    const cleanup = (view: any) => {
      dragState = null;
      view.dom.draggable = false;
      view.dragging = null;
    };

    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            mousedown(view, event) {
              if (event.button !== 0) return false;
              const { state } = view;
              const { selection } = state;
              if (selection.empty || !(selection instanceof TextSelection))
                return false;
              const pos = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              });
              if (!pos) return false;
              const { from, to } = selection;
              if (pos.pos < from || pos.pos > to) return false;
              // Click is inside selection — prepare for drag
              dragState = { from, to, slice: selection.content() };
              view.dom.draggable = true;
              return true; // prevent ProseMirror from collapsing the selection
            },
            dragstart(view, event) {
              if (!dragState || !event.dataTransfer) return false;
              const { dom, text } = (view as any).serializeForClipboard(
                dragState.slice,
              );
              event.dataTransfer.clearData();
              event.dataTransfer.setData(
                "text/html",
                (dom as HTMLElement).innerHTML,
              );
              event.dataTransfer.setData("text/plain", text);
              event.dataTransfer.effectAllowed = "move";
              (view as any).dragging = {
                slice: dragState.slice,
                move: true,
              };
              return true;
            },
            dragover(_view, event) {
              if (!dragState) return false;
              event.preventDefault();
              if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
              return true;
            },
            drop(view, event) {
              if (!dragState) return false;
              event.preventDefault();
              const eventPos = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              });
              if (!eventPos) {
                cleanup(view);
                return true;
              }
              const { from, to, slice } = dragState;
              let insertPos = dropPoint(view.state.doc, eventPos.pos, slice);
              if (insertPos == null) insertPos = eventPos.pos;
              const tr = view.state.tr;
              tr.delete(from, to);
              const mappedPos = tr.mapping.map(insertPos);
              tr.replaceRange(mappedPos, mappedPos, slice);
              tr.setMeta("uiEvent", "drop");
              view.dispatch(tr);
              cleanup(view);
              return true;
            },
            dragend(view) {
              cleanup(view);
              return false;
            },
            mouseup(view, event) {
              if (!dragState) return false;
              // No drag happened — collapse selection at click position
              const pos = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              });
              if (pos) {
                const sel = TextSelection.create(view.state.doc, pos.pos);
                view.dispatch(view.state.tr.setSelection(sel));
              }
              cleanup(view);
              return false;
            },
          },
        },
      }),
    ];
  },
});

// ---------- Indent extension ----------
const IndentExtension = Extension.create({
  name: "indent",
  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (this.editor.commands.sinkListItem("listItem")) return true;
        if (this.editor.commands.sinkListItem("taskItem")) return true;
        const { state, dispatch } = this.editor.view;
        const { from, to, empty } = state.selection;
        if (empty) {
          this.editor.commands.insertContent("\t");
          return true;
        }
        const tr = state.tr;
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (node.isTextblock) {
            tr.insertText("\t", tr.mapping.map(pos + 1));
          }
        });
        dispatch(tr);
        return true;
      },
      "Shift-Tab": () => {
        if (this.editor.commands.liftListItem("listItem")) return true;
        if (this.editor.commands.liftListItem("taskItem")) return true;
        const { state, dispatch } = this.editor.view;
        const { from, to, empty } = state.selection;
        if (empty) {
          const { $from } = state.selection;
          if ($from.parent.textContent.startsWith("\t")) {
            dispatch(state.tr.delete($from.start(), $from.start() + 1));
          }
          return true;
        }
        const tr = state.tr;
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (node.isTextblock && node.textContent.startsWith("\t")) {
            const start = tr.mapping.map(pos + 1);
            tr.delete(start, start + 1);
          }
        });
        dispatch(tr);
        return true;
      },
      Enter: () => {
        const { $from } = this.editor.state.selection;
        const text = $from.parent.textContent;
        const match = text.match(/^(\t+)/);
        if (!match) return false;
        return this.editor.chain().splitBlock().insertContent(match[1]).run();
      },
    };
  },
});

interface EditorProps {
  noteId: string | null;
  content: string;
  onSaved: (id: string, content: string) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  autoFocus?: boolean;
  onEditorReady?: (editor: ReturnType<typeof useEditor> | null) => void;
}

// ---------- Line numbers (visual-line aware) ----------
function LineNumbers({
  editor,
  lineHeight,
}: {
  editor: ReturnType<typeof useEditor>;
  lineHeight: number;
}) {
  const [entries, setEntries] = useState<{ height: number }[]>([]);

  const recalc = useCallback(() => {
    if (!editor?.view) return;
    const pmEl = editor.view.dom as HTMLElement;
    const children = Array.from(pmEl.children) as HTMLElement[];
    if (children.length === 0) {
      setEntries([]);
      return;
    }

    const next: { height: number }[] = [];

    // Measure one block element and push visual-line entries
    const measureBlock = (el: HTMLElement, bottomBound: number) => {
      const blockHeight = bottomBound - el.offsetTop;
      const visualLines = Math.max(1, Math.round(blockHeight / lineHeight));
      const perLine = blockHeight / visualLines;
      for (let j = 0; j < visualLines; j++) {
        next.push({ height: perLine });
      }
    };

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const nextTop =
        i < children.length - 1
          ? children[i + 1].offsetTop
          : child.offsetTop + child.offsetHeight;
      const tag = child.tagName;

      // For lists, iterate <li> children so each item gets its own line number
      if (tag === "UL" || tag === "OL") {
        const items = Array.from(child.children).filter(
          (c) => c.tagName === "LI",
        ) as HTMLElement[];
        // Bottom of the list element itself (excludes margin)
        const listBottom = child.offsetTop + child.offsetHeight;
        for (let k = 0; k < items.length; k++) {
          const itemBottom =
            k < items.length - 1
              ? items[k + 1].offsetTop
              : listBottom;
          measureBlock(items[k], itemBottom);
        }
        // Silently absorb the list's margin-bottom gap into the last entry
        // so the next element's line number starts at the right position
        const marginGap = nextTop - listBottom;
        if (marginGap > 0 && next.length > 0) {
          next[next.length - 1].height += marginGap;
        }
      } else {
        measureBlock(child, nextTop);
      }
    }
    setEntries(next);
  }, [editor, lineHeight]);

  useEffect(() => {
    if (!editor?.view) return;
    const pmEl = editor.view.dom as HTMLElement;

    // Initial + debounced recalc
    const raf = () => requestAnimationFrame(recalc);
    raf();

    editor.on("update", raf);
    const ro = new ResizeObserver(raf);
    ro.observe(pmEl);

    return () => {
      editor.off("update", raf);
      ro.disconnect();
    };
  }, [editor, lineHeight, recalc]);

  if (!entries.length) return null;

  return (
    <div className="line-gutter">
      <div style={{ paddingTop: 24 }}>
        {entries.map((e, i) => (
          <div key={i} className="line-num" style={{ height: e.height }}>
            {i + 1}
          </div>
        ))}
      </div>
    </div>
  );
}

// Editor owns all local state so typing never re-renders App or NoteList.
export function Editor({
  noteId,
  content,
  onSaved,
  fontSize,
  onFontSizeChange,
  autoFocus,
  onEditorReady,
}: EditorProps) {
  const lastNoteId = useRef<string | null>(null);
  const [bodyContent, setBodyContent] = useState(content);
  const isDirty = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Slow down drag-selection: only let ProseMirror see mousemove every MIN_DIST pixels
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const MIN_DIST = 6;

    const onDown = (e: MouseEvent) => {
      // If the ProseMirror element is draggable, our DragTextExtension has
      // claimed this mousedown for a text-drag. Don't throttle mousemove
      // or stopPropagation will swallow the events the browser needs to
      // detect the HTML5 drag gesture.
      const pm = el.querySelector(".ProseMirror") as HTMLElement | null;
      if (pm?.draggable) return;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onUp = () => {
      dragging = false;
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      if (dx * dx + dy * dy < MIN_DIST * MIN_DIST) {
        e.stopPropagation();
        return;
      }
      lastX = e.clientX;
      lastY = e.clientY;
    };

    el.addEventListener("mousedown", onDown);
    el.addEventListener("mousemove", onMove, true);
    window.addEventListener("mouseup", onUp);
    return () => {
      el.removeEventListener("mousedown", onDown);
      el.removeEventListener("mousemove", onMove, true);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const wheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey) {
        onFontSizeChange(
          Math.min(
            FONT_SIZE_MAX,
            Math.max(
              FONT_SIZE_MIN,
              fontSize + (e.deltaY > 0 ? -FONT_SIZE_STEP : FONT_SIZE_STEP),
            ),
          ),
        );
        return;
      }
      let delta = e.deltaY;
      if (e.deltaMode === 1) delta *= 20;
      else if (e.deltaMode === 2) delta *= el.clientHeight;
      el.scrollBy({ top: delta, behavior: "instant" });
    };
    el.addEventListener("wheel", wheelHandler, { passive: false });
    return () => el.removeEventListener("wheel", wheelHandler);
  }, [fontSize, onFontSizeChange]);

  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => {
      if (!e.ctrlKey) return;
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        onFontSizeChange(Math.min(FONT_SIZE_MAX, fontSize + FONT_SIZE_STEP));
      } else if (e.key === "-") {
        e.preventDefault();
        onFontSizeChange(Math.max(FONT_SIZE_MIN, fontSize - FONT_SIZE_STEP));
      }
    };
    window.addEventListener("keydown", keyHandler);
    return () => window.removeEventListener("keydown", keyHandler);
  }, [fontSize, onFontSizeChange]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        dropcursor: { color: "#1c1c1e", width: 2, class: "drop-cursor" },
        codeBlock: false, // replaced by CodeBlockLowlight
      }),
      CodeBlockLowlight.configure({ lowlight }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
      }),
      Typography,
      CharacterCount,
      DragTextExtension,
      CurrentLineExtension,
      IndentExtension,
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: content || "<p></p>",
    autofocus: false,
    editorProps: { attributes: { spellcheck: "false" } },
    onUpdate({ editor }) {
      const html = editor.getHTML();
      isDirty.current = true;
      setBodyContent(html);
    },
  });

  // Expose editor instance to parent for bottom bar
  useEffect(() => {
    onEditorReady?.(editor);
    return () => onEditorReady?.(null);
  }, [editor]);

  useEffect(() => {
    if (noteId === lastNoteId.current) return;
    lastNoteId.current = noteId;
    isDirty.current = false;
    setBodyContent(content);
    editor?.commands.setContent(content || "<p></p>", { emitUpdate: false });
    if (autoFocus) editor?.commands.focus("end");
  }, [noteId]);

  useAutoSave(noteId, bodyContent, onSaved, isDirty);

  // Character / word count (only re-renders when counts change)
  const counts = useEditorState({
    editor,
    selector: (ctx) => ({
      words: ctx.editor.storage.characterCount.words() as number,
      chars: ctx.editor.storage.characterCount.characters() as number,
    }),
  });

  const zoomPct = Math.round((fontSize / FONT_SIZE_DEFAULT) * 10) * 10;
  const [zoomVisible, setZoomVisible] = useState(false);
  const zoomTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setZoomVisible(true);
    if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
    zoomTimerRef.current = setTimeout(() => setZoomVisible(false), 1500);
  }, [fontSize]);

  const setLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href;
    const url = window.prompt("URL", prev);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div
      style={{
        flex: 1,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Body */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <div
          ref={scrollRef}
          className="editor-scroll"
          style={{
            height: "100%",
            cursor: "text",
            overflowY: "auto",
            overflowX: "hidden",
            fontSize: `${fontSize}px`,
            lineHeight: `${Math.round(fontSize * 1.35)}px`,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) editor?.commands.focus("end");
          }}
        >
          {/* Bubble menu (portaled, position doesn't matter) */}
          {editor && (
            <BubbleMenu className="bubble-menu" editor={editor}>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  editor.chain().focus().toggleBold().run();
                }}
                className={editor.isActive("bold") ? "is-active" : ""}
              >
                <Bold size={14} />
              </button>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  editor.chain().focus().toggleItalic().run();
                }}
                className={editor.isActive("italic") ? "is-active" : ""}
              >
                <Italic size={14} />
              </button>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  editor.chain().focus().toggleStrike().run();
                }}
                className={editor.isActive("strike") ? "is-active" : ""}
              >
                <Strikethrough size={14} />
              </button>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  editor.chain().focus().toggleCode().run();
                }}
                className={editor.isActive("code") ? "is-active" : ""}
              >
                <Code size={14} />
              </button>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  editor.chain().focus().toggleHighlight().run();
                }}
                className={editor.isActive("highlight") ? "is-active" : ""}
              >
                <Highlighter size={14} />
              </button>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  setLink();
                }}
                className={editor.isActive("link") ? "is-active" : ""}
              >
                <LinkIcon size={14} />
              </button>
            </BubbleMenu>
          )}

          <div
            style={{
              display: "flex",
              minHeight: "100%",
              position: "relative",
              isolation: "isolate",
            }}
          >
            {/* Current-line highlight overlay (z-index -1 = behind content) */}
            <div
              className="current-line-overlay"
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                background: "rgba(0, 0, 0, 0.07)",
                pointerEvents: "none",
                display: "none",
                zIndex: -1,
              }}
            />
            <LineNumbers
              editor={editor}
              lineHeight={Math.round(fontSize * 1.35)}
            />
            <div
              style={{ flex: 1, minWidth: 0 }}
              onClick={(e) => {
                if (e.target === e.currentTarget)
                  editor?.commands.focus("end");
              }}
            >
              <EditorContent editor={editor} style={{ outline: "none" }} />
            </div>
          </div>
        </div>

        {/* Status bar: word count + zoom */}
        <div
          style={{
            position: "absolute",
            bottom: "16px",
            right: "16px",
            display: "flex",
            gap: "12px",
            alignItems: "center",
            userSelect: "none",
            WebkitUserSelect: "none",
            pointerEvents: "none",
          }}
        >
          {/* Word count — always visible */}
          {counts && (
            <span
              style={{
                fontSize: "11px",
                color: "rgba(0, 0, 0, 0.3)",
                fontWeight: 400,
                letterSpacing: "0.01em",
              }}
            >
              {counts.words} {counts.words === 1 ? "word" : "words"}
            </span>
          )}
          {/* Zoom pill — fades in/out */}
          <span
            style={{
              padding: "3px 10px",
              borderRadius: "999px",
              background: "rgba(0, 0, 0, 0.055)",
              border: "1px solid rgba(0, 0, 0, 0.07)",
              fontSize: "11.5px",
              fontWeight: 500,
              color: "rgba(0, 0, 0, 0.38)",
              letterSpacing: "0.01em",
              opacity: zoomVisible ? 1 : 0,
              transition: "opacity 0.4s ease",
            }}
          >
            {zoomPct}%
          </span>
        </div>
      </div>

    </div>
  );
}
