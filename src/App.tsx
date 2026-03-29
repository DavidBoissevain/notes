import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { TitleBar } from "./components/TitleBar/TitleBar";
import { NoteList } from "./components/NoteList/NoteList";
import { Editor, FONT_SIZE_DEFAULT } from "./components/Editor/Editor";
import { useNotes } from "./hooks/useNotes";
import { useSearch } from "./hooks/useSearch";
import { useNoteHistory } from "./hooks/useNoteHistory";
import { getAllFolders, createFolder, deleteFolder, updateFolderIcon, DEFAULT_FOLDER_ID, type Folder } from "./lib/db";
import { PanelLeftOpen } from "lucide-react";

const RESIZE_SIZE = 12;
const SIDEBAR_MIN = 200;
const SIDEBAR_MAX = 400;
const SIDEBAR_DEFAULT = 280;

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
  // --- Folder state ---
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState(() => {
    return localStorage.getItem("current-folder") || DEFAULT_FOLDER_ID;
  });

  useEffect(() => {
    getAllFolders().then(setFolders);
  }, []);

  useEffect(() => {
    localStorage.setItem("current-folder", currentFolderId);
  }, [currentFolderId]);

  const handleCreateFolder = useCallback(async (name: string, icon: string) => {
    const folder = await createFolder(name, icon);
    setFolders((prev) => [...prev, folder]);
    setCurrentFolderId(folder.id);
  }, []);

  const handleDeleteFolder = useCallback(async (id: string) => {
    await deleteFolder(id);
    setFolders((prev) => prev.filter((f) => f.id !== id));
    if (currentFolderId === id) setCurrentFolderId(DEFAULT_FOLDER_ID);
  }, [currentFolderId]);

  const handleUpdateFolderIcon = useCallback(async (id: string, icon: string) => {
    await updateFolderIcon(id, icon);
    setFolders((prev) => prev.map((f) => f.id === id ? { ...f, icon } : f));
  }, []);

  const { notes, selectedNote, selectedId, setSelectedId, newNote, removeNote, removeNotes, refreshNote, loading, newNoteId } = useNotes(currentFolderId);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastClickedIdRef = useRef<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [autoFocus, setAutoFocus] = useState(false);
  const [maximized, setMaximized] = useState(false);

  // Reset search when switching folders
  useEffect(() => {
    setSearchQuery("");
    setSearchOpen(false);
  }, [currentFolderId]);

  const toggleSearch = useCallback(() => {
    setSearchOpen((prev) => {
      if (prev) setSearchQuery("");
      return !prev;
    });
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery("");
  }, []);

  useEffect(() => {
    const win = getCurrentWindow();
    const update = () => { win.isMaximized().then(setMaximized); };
    update();
    const unlistenResize = win.onResized(update);
    const unlistenMove   = win.onMoved(update);
    return () => {
      unlistenResize.then(fn => fn());
      unlistenMove.then(fn => fn());
    };
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

  // Ctrl+\ to toggle sidebar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "\\") { e.preventDefault(); toggleSidebar(); }
      if (e.altKey && e.key === "s") { e.preventDefault(); toggleSidebar(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleSidebar]);

  // --- Persisted format bar visibility ---
  const [formatBarVisible, setFormatBarVisible] = useState(
    () => localStorage.getItem("format-bar-visible") !== "false",
  );
  useEffect(() => { localStorage.setItem("format-bar-visible", String(formatBarVisible)); }, [formatBarVisible]);
  const toggleFormatBar = useCallback(() => setFormatBarVisible((p) => !p), []);

  // --- Sidebar focused state (two-state selection) ---
  const [sidebarFocused, setSidebarFocused] = useState(false);

  // --- Note history (back/forward) ---
  const { pushHistory, goBack, goForward, canGoBack, canGoForward } = useNoteHistory(setSelectedId);

  // --- Sidebar resize drag ---
  const containerRef = useRef<HTMLDivElement>(null);
  const sidebarWidthRef = useRef(sidebarWidth);
  sidebarWidthRef.current = sidebarWidth;

  const handleSidebarResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarWidthRef.current;

    const sidebar = document.querySelector(".note-list-sidebar") as HTMLElement | null;
    if (sidebar) sidebar.style.transition = "none";

    const onMove = (ev: MouseEvent) => {
      const newW = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, startW + (ev.clientX - startX)));
      setSidebarWidth(newW);
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      if (sidebar) sidebar.style.transition = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  const { results: searchResults } = useSearch(searchQuery, currentFolderId);
  const displayedNotes = useMemo(() => searchResults ?? notes, [searchResults, notes]);

  const handleSelectNote = useCallback((id: string, e?: React.MouseEvent) => {
    setAutoFocus(false);
    setSidebarFocused(true);

    if (e?.ctrlKey || e?.metaKey) {
      // Ctrl+click: toggle this note in/out of multi-select
      setSelectedIds((prev) => {
        const next = new Set(prev);
        // First Ctrl+click: seed with current primary selection
        if (next.size === 0 && selectedId) next.add(selectedId);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
      lastClickedIdRef.current = id;
      return;
    }

    if (e?.shiftKey) {
      // Shift+click: range select from last clicked to current
      const anchor = lastClickedIdRef.current;
      if (anchor) {
        const ids = displayedNotes.map((n) => n.id);
        const anchorIdx = ids.indexOf(anchor);
        const targetIdx = ids.indexOf(id);
        if (anchorIdx !== -1 && targetIdx !== -1) {
          const start = Math.min(anchorIdx, targetIdx);
          const end = Math.max(anchorIdx, targetIdx);
          const rangeIds = ids.slice(start, end + 1);
          setSelectedIds(new Set(rangeIds));
          return;
        }
      }
    }

    // Normal click: single select, clear multi-select
    setSelectedIds(new Set());
    lastClickedIdRef.current = id;
    setSelectedId(id);
    pushHistory(id);
  }, [setSelectedId, pushHistory, selectedId, displayedNotes]);

  const handleDeleteSelected = useCallback(async (ids: string[]) => {
    await removeNotes(ids);
    setSelectedIds(new Set());
  }, [removeNotes]);

  const handleNewNote = useCallback(async () => {
    setAutoFocus(true);
    setSidebarFocused(false);
    const id = await newNote();
    if (id) pushHistory(id);
  }, [newNote, pushHistory]);

  const handleEditorFocus = useCallback(() => {
    setSidebarFocused(false);
  }, []);

  const noteContent = selectedNote?.content ?? "";

  const [editorInstance, setEditorInstance] = useState<TiptapEditor | null>(null);

  // Push initial note to history on load
  useEffect(() => {
    if (selectedId && !loading) {
      pushHistory(selectedId);
    }
  }, [loading]);

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
        noteTitle={selectedNote?.title}
        sidebarWidth={sidebarWidth}
        sidebarCollapsed={sidebarCollapsed}
        folders={folders}
        currentFolderId={currentFolderId}
        onSelectFolder={setCurrentFolderId}
        onCreateFolder={handleCreateFolder}
        onDeleteFolder={handleDeleteFolder}
        onUpdateFolderIcon={handleUpdateFolderIcon}
        onNewNote={handleNewNote}
        onToggleSearch={toggleSearch}
        onCloseSearch={closeSearch}
        searchOpen={searchOpen}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div ref={containerRef} style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <NoteList
          notes={displayedNotes}
          selectedId={selectedId}
          selectedIds={selectedIds}
          newNoteId={newNoteId}
          onSelect={handleSelectNote}
          onDelete={removeNote}
          onDeleteSelected={handleDeleteSelected}
          searchQuery={searchQuery}
          sidebarFocused={sidebarFocused}
          onToggleSidebar={toggleSidebar}
          collapsed={sidebarCollapsed}
          style={{ width: sidebarCollapsed ? 0 : sidebarWidth }}
        />

        {/* Sidebar resize handle */}
        <div
          className="sidebar-resize-handle"
          onMouseDown={handleSidebarResize}
          style={{
            opacity: sidebarCollapsed ? 0 : 1,
            pointerEvents: sidebarCollapsed ? "none" : "auto",
            transition: "opacity 0.15s ease",
          }}
        />

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
              gap: "16px",
              userSelect: "none",
              WebkitUserSelect: "none",
            }}>
              {/* Placeholder for illustration — replace src with your chosen cartoon SVG */}
              <img
                src="/Forest-bro.svg"
                alt="No notes"
                style={{
                  width: "min(400px, 50vh)",
                  height: "min(400px, 50vh)",
                  opacity: 0.35,
                  filter: "grayscale(1)",
                  flexShrink: 1,
                }}
              />
              <span style={{ fontSize: "28px", fontWeight: 500, color: "#d8d8d8", marginTop: 24 }}>
                0 notes
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
              onEditorReady={setEditorInstance}
              formatBarVisible={formatBarVisible}
              onToggleFormatBar={toggleFormatBar}
              canGoBack={canGoBack}
              canGoForward={canGoForward}
              goBack={goBack}
              goForward={goForward}
              onEditorFocus={handleEditorFocus}
              selectedNote={selectedNote}
              editorInstance={editorInstance}
            />
          )}
        </main>

        {/* Expand sidebar button — bottom left when collapsed */}
        {sidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            aria-label="Expand sidebar"
            style={{
              position: "absolute",
              bottom: 8,
              left: 12,
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
              zIndex: 10,
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
            <PanelLeftOpen size={16} strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  );
}
