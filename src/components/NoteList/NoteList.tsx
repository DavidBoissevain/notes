import { memo, useMemo, useState } from "react";
import { Trash2, PanelLeftClose } from "lucide-react";
import type { Note } from "../../lib/db";
import { extractTitle } from "../../lib/extractTitle";
import { timeAgo } from "../../lib/timeAgo";


interface NoteItemProps {
  note: Note;
  isSelected: boolean;
  isMultiSelected: boolean;
  isFirst: boolean;
  isNew: boolean;
  isSidebarFocused: boolean;
  hideSeparator: boolean;
  prevHighlighted: boolean;
  nextHighlighted: boolean;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onContextMenu: (id: string, x: number, y: number) => void;
}

const NoteItem = memo(function NoteItem({ note, isSelected, isMultiSelected, isFirst, isSidebarFocused, isNew, hideSeparator, prevHighlighted, nextHighlighted, onSelect, onContextMenu }: NoteItemProps) {
  const { title, preview } = useMemo(() => extractTitle(note.content), [note.content]);
  const displayTitle = title || "New note";
  const displayPreview = preview || "Start writing...";
  const timestamp = useMemo(() => timeAgo(note.updated_at), [note.updated_at]);

  const highlighted = isSelected || isMultiSelected;
  const showLeftBar = highlighted && isSidebarFocused;

  // Connected corners: flatten edges that touch an adjacent highlighted item
  const topRadius = highlighted && prevHighlighted ? 0 : 10;
  const bottomRadius = highlighted && nextHighlighted ? 0 : 10;
  const borderRadius = `${topRadius}px ${topRadius}px ${bottomRadius}px ${bottomRadius}px`;

  // Left accent bar corner radius — match the button corners
  const barTopRadius = highlighted && prevHighlighted ? 0 : 2;
  const barBottomRadius = highlighted && nextHighlighted ? 0 : 2;

  return (
    <li
      className={`note-item${isNew ? " note-slide-in" : ""}`}
      style={{
        padding: "2px 8px",
        position: "relative",
      }}
    >
      {/* Separator line — always rendered for consistent height, transparent when hidden */}
      {!isFirst && (
        <div
          style={{
            height: 1,
            background: hideSeparator ? "transparent" : "rgba(0, 0, 0, 0.16)",
            margin: "0 10px 0 10px",
          }}
        />
      )}
      {/* Background bridge to previous highlighted item — fills exact gap, no overlap */}
      {highlighted && prevHighlighted && (
        <div
          style={{
            position: "absolute",
            top: -2,
            left: 8,
            right: 8,
            height: 5, // 2px prev padding + 1px separator + 2px current padding
            background: "rgba(0, 0, 0, 0.06)",
            zIndex: 0,
          }}
        />
      )}
      {/* Left accent bar bridge to previous highlighted item */}
      {showLeftBar && prevHighlighted && (
        <div
          style={{
            position: "absolute",
            top: -2,
            left: 8,
            width: 5,
            height: 5,
            background: "#4A6FA5",
            zIndex: 1,
          }}
        />
      )}
      <button
        onClick={(e) => onSelect(note.id, e)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu(note.id, e.clientX, e.clientY);
        }}
        style={{
          width: "100%",
          textAlign: "left",
          background: highlighted ? "rgba(0, 0, 0, 0.06)" : "transparent",
          border: "none",
          borderRadius,
          cursor: "pointer",
          padding: "10px 14px 10px 14px",
          transition: "background 0.15s",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          position: "relative",
          overflow: "hidden",
          outline: "none",
        }}
        onMouseEnter={(e) => {
          if (!highlighted) e.currentTarget.style.background = "rgba(0, 0, 0, 0.03)";
        }}
        onMouseLeave={(e) => {
          if (!highlighted) e.currentTarget.style.background = "transparent";
        }}
      >
        {/* Left accent bar */}
        {showLeftBar && (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 5,
              borderRadius: `${barTopRadius}px 0 0 ${barBottomRadius}px`,
              background: "#4A6FA5",
              transition: "opacity 0.15s",
            }}
          />
        )}
        {/* Title */}
        <div
          style={{
            fontSize: "15px",
            fontWeight: 700,
            color: "#1a1a1a",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {displayTitle}
        </div>
        {/* Preview */}
        <div
          style={{
            fontSize: "15px",
            color: "rgba(0, 0, 0, 0.45)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontWeight: 500,
          }}
        >
          {displayPreview}
        </div>
        {/* Timestamp */}
        <div
          style={{
            fontSize: "12px",
            color: "rgba(0, 0, 0, 0.28)",
            fontWeight: 400,
            marginTop: "1px",
          }}
        >
          {timestamp}
        </div>
      </button>
    </li>
  );
});

