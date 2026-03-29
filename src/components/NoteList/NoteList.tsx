import { memo, useMemo, useState, useCallback } from "react";
import { Trash2, PanelLeftClose, RotateCcw, FileText } from "lucide-react";
import type { Note } from "../../lib/db";
import { extractTitle } from "../../lib/extractTitle";
import { timeAgo } from "../../lib/timeAgo";
import { htmlToMarkdown } from "../../lib/markdown";


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
  onDragStart: (noteId: string) => void;
  isTrash: boolean;
  folderName?: string;
}

const NoteItem = memo(function NoteItem({ note, isSelected, isMultiSelected, isFirst, isSidebarFocused, isNew, hideSeparator, prevHighlighted, nextHighlighted, onSelect, onContextMenu, onDragStart, isTrash, folderName }: NoteItemProps) {
  const { title, preview } = useMemo(() => extractTitle(note.content), [note.content]);
  const displayTitle = title || "New note";
  const displayPreview = preview || "Start writing...";
  const timestamp = useMemo(() => timeAgo(note.updated_at), [note.updated_at]);

  const highlighted = isSelected || isMultiSelected;
  const showLeftBar = highlighted && isSidebarFocused;

  const topRadius = highlighted && prevHighlighted ? 0 : 10;
  const bottomRadius = highlighted && nextHighlighted ? 0 : 10;
  const borderRadius = `${topRadius}px ${topRadius}px ${bottomRadius}px ${bottomRadius}px`;

  const barTopRadius = highlighted && prevHighlighted ? 0 : 2;
  const barBottomRadius = highlighted && nextHighlighted ? 0 : 2;

  const handleDragStart = (e: React.DragEvent) => {
    if (isTrash) { e.preventDefault(); return; }
    e.dataTransfer.setData("application/note-id", note.id);
    e.dataTransfer.effectAllowed = "move";
    onDragStart(note.id);
  };

  return (
    <li
      className={`note-item${isNew ? " note-slide-in" : ""}`}
      style={{
        padding: "2px 8px",
        position: "relative",
      }}
    >
      {!isFirst && (
        <div
          style={{
            height: 1,
            background: hideSeparator ? "transparent" : "var(--border-primary)",
            margin: "0 10px 0 10px",
          }}
        />
      )}
      {highlighted && prevHighlighted && (
        <div
          style={{
            position: "absolute",
            top: -2,
            left: 8,
            right: 8,
            height: 5,
            background: "var(--bg-active)",
            zIndex: 0,
          }}
        />
      )}
      {showLeftBar && prevHighlighted && (
        <div
          style={{
            position: "absolute",
            top: -2,
            left: 8,
            width: 5,
            height: 5,
            background: "var(--accent-blue)",
            zIndex: 1,
          }}
        />
      )}
      <button
        draggable={!isTrash}
        onDragStart={handleDragStart}
        onClick={(e) => onSelect(note.id, e)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu(note.id, e.clientX, e.clientY);
        }}
        style={{
          width: "100%",
          textAlign: "left",
          background: highlighted ? "var(--bg-active)" : "transparent",
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
          if (!highlighted) e.currentTarget.style.background = "var(--bg-hover)";
        }}
        onMouseLeave={(e) => {
          if (!highlighted) e.currentTarget.style.background = "transparent";
        }}
      >
        {showLeftBar && (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 5,
              borderRadius: `${barTopRadius}px 0 0 ${barBottomRadius}px`,
              background: "var(--accent-blue)",
              transition: "opacity 0.15s",
            }}
          />
        )}
        <div
          style={{
            fontSize: "15px",
            fontWeight: 700,
            color: "var(--text-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {displayTitle}
        </div>
        <div
          style={{
            fontSize: "15px",
            color: "var(--text-secondary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontWeight: 500,
          }}
        >
          {displayPreview}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginTop: "1px",
          }}
        >
          <span
            style={{
              fontSize: "12px",
              color: "var(--text-tertiary)",
              fontWeight: 400,
            }}
          >
            {timestamp}
          </span>
          {folderName && (
            <span
              style={{
                fontSize: "10.5px",
                fontWeight: 550,
                color: "var(--accent-blue)",
                background: "var(--accent-blue-tint)",
                padding: "1px 6px",
                borderRadius: 4,
                whiteSpace: "nowrap",
                lineHeight: "16px",
              }}
            >
              {folderName}
            </span>
          )}
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
  onRestore: (id: string) => void;
  searchQuery: string;
  sidebarFocused: boolean;
  onToggleSidebar: () => void;
  collapsed: boolean;
  style?: React.CSSProperties;
  isTrash: boolean;
  currentFolderId: string;
  globalSearch: boolean;
  folderNameMap: Map<string, string>;
}

