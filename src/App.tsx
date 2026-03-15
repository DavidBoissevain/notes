import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { TitleBar } from "./components/TitleBar/TitleBar";
import { NoteList } from "./components/NoteList/NoteList";
import { Editor, FONT_SIZE_DEFAULT } from "./components/Editor/Editor";
import { useNotes } from "./hooks/useNotes";
import { useSearch } from "./hooks/useSearch";
import { FileText } from "lucide-react";

const RESIZE_SIZE = 12;
const SIDEBAR_MIN = 160;
const SIDEBAR_MAX = 400;
const SIDEBAR_DEFAULT = 220;

type ResizeDirection = "North" | "South" | "East" | "West" | "NorthEast" | "NorthWest" | "SouthEast" | "SouthWest";

const resizeEdges: { direction: ResizeDirection; style: React.CSSProperties }[] = [
  { direction: "North",     style: { top: 0, left: RESIZE_SIZE, right: RESIZE_SIZE, height: RESIZE_SIZE, cursor: "n-resize" } },
  { direction: "South",     style: { bottom: 0, left: RESIZE_SIZE, right: RESIZE_SIZE, height: RESIZE_SIZE, cursor: "s-resize" } },
  { direction: "East",      style: { top: RESIZE_SIZE, right: 0, bottom: RESIZE_SIZE, width: RESIZE_SIZE, cursor: "e-resize" } },
  { direction: "West",      style: { top: RESIZE_SIZE, left: 0, bottom: RESIZE_SIZE, width: RESIZE_SIZE, cursor: "w-resize" } },
  { direction: "NorthEast", style: { top: 0, right: 0, width: RESIZE_SIZE, height: RESIZE_SIZE, cursor: "ne-resize" } },
  { direction: "NorthWest", style: { top: 0, left: 0, width: RESIZE_SIZE, height: RESIZE_SIZE, cursor: "nw-resize" } },
  { direction: "SouthEast", style: { bottom: 0, right: 0, width: RESIZE_SIZE, height: RESIZE_SIZE, cursor: "se-resize" } },
  { direction: "SouthWest", style: { bottom: 0, left: 0, width: RESIZE_SIZE, height: RESIZE_SIZE, cursor: "sw-resize" } },
];

function ResizeHandles({ maximized }: { maximized: boolean }) {
  if (maximized) return null;
  return (
    <>
      {resizeEdges.map(({ direction, style }) => (
        <div
          key={direction}
          style={{ position: "absolute", zIndex: 9999, ...style }}
          onMouseDown={() => getCurrentWindow().startResizeDragging(direction)}
        />
      ))}
    </>
  );
}

export default function App() {
  const { notes, selectedNote, selectedId, setSelectedId, newNote, removeNote, refreshNote, loading } = useNotes();
  const [searchQuery, setSearchQuery] = useState("");
  const [autoFocus, setAutoFocus] = useState(false);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    const win = getCurrentWindow();
    const update = () => { win.isMaximized().then(setMaximized); };
    update();
    const unlistenResize = win.onResized(update);
    const unlistenMove   = win.onMoved(update);
    return () => { unlistenResize.then(fn => fn()); unlistenMove.then(fn => fn()); };
  }, []);

  // --- Persisted font size ---
  const [fontSize, setFontSize] = useState(() => {
    const stored = localStorage.getItem("editor-font-size");
    return stored ? parseFloat(stored) : FONT_SIZE_DEFAULT;
  });
  useEffect(() => { localStorage.setItem("editor-font-size", String(fontSize)); }, [fontSize]);

  // --- Persisted sidebar width ---
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const stored = localStorage.getItem("sidebar-width");
    return stored ? Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, parseInt(stored))) : SIDEBAR_DEFAULT;
  });
  useEffect(() => { localStorage.setItem("sidebar-width", String(sidebarWidth)); }, [sidebarWidth]);

  // --- Persisted sidebar collapsed ---
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("sidebar-collapsed") === "true",
  );
  useEffect(() => { localStorage.setItem("sidebar-collapsed", String(sidebarCollapsed)); }, [sidebarCollapsed]);

  const toggleSidebar = useCallback(() => setSidebarCollapsed((p) => !p), []);

  // --- Sidebar resize drag ---
  const containerRef = useRef<HTMLDivElement>(null);
  const handleSidebarResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = sidebarWidth;
      const containerLeft = containerRef.current?.getBoundingClientRect().left ?? 0;

      const onMove = (ev: MouseEvent) => {
        const newW = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, startW + (ev.clientX - startX)));
        setSidebarWidth(newW);
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      void containerLeft;
    },
    [sidebarWidth],
  );

  const { results: searchResults } = useSearch(searchQuery);
  const displayedNotes = useMemo(() => searchResults ?? notes, [searchResults, notes]);

  const handleSelectNote = useCallback((id: string) => {
    setAutoFocus(false);
    setSelectedId(id);
  }, [setSelectedId]);

  const handleNewNote = useCallback(async () => {
    setAutoFocus(true);
    await newNote();
  }, [newNote]);

  const noteContent = selectedNote?.content ?? "";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <ResizeHandles maximized={maximized} />
      <TitleBar
        maximized={maximized}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={toggleSidebar}
      />

      <div ref={containerRef} style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <NoteList
          notes={displayedNotes}
          selectedId={selectedId}
          onSelect={handleSelectNote}
          onNew={handleNewNote}
          onDelete={removeNote}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          style={{ width: sidebarCollapsed ? 0 : sidebarWidth }}
        />

        {/* Sidebar resize handle */}
        {!sidebarCollapsed && (
          <div
            className="sidebar-resize-handle"
            onMouseDown={handleSidebarResize}
          />
        )}

        <main
          style={{
            flex: 1,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            background: "#ffffff",
          }}
        >
          {loading ? null : notes.length === 0 ? (
            <div style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              opacity: 0.35,
              userSelect: "none",
              WebkitUserSelect: "none",
            }}>
              <FileText size={40} />
              <span style={{ fontSize: "14px", fontWeight: 500 }}>No notes yet</span>
              <span style={{ fontSize: "12.5px", opacity: 0.7 }}>
                Click the pencil icon to create your first note
              </span>
            </div>
          ) : (
            <Editor
              noteId={selectedId}
              content={noteContent}
              onSaved={refreshNote}
              fontSize={fontSize}
              onFontSizeChange={setFontSize}
              autoFocus={autoFocus}
            />
          )}
        </main>
      </div>
    </div>
  );
}