interface NoteListProps {
  notes: Note[];
  selectedId: string | null;
  selectedIds: Set<string>;
  newNoteId: string | null;
  onSelect: (id: string, e?: React.MouseEvent) => void;
  onDelete: (id: string) => void;
  onDeleteSelected: (ids: string[]) => void;
  searchQuery: string;
  sidebarFocused: boolean;
  onToggleSidebar: () => void;
  collapsed: boolean;
  style?: React.CSSProperties;
}

export const NoteList = memo(function NoteList({ notes, selectedId, selectedIds, newNoteId, onSelect, onDelete, onDeleteSelected, searchQuery, sidebarFocused, onToggleSidebar, collapsed, style }: NoteListProps) {
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  const handleContextMenu = useMemo(
    () => (id: string, x: number, y: number) => setContextMenu({ id, x, y }),
    []
  );

  return (
    <aside
      className={`note-list-sidebar${collapsed ? " collapsed" : ""}`}
      style={{ display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", ...style }}
      onClick={() => setContextMenu(null)}
    >
      {/* Note list */}
      <ul style={{ listStyle: "none", padding: "8px 0", overflowY: "auto", flex: 1, minHeight: 0 }}>
        {notes.length === 0 && searchQuery && (
          <li style={{ padding: "32px 16px", textAlign: "center", color: "rgba(0, 0, 0, 0.25)", fontSize: "12.5px" }}>
            No results for &ldquo;{searchQuery}&rdquo;
          </li>
        )}
        {notes.map((note, i) => {
          const isSelected = selectedId === note.id;
          const isMulti = selectedIds.has(note.id);
          const highlighted = isSelected || isMulti;
          const prevHL = i > 0 && (selectedId === notes[i - 1].id || selectedIds.has(notes[i - 1].id));
          const nextHL = i < notes.length - 1 && (selectedId === notes[i + 1].id || selectedIds.has(notes[i + 1].id));
          return (
            <NoteItem
              key={note.id}
              note={note}
              isSelected={isSelected}
              isMultiSelected={isMulti}
              isFirst={i === 0}
              isNew={note.id === newNoteId}
              isSidebarFocused={sidebarFocused}
              hideSeparator={highlighted || prevHL}
              prevHighlighted={highlighted && prevHL}
              nextHighlighted={highlighted && nextHL}
              onSelect={onSelect}
              onContextMenu={handleContextMenu}
            />
          );
        })}
      </ul>

      {/* Sidebar collapse button — bottom left */}
      <div
        style={{
          padding: "8px 12px",
          flexShrink: 0,
        }}
      >
        <button
          onClick={onToggleSidebar}
          aria-label="Collapse sidebar"
          style={{
            width: 28,
            height: 28,
            border: "none",
            background: "transparent",
            borderRadius: 6,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(0, 0, 0, 0.3)",
            transition: "background 0.1s, color 0.1s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(0, 0, 0, 0.05)";
            e.currentTarget.style.color = "rgba(0, 0, 0, 0.6)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "rgba(0, 0, 0, 0.3)";
          }}
        >
          <PanelLeftClose size={16} strokeWidth={1.5} />
        </button>
      </div>

      {contextMenu && (() => {
        const multiCount = selectedIds.size;
        const isContextInSelection = multiCount > 0 && selectedIds.has(contextMenu.id);
        const deleteLabel = isContextInSelection ? `Delete ${multiCount} notes` : "Delete note";
        const handleDelete = () => {
          if (isContextInSelection) {
            onDeleteSelected([...selectedIds]);
          } else {
            onDelete(contextMenu.id);
          }
          setContextMenu(null);
        };
        return (
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
                background: "#ffffff",
                borderRadius: "8px",
                border: "1px solid rgba(0, 0, 0, 0.08)",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12)",
                padding: "4px",
                minWidth: "140px",
              }}
            >
              <button
                onClick={handleDelete}
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
                  color: "#ef4444",
                  fontSize: "13px",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.06)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
              >
                <Trash2 size={13} strokeWidth={1.75} />
                {deleteLabel}
              </button>
            </div>
          </>
        );
      })()}
    </aside>
  );
});
