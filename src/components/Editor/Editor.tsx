import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Extension } from "@tiptap/core";
import { useEffect, useRef, useState } from "react";

export const FONT_SIZE_STEP = 3;
export const FONT_SIZE_MIN = 10;
export const FONT_SIZE_MAX = 120;
export const FONT_SIZE_DEFAULT = 15.5;

const IndentExtension = Extension.create({
  name: "indent",
  addKeyboardShortcuts() {
    return {
      Tab: () => {
        this.editor.commands.insertContent("\t");
        return true;
      },
      "Shift-Tab": () => {
        const { state, dispatch } = this.editor.view;
        const { $from } = state.selection;
        if ($from.parent.textContent.startsWith("\t")) {
          dispatch(state.tr.delete($from.start(), $from.start() + 1));
        }
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
  title: string;
  content: string;
  onChange: (content: string, title: string) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
}

export function Editor({ noteId, title, content, onChange, fontSize, onFontSizeChange }: EditorProps) {
  const lastNoteId = useRef<string | null>(null);
  const [titleValue, setTitleValue] = useState(title);
  const titleRef = useRef(title);
  const bodyRef = useRef(content);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const wheelHandler = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      onFontSizeChange(Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, fontSize + (e.deltaY > 0 ? -FONT_SIZE_STEP : FONT_SIZE_STEP))));
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
    extensions: [StarterKit, IndentExtension],
    content: content || "<p></p>",
    autofocus: false,
    onUpdate({ editor }) {
      const html = editor.getHTML();
      bodyRef.current = html;
      onChange(html, titleRef.current);
    },
  });

  useEffect(() => {
    if (noteId === lastNoteId.current) return;
    lastNoteId.current = noteId;
    titleRef.current = title;
    bodyRef.current = content;
    setTitleValue(title);
    editor?.commands.setContent(content || "<p></p>", false);
  }, [noteId]);

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    titleRef.current = e.target.value;
    setTitleValue(e.target.value);
    onChange(bodyRef.current, e.target.value);
  }

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      editor?.commands.focus("start");
    }
  }

  const zoomPct = Math.round((fontSize / FONT_SIZE_DEFAULT) * 10) * 10;
  const [zoomVisible, setZoomVisible] = useState(false);
  const zoomTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setZoomVisible(true);
    if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
    zoomTimerRef.current = setTimeout(() => setZoomVisible(false), 1500);
  }, [fontSize]);

  return (
    <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Title */}
      <div style={{ flexShrink: 0, padding: "32px 56px 0 32px", maxWidth: "720px", margin: "0", width: "100%", boxSizing: "border-box" }}>
        <input
          type="text"
          value={titleValue}
          onChange={handleTitleChange}
          onKeyDown={handleTitleKeyDown}
          placeholder="Untitled"
          style={{
            fontSize: "26px",
            fontWeight: 700,
            fontFamily: "'Segoe UI Variable Display', 'Segoe UI Variable', 'Segoe UI', sans-serif",
            border: "none",
            background: "transparent",
            outline: "none",
            width: "100%",
            color: "#1c1c1e",
            letterSpacing: "-0.02em",
            lineHeight: 1.25,
            padding: 0,
            boxSizing: "border-box",
          }}
        />
        <div
          style={{
            height: "1px",
            background: "rgba(0, 0, 0, 0.07)",
            marginTop: "16px",
          }}
        />
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <div
          ref={scrollRef}
          className="editor-scroll"
          style={{ height: "100%", cursor: "text", overflowY: "auto", overflowX: "hidden", fontSize: `${fontSize}px`, lineHeight: `${Math.round(fontSize * 1.35)}px` }}
          onClick={(e) => {
            if (e.target === e.currentTarget) editor?.commands.focus("end");
          }}
        >
          <EditorContent editor={editor} style={{ outline: "none" }} />
        </div>
        {/* Zoom pill */}
        <div style={{
          position: "absolute",
          bottom: "16px",
          right: "16px",
          padding: "3px 10px",
          borderRadius: "999px",
          background: "rgba(0, 0, 0, 0.055)",
          border: "1px solid rgba(0, 0, 0, 0.07)",
          fontSize: "11.5px",
          fontWeight: 500,
          color: "rgba(0, 0, 0, 0.38)",
          letterSpacing: "0.01em",
          userSelect: "none",
          WebkitUserSelect: "none",
          pointerEvents: "none",
          opacity: zoomVisible ? 1 : 0,
          transition: "opacity 0.4s ease",
        }}>
          {zoomPct}%
        </div>
      </div>
    </div>
  );
}
