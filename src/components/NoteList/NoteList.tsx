import { useState } from "react";
import { Search, SquarePen, Trash2 } from "lucide-react";
import type { Note } from "../../lib/db";

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  const d = new Date(ts);
  const now = new Date();
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent ?? "";
}

interface NoteListProps {
  notes: Note[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function NoteList({ notes, selectedId, onSelect, onNew, onDelete, searchQuery, onSearchChange }: NoteListProps) {
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  return (
    <aside
      className="note-list-sidebar"
      style={{ background: "#2F3235", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}
      onClick={() => setContextMenu(null)}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 10px 8px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "rgba(255, 255, 255, 0.2)",
            letterSpacing: "0.01em",
            fontFamily: "inherit",
          }}
        >
          Notes
        </span>
        <button
          onClick={onNew}
          aria-label="New note"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "5px 6px",
            borderRadius: "7px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255, 255, 255, 0.3)",
            transition: "background 0.12s, color 0.12s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.08)";
            e.currentTarget.style.color = "rgba(255,255,255,0.85)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "none";
            e.currentTarget.style.color = "rgba(255,255,255,0.3)";
          }}
        >
          <SquarePen size={15} strokeWidth={1.75} />
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: "0 10px 10px" }}>
        <div style={{ position: "relative" }}>
          <Search
            size={12}
            style={{
              position: "absolute",
              left: "9px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "rgba(255, 255, 255, 0.25)",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") onSearchChange(""); }}
            className="sidebar-search"
            style={{
              width: "100%",
              padding: "6px 10px 6px 26px",
              fontSize: "12.5px",
              borderRadius: "8px",
              border: "none",
              background: "rgba(255, 255, 255, 0.07)",
              outline: "none",
              fontFamily: "inherit",
              color: "rgba(255, 255, 255, 0.8)",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {/* Note list */}
      <ul style={{ listStyle: "none", padding: "2px 0", overflowY: "auto", flex: 1, minHeight: 0 }}>
        {notes.length === 0 && !searchQuery && (
          <li style={{ padding: "32px 16px", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: "12.5px" }}>
            No notes yet
          </li>
        )}
        {notes.length === 0 && searchQuery && (
          <li style={{ padding: "32px 16px", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: "12.5px" }}>
            No results for "{searchQuery}"
          </li>
        )}
        {notes.map((note) => {
          const preview = stripHtml(note.content);
          const isSelected = selectedId === note.id;
          return (
            <li key={note.id}>
              <button
                onClick={() => onSelect(note.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setContextMenu({ id: note.id, x: e.clientX, y: e.clientY });
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: isSelected ? "rgba(255, 255, 255, 0.09)" : "transparent",
                  border: "none",
                  borderLeft: isSelected ? "2.5px solid #6366F1" : "2.5px solid transparent",
                  cursor: "pointer",
                  padding: "9px 14px 9px 13.5px",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "transparent";
                }}
              >
                <div
                  style={{
                    fontSize: "13.5px",
                    fontWeight: 500,
                    marginBottom: "3px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: isSelected ? "#a5b4fc" : "rgba(255, 255, 255, 0.88)",
                  }}
                >
                  {note.title || "New note"}
                </div>
                <div
                  style={{
                    fontSize: "11.5px",
                    color: "rgba(255, 255, 255, 0.32)",
                    display: "flex",
                    gap: "5px",
                    overflow: "hidden",
                  }}
                >
                  <span style={{ flexShrink: 0 }}>{formatTime(note.updated_at)}</span>
                  {preview && (
                    <>
                      <span style={{ opacity: 0.6 }}>·</span>
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {preview}
                      </span>
                    </>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {contextMenu && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 999 }}
            onClick={() => setContextMenu(null)}
          />
          <div
            style={{
              position: "fixed",
              top: contextMenu.y,
              left: contextMenu.x,
              zIndex: 1000,
              background: "#3a3d40",
              borderRadius: "8px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
              padding: "4px",
              minWidth: "140px",
            }}
          >
            <button
              onClick={() => { onDelete(contextMenu.id); setContextMenu(null); }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "7px 10px",
                background: "none",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                color: "#f87171",
                fontSize: "13px",
                textAlign: "left",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(248,113,113,0.12)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
            >
              <Trash2 size={13} strokeWidth={1.75} />
              Delete note
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
