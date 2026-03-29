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
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { Image as TiptapImage } from "@tiptap/extension-image";
import { all, createLowlight } from "lowlight";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { dropPoint } from "@tiptap/pm/transform";
import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Highlighter,
  Link as LinkIcon,
} from "lucide-react";

import { useAutoSave } from "../../hooks/useAutoSave";
import { EditorToolbar } from "./EditorToolbar";
import { FormatToolbar } from "./FormatToolbar";
import { TableContextMenu } from "./TableContextMenu";

export const FONT_SIZE_STEP = 1;
export const FONT_SIZE_MIN = 10;
export const FONT_SIZE_MAX = 120;
export const FONT_SIZE_DEFAULT = 18.6;

const lowlight = createLowlight(all);

// ---------- Heading indicator (Bear-style) ----------
const headingIndicatorKey = new PluginKey("headingIndicator");

const HeadingIndicatorExtension = Extension.create({
  name: "headingIndicator",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: headingIndicatorKey,
        state: {
          init(_, state) {
            return buildDecorations(state);
          },
          apply(tr, old, _oldState, newState) {
            if (tr.docChanged || tr.selectionSet) {
              return buildDecorations(newState);
            }
            return old;
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});

function buildDecorations(state: any): DecorationSet {
  const { selection, doc } = state;
  if (!selection.empty) return DecorationSet.empty;

  const $pos = selection.$head;
  for (let depth = $pos.depth; depth >= 0; depth--) {
    const node = $pos.node(depth);
    if (node.type.name === "heading") {
      const pos = $pos.before(depth);
      const level = node.attrs.level;
      return DecorationSet.create(doc, [
        Decoration.node(pos, pos + node.nodeSize, {
          class: `heading-active heading-active-${level}`,
        }),
      ]);
    }
  }
  return DecorationSet.empty;
}

// ---------- Drag-and-drop text extension ----------
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
              dragState = { from, to, slice: selection.content() };
              view.dom.draggable = true;
              return true;
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
      "Mod-1": () => this.editor.commands.toggleHeading({ level: 1 }),
      "Mod-2": () => this.editor.commands.toggleHeading({ level: 2 }),
      "Mod-3": () => this.editor.commands.toggleHeading({ level: 3 }),
      "Mod-0": () => this.editor.commands.setParagraph(),
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
  formatBarVisible: boolean;
  onToggleFormatBar: () => void;
  onEditorFocus?: () => void;
  onEditorTyping?: () => void;
  selectedNote?: { created_at: number; updated_at: number } | null;
  editorInstance?: ReturnType<typeof useEditor> | null;
  readOnly?: boolean;
  onDeleteNote?: () => void;
  onCopyMarkdown?: () => void;
}


export function Editor({
  noteId,
  content,
  onSaved,
  fontSize,
  onFontSizeChange,
  autoFocus,
  onEditorReady,
  formatBarVisible,
  onToggleFormatBar,
  onEditorFocus,
  onEditorTyping,
  selectedNote,
  editorInstance,
  readOnly,
  onDeleteNote,
  onCopyMarkdown,
}: EditorProps) {
  const lastNoteId = useRef<string | null>(null);
  const [bodyContent, setBodyContent] = useState(content);
  const isDirty = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tableMenu, setTableMenu] = useState<{ x: number; y: number } | null>(null);

  // Slow down drag-selection
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const MIN_DIST = 6;

    const onDown = (e: MouseEvent) => {
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
        dropcursor: { color: "var(--drag-cursor-color)", width: 2, class: "drop-cursor" },
        codeBlock: false,
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
      IndentExtension,
      HeadingIndicatorExtension,
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TiptapImage.configure({ inline: false, allowBase64: true }),
    ],
    content: content || "<p></p>",
    autofocus: false,
    editable: !readOnly,
    editorProps: { attributes: { spellcheck: "false" } },
    onUpdate({ editor }) {
      const html = editor.getHTML();
      isDirty.current = true;
      setBodyContent(html);
      onEditorTyping?.();
    },
  });

  // Update editable when readOnly changes
  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    onEditorReady?.(editor);
    return () => onEditorReady?.(null);
  }, [editor]);

  useEffect(() => {
    if (noteId === lastNoteId.current) return;
    lastNoteId.current = noteId;
    isDirty.current = false;
    setBodyContent(content);
    if (autoFocus && !content && !readOnly) {
      editor?.commands.setContent("<h1></h1>", { emitUpdate: false });
      editor?.commands.focus("start");
    } else {
      editor?.commands.setContent(content || "<p></p>", { emitUpdate: false });
      if (autoFocus && !readOnly) editor?.commands.focus("end");
    }
  }, [noteId]);

  useAutoSave(noteId, bodyContent, onSaved, isDirty);

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
      onMouseDown={onEditorFocus}
    >
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <div
          ref={scrollRef}
          className="editor-scroll"
          style={{
            height: "100%",
            cursor: readOnly ? "default" : "text",
            overflowY: "auto",
            overflowX: "hidden",
            fontSize: `${fontSize}px`,
            lineHeight: `${Math.round(fontSize * 1.5)}px`,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !readOnly) editor?.commands.focus("end");
          }}
          onContextMenu={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest("td, th")) {
              e.preventDefault();
              setTableMenu({ x: e.clientX, y: e.clientY });
            }
          }}
        >
          {editor && !readOnly && (
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
            <div
              style={{ flex: 1, minWidth: 0 }}
              onClick={(e) => {
                if (e.target === e.currentTarget && !readOnly)
                  editor?.commands.focus("end");
              }}
            >
              <EditorContent editor={editor} style={{ outline: "none" }} />
            </div>
          </div>
        </div>

        {editor && (
          <EditorToolbar
            editor={editor}
            formatBarVisible={formatBarVisible}
            onToggleFormatBar={onToggleFormatBar}
            scrollRef={scrollRef}
            counts={counts}
            selectedNote={selectedNote}
            onDeleteNote={onDeleteNote}
            onCopyMarkdown={onCopyMarkdown}
            readOnly={readOnly}
          />
        )}

        {editorInstance && !readOnly && (
          <div
            style={{
              position: "absolute",
              bottom: 16,
              left: "50%",
              transform: formatBarVisible
                ? "translateX(-50%) translateY(0)"
                : "translateX(-50%) translateY(calc(100% + 32px))",
              opacity: formatBarVisible ? 1 : 0,
              transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              zIndex: 10,
              pointerEvents: formatBarVisible ? "auto" : "none",
            }}
          >
            <FormatToolbar editor={editorInstance} />
          </div>
        )}

        {/* Zoom pill */}
        <div
          style={{
            position: "absolute",
            bottom: "16px",
            right: "16px",
            userSelect: "none",
            WebkitUserSelect: "none",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              padding: "3px 10px",
              borderRadius: "999px",
              background: "var(--bg-active)",
              border: "1px solid var(--border-light)",
              fontSize: "11.5px",
              fontWeight: 500,
              color: "var(--text-secondary)",
              letterSpacing: "0.01em",
              opacity: zoomVisible ? 1 : 0,
              transition: "opacity 0.4s ease",
            }}
          >
            {zoomPct}%
          </span>
        </div>
      </div>

      {tableMenu && editor && !readOnly && (
        <TableContextMenu
          editor={editor}
          x={tableMenu.x}
          y={tableMenu.y}
          onClose={() => setTableMenu(null)}
        />
      )}
    </div>
  );
}
