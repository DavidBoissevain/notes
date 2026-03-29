import { useState, useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import {
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Info,
} from "lucide-react";
import { timeAgo } from "../../lib/timeAgo";

interface EditorToolbarProps {
  editor: Editor;
  formatBarVisible: boolean;
  onToggleFormatBar: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  counts: { words: number; chars: number } | null;
  selectedNote?: { created_at: number; updated_at: number } | null;
}

// Shared color palette — everything uses the same base gray
const COLOR = "rgba(0,0,0,0.4)";
const COLOR_HOVER = "rgba(0,0,0,0.65)";
const COLOR_DISABLED = "rgba(0,0,0,0.15)";

function NavButton({
  onClick,
  disabled,
  children,
  title,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 30,
        height: 30,
        borderRadius: 5,
        border: "none",
        background: "transparent",
        cursor: disabled ? "default" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: disabled ? COLOR_DISABLED : hovered ? COLOR_HOVER : COLOR,
        transition: "color 0.1s",
        padding: 0,
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

export function EditorToolbar({
  editor,
  formatBarVisible: _,
  onToggleFormatBar,
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  scrollRef,
  counts,
  selectedNote,
}: EditorToolbarProps) {
  const [visible, setVisible] = useState(true);
  const [infoOpen, setInfoOpen] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);

  // Auto-hide: hide on typing, show on mouse move or idle
  useEffect(() => {
    const handleUpdate = () => {
      setVisible(false);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => setVisible(true), 1500);
    };

    editor.on("update", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [editor]);

  // Show on mouse move over editor scroll area
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleMouseMove = () => {
      setVisible(true);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };

    el.addEventListener("mousemove", handleMouseMove);
    return () => el.removeEventListener("mousemove", handleMouseMove);
  }, [scrollRef]);

  const handleToolbarMouseEnter = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    setVisible(true);
  };

  // Close info popover on click outside
  useEffect(() => {
    if (!infoOpen) return;
    const handler = (e: MouseEvent) => {
      if (!infoRef.current?.contains(e.target as Node)) {
        setInfoOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [infoOpen]);

  const [biuHovered, setBiuHovered] = useState(false);
  const [moreHovered, setMoreHovered] = useState(false);

  return (
    <div
      ref={toolbarRef}
      className={`editor-toolbar${visible ? "" : " hidden"}`}
      onMouseEnter={handleToolbarMouseEnter}
      style={{
        position: "absolute",
        top: 8,
        right: 12,
        display: "flex",
        alignItems: "center",
        gap: 0,
        zIndex: 10,
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      {/* Back / Forward — large thin chevrons like Bear */}
      <NavButton onClick={onGoBack} disabled={!canGoBack} title="Go back">
        <ChevronLeft size={26} strokeWidth={1.3} />
      </NavButton>
      <NavButton onClick={onGoForward} disabled={!canGoForward} title="Go forward">
        <ChevronRight size={26} strokeWidth={1.3} />
      </NavButton>

      <div style={{ width: 20 }} />

      {/* BIU — Bear style: B bold, I italic serif, U underlined, uniform color */}
      <button
        onClick={onToggleFormatBar}
        onMouseEnter={() => setBiuHovered(true)}
        onMouseLeave={() => setBiuHovered(false)}
        title="Toggle formatting toolbar"
        style={{
          height: 26,
          borderRadius: 5,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          display: "flex",
          alignItems: "baseline",
          justifyContent: "center",
          padding: "0 2px",
          gap: 1.5,
          color: biuHovered ? COLOR_HOVER : COLOR,
          transition: "color 0.1s",
          flexShrink: 0,
          fontFamily: "inherit",
          lineHeight: "26px",
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 18 }}>B</span>
        <span style={{ fontStyle: "italic", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 18, fontWeight: 400 }}>I</span>
        <span style={{ textDecoration: "underline", textUnderlineOffset: "2px", fontSize: 18 }}>U</span>
      </button>

      <div style={{ width: 18 }} />

      {/* Info */}
      <div style={{ position: "relative" }} ref={infoRef}>
        <NavButton onClick={() => setInfoOpen((p) => !p)} title="Note info">
          <Info size={22} strokeWidth={1.3} />
        </NavButton>

        {/* Info popover */}
        {infoOpen && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              background: "#ffffff",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 10,
              boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
              padding: "14px 18px",
              zIndex: 100,
              minWidth: 190,
              fontSize: 13,
              color: "#1c1c1e",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 20 }}>
                <span style={{ color: "rgba(0,0,0,0.4)" }}>Words</span>
                <span style={{ fontWeight: 500 }}>{counts?.words ?? 0}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 20 }}>
                <span style={{ color: "rgba(0,0,0,0.4)" }}>Characters</span>
                <span style={{ fontWeight: 500 }}>{counts?.chars ?? 0}</span>
              </div>
              {selectedNote && (
                <>
                  <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "2px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 20 }}>
                    <span style={{ color: "rgba(0,0,0,0.4)" }}>Created</span>
                    <span style={{ fontWeight: 500, fontSize: 12 }}>
                      {timeAgo(selectedNote.created_at)}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 20 }}>
                    <span style={{ color: "rgba(0,0,0,0.4)" }}>Modified</span>
                    <span style={{ fontWeight: 500, fontSize: 12 }}>
                      {timeAgo(selectedNote.updated_at)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div style={{ width: 12 }} />

      {/* Three dots — same color and weight as everything else */}
      <button
        onClick={() => {}}
        onMouseEnter={() => setMoreHovered(true)}
        onMouseLeave={() => setMoreHovered(false)}
        title="More options"
        style={{
          width: 26,
          height: 26,
          borderRadius: 5,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: moreHovered ? COLOR_HOVER : COLOR,
          transition: "color 0.1s",
          padding: 0,
          flexShrink: 0,
        }}
      >
        <MoreVertical size={22} strokeWidth={1.3} />
      </button>
    </div>
  );
}
