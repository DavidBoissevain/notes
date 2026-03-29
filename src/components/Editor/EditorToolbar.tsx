import { useState, useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import {
  MoreVertical,
  Info,
  Trash2,
  FileText,
} from "lucide-react";
import { timeAgo } from "../../lib/timeAgo";

interface EditorToolbarProps {
  editor: Editor;
  formatBarVisible: boolean;
  onToggleFormatBar: () => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  counts: { words: number; chars: number } | null;
  selectedNote?: { created_at: number; updated_at: number } | null;
  onDeleteNote?: () => void;
  onCopyMarkdown?: () => void;
  readOnly?: boolean;
}

function NavButton({
  onClick,
  children,
  title,
}: {
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 30,
        height: 30,
        borderRadius: 5,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: hovered ? "var(--text-icon-hover)" : "var(--text-icon)",
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
  scrollRef,
  counts,
  selectedNote,
  onDeleteNote,
  onCopyMarkdown,
  readOnly,
}: EditorToolbarProps) {
  const [visible, setVisible] = useState(true);
  const [infoOpen, setInfoOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

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

  // Close more menu on click outside
  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: MouseEvent) => {
      if (!moreRef.current?.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [moreOpen]);

  const [biuHovered, setBiuHovered] = useState(false);

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
      {/* BIU toggle */}
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
          color: biuHovered ? "var(--text-icon-hover)" : "var(--text-icon)",
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

        {infoOpen && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              background: "var(--bg-popover)",
              border: "1px solid var(--border-light)",
              borderRadius: 10,
              boxShadow: "var(--shadow-popover)",
              padding: "14px 18px",
              zIndex: 100,
              minWidth: 190,
              fontSize: 13,
              color: "var(--text-primary)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 20 }}>
                <span style={{ color: "var(--text-icon)" }}>Words</span>
                <span style={{ fontWeight: 500 }}>{counts?.words ?? 0}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 20 }}>
                <span style={{ color: "var(--text-icon)" }}>Characters</span>
                <span style={{ fontWeight: 500 }}>{counts?.chars ?? 0}</span>
              </div>
              {selectedNote && (
                <>
                  <div style={{ height: 1, background: "var(--border-light)", margin: "2px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 20 }}>
                    <span style={{ color: "var(--text-icon)" }}>Created</span>
                    <span style={{ fontWeight: 500, fontSize: 12 }}>
                      {timeAgo(selectedNote.created_at)}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 20 }}>
                    <span style={{ color: "var(--text-icon)" }}>Modified</span>
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

      {/* Three-dots menu */}
      <div style={{ position: "relative" }} ref={moreRef}>
        <NavButton onClick={() => setMoreOpen((p) => !p)} title="More options">
          <MoreVertical size={22} strokeWidth={1.3} />
        </NavButton>

        {moreOpen && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              background: "var(--bg-popover)",
              border: "1px solid var(--border-light)",
              borderRadius: 10,
              boxShadow: "var(--shadow-popover)",
              padding: 4,
              zIndex: 100,
              minWidth: 170,
            }}
          >
            {/* Copy as Markdown */}
            <MenuButton
              onClick={() => { onCopyMarkdown?.(); setMoreOpen(false); }}
              icon={<FileText size={14} strokeWidth={1.5} />}
              label="Copy as Markdown"
            />

            {/* Delete note */}
            {!readOnly && (
              <MenuButton
                onClick={() => { onDeleteNote?.(); setMoreOpen(false); }}
                icon={<Trash2 size={14} strokeWidth={1.5} />}
                label="Delete note"
                destructive
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MenuButton({
  onClick,
  icon,
  label,
  destructive,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  destructive?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 10px",
        background: hovered
          ? destructive ? "var(--accent-red-tint)" : "var(--bg-hover)"
          : "transparent",
        border: "none",
        borderRadius: 6,
        cursor: "pointer",
        color: destructive ? "var(--accent-red)" : "var(--text-primary)",
        fontSize: 13,
        fontWeight: 500,
        textAlign: "left",
        fontFamily: "inherit",
        transition: "background 0.1s",
      }}
    >
      {icon}
      {label}
    </button>
  );
}