export const NoteList = memo(function NoteList({ notes, selectedId, selectedIds, newNoteId, onSelect, onDelete, onDeleteSelected, onRestore, searchQuery, sidebarFocused, onToggleSidebar, collapsed, style, isTrash, globalSearch, folderNameMap }: NoteListProps) {
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [, setDraggingNoteId] = useState<string | null>(null);

  const handleContextMenu = useMemo(
    () => (id: string, x: number, y: number) => setContextMenu({ id, x, y }),
    []
  );

  const handleDragStart = useCallback((noteId: string) => {
    setDraggingNoteId(noteId);
  }, []);

  const handleCopyMarkdown = useCallback((noteId: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;
    const md = htmlToMarkdown(note.content);
    navigator.clipboard.writeText(md);
    setContextMenu(null);
  }, [notes]);

  return (
    <aside
      className={`note-list-sidebar${collapsed ? " collapsed" : ""}`}
      style={{ display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", ...style }}
      onClick={() => setContextMenu(null)}
    >
      {/* Note list */}
      <ul style={{ listStyle: "none", padding: "8px 0", overflowY: "auto", flex: 1, minHeight: 0 }}>
        {notes.length === 0 && searchQuery && (
          <li style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: "12.5px" }}>
            No results
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
              onDragStart={handleDragStart}
              isTrash={isTrash}
              folderName={globalSearch ? folderNameMap.get(note.folder_id) : undefined}
            />
          );
        })}
      </ul>

      {/* Sidebar collapse button */}
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
            color: "var(--text-muted)",
            transition: "background 0.1s, color 0.1s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--bg-hover-strong)";
            e.currentTarget.style.color = "var(--text-icon-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-muted)";
          }}
        >
          <PanelLeftClose size={16} strokeWidth={1.5} />
        </button>
      </div>

      {contextMenu && (() => {
        const multiCount = selectedIds.size;
        const isContextInSelection = multiCount > 0 && selectedIds.has(contextMenu.id);

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
                background: "var(--bg-popover)",
                borderRadius: "8px",
                border: "1px solid var(--border-light)",
                boxShadow: "var(--shadow-menu)",
                padding: "4px",
                minWidth: "160px",
              }}
            >
              {/* Copy as Markdown */}
              {!isContextInSelection && (
                <button
                  onClick={() => handleCopyMarkdown(contextMenu.id)}
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
                    color: "var(--text-primary)",
                    fontSize: "13px",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                >
                  <FileText size={13} strokeWidth={1.75} />
                  Copy as Markdown
                </button>
              )}

              {/* Restore (trash only) */}
              {isTrash && !isContextInSelection && (
                <button
                  onClick={() => { onRestore(contextMenu.id); setContextMenu(null); }}
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
                    color: "var(--accent-blue)",
                    fontSize: "13px",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent-blue-tint)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                >
                  <RotateCcw size={13} strokeWidth={1.75} />
                  Restore
                </button>
              )}

              {/* Delete */}
              <button
                onClick={() => {
                  if (isContextInSelection) {
                    onDeleteSelected([...selectedIds]);
                  } else {
                    onDelete(contextMenu.id);
                  }
                  setContextMenu(null);
                }}
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
                  color: "var(--accent-red)",
                  fontSize: "13px",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent-red-tint)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
              >
                <Trash2 size={13} strokeWidth={1.75} />
                {isTrash
                  ? (isContextInSelection ? `Delete ${multiCount} permanently` : "Delete permanently")
                  : (isContextInSelection ? `Delete ${multiCount} notes` : "Delete note")
                }
              </button>
            </div>
          </>
        );
      })()}
    </aside>
  );
});
