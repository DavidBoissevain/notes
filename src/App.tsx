import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { TitleBar } from "./components/TitleBar/TitleBar";
import { NoteList } from "./components/NoteList/NoteList";
import { Editor, FONT_SIZE_DEFAULT } from "./components/Editor/Editor";
import { useNotes } from "./hooks/useNotes";
import { useSearch } from "./hooks/useSearch";
import { useNoteHistory } from "./hooks/useNoteHistory";
import { getAllFolders, createFolder, deleteFolder, updateFolderIcon, getFolderNoteCount, moveNoteToFolder, DEFAULT_FOLDER_ID, TRASH_FOLDER_ID, type Folder } from "./lib/db";
import { getStoredTheme, storeTheme, applyTheme, type Theme } from "./lib/theme";
import { showError } from "./lib/toast";
import { flushPendingSave } from "./hooks/useAutoSave";
import { htmlToMarkdown } from "./lib/markdown";
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
  // --- Theme state ---
  const [theme, setTheme] = useState<Theme>(getStoredTheme);
  useEffect(() => { applyTheme(theme); storeTheme(theme); }, [theme]);
  const toggleTheme = useCallback(() => setTheme((t) => t === "light" ? "dark" : "light"), []);

  // --- Icon color ---
  const [iconColor, setIconColor] = useState(() => localStorage.getItem("icon-color") || "#4A6FA5");
  useEffect(() => { localStorage.setItem("icon-color", iconColor); }, [iconColor]);

  // --- Folder state ---
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState(() => {
    return localStorage.getItem("current-folder") || DEFAULT_FOLDER_ID;
  });

  useEffect(() => {
    getAllFolders().then(setFolders).catch(() => showError("Failed to load folders"));
  }, []);

  // Folder name lookup for global search pills
  const folderNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of folders) map.set(f.id, f.name);
    return map;
  }, [folders]);

  useEffect(() => {
    localStorage.setItem("current-folder", currentFolderId);
  }, [currentFolderId]);

  const isTrash = currentFolderId === TRASH_FOLDER_ID;

  const handleCreateFolder = useCallback(async (name: string, icon: string) => {
    try {
      const folder = await createFolder(name, icon);
      setFolders((prev) => [...prev, folder]);
      setCurrentFolderId(folder.id);
    } catch {
      showError("Failed to create folder");
    }
  }, []);

  const handleGetFolderNoteCount = useCallback(async (id: string) => {
    return getFolderNoteCount(id);
  }, []);

  const handleDeleteFolder = useCallback(async (id: string) => {
    try {
      await deleteFolder(id);
      setFolders((prev) => prev.filter((f) => f.id !== id));
      if (currentFolderId === id) setCurrentFolderId(DEFAULT_FOLDER_ID);
    } catch {
      showError("Failed to delete folder");
    }
  }, [currentFolderId]);

  const handleUpdateFolderIcon = useCallback(async (id: string, icon: string) => {
    try {
      await updateFolderIcon(id, icon);
      setFolders((prev) => prev.map((f) => f.id === id ? { ...f, icon } : f));
    } catch {
      showError("Failed to update folder icon");
    }
  }, []);

  const handleMoveNoteToFolder = useCallback(async (noteId: string, folderId: string) => {
    try {
      await moveNoteToFolder(noteId, folderId);
      refreshFolderRef.current?.();
    } catch {
      showError("Failed to move note");
    }
  }, []);

  const { notes, selectedNote, selectedId, setSelectedId, newNote, removeNote, removeNotes, softRemoveNote, softRemoveNotes, restoreNote, refreshNote, refreshNotes, loading, newNoteId } = useNotes(currentFolderId);
  const refreshFolderRef = useRef<(() => void) | null>(null);
  refreshFolderRef.current = refreshNotes;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastClickedIdRef = useRef<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState(false);
  const [autoFocus, setAutoFocus] = useState(false);
  const [maximized, setMaximized] = useState(false);

  // Reset search when switching folders
  useEffect(() => {
    setSearchQuery("");
    setSearchOpen(false);
    setGlobalSearch(false);
  }, [currentFolderId]);

  const toggleSearch = useCallback((global = false) => {
    setSearchOpen((prev) => {
      if (prev && !global) {
        setSearchQuery("");
        setGlobalSearch(false);
        return false;
      }
      setGlobalSearch(global);
      return true;
    });
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery("");
    setGlobalSearch(false);
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

  // Flush unsaved changes before window closes
  useEffect(() => {
    const promise = getCurrentWindow().onCloseRequested(async (event) => {
      event.preventDefault();
      await flushPendingSave();
      getCurrentWindow().destroy();
    });
    return () => { promise.then(fn => fn()); };
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

  // --- Persisted format bar visibility ---
  const [formatBarVisible, setFormatBarVisible] = useState(
    () => localStorage.getItem("format-bar-visible") !== "false",
  );
  useEffect(() => { localStorage.setItem("format-bar-visible", String(formatBarVisible)); }, [formatBarVisible]);
  const toggleFormatBar = useCallback(() => setFormatBarVisible((p) => !p), []);

  // --- Sidebar focused state (two-state selection) ---
  const [sidebarFocused, setSidebarFocused] = useState(false);

  // --- Note history (back/forward) ---
  const { pushHistory } = useNoteHistory(setSelectedId);

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

  const searchFolderId = globalSearch ? undefined : currentFolderId;
  const { results: searchResults } = useSearch(searchQuery, searchFolderId);
  const displayedNotes = useMemo(() => searchResults ?? notes, [searchResults, notes]);

  const handleSelectNote = useCallback((id: string, e?: React.MouseEvent) => {
    setAutoFocus(false);
    setSidebarFocused(true);

    if (e?.ctrlKey || e?.metaKey) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
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

    setSelectedIds(new Set());
    lastClickedIdRef.current = id;

    // Global search: if the note is from a different folder, navigate there
    if (globalSearch) {
      const note = displayedNotes.find((n) => n.id === id);
      if (note && note.folder_id !== currentFolderId) {
        closeSearch();
        // Set selectedId first so useNotes preserves it after folder reload
        setSelectedId(id);
        setCurrentFolderId(note.folder_id);
        pushHistory(id);
        return;
      }
    }

    setSelectedId(id);
    pushHistory(id);
  }, [setSelectedId, pushHistory, selectedId, displayedNotes, globalSearch, currentFolderId, closeSearch]);

  const handleDeleteSelected = useCallback(async (ids: string[]) => {
    if (isTrash) {
      await removeNotes(ids);
    } else {
      await softRemoveNotes(ids);
    }
    setSelectedIds(new Set());
  }, [removeNotes, softRemoveNotes, isTrash]);

  const handleDeleteNote = useCallback(async (id: string) => {
    if (isTrash) {
      await removeNote(id);
    } else {
      await softRemoveNote(id);
    }
  }, [removeNote, softRemoveNote, isTrash]);

  const handleRestoreNote = useCallback(async (id: string) => {
    await restoreNote(id);
  }, [restoreNote]);

  const handleNewNote = useCallback(async () => {
    if (isTrash) return;
    setAutoFocus(true);
    setSidebarFocused(false);
    const id = await newNote();
    if (id) pushHistory(id);
  }, [newNote, pushHistory, isTrash]);

  // --- Keyboard shortcuts: Ctrl+N, Ctrl+F, Ctrl+Shift+F, Ctrl+\, Alt+S ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "\\") { e.preventDefault(); toggleSidebar(); }
      if (e.altKey && e.key === "s") { e.preventDefault(); toggleSidebar(); }

      if (e.ctrlKey && !e.shiftKey && e.key === "n") {
        e.preventDefault();
        if (!isTrash) handleNewNote();
      }

      if (e.ctrlKey && !e.shiftKey && e.key === "f") {
        e.preventDefault();
        toggleSearch(false);
      }

      if (e.ctrlKey && e.shiftKey && e.key === "F") {
        e.preventDefault();
        toggleSearch(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleSidebar, isTrash, handleNewNote, toggleSearch]);

  const handleEditorFocus = useCallback(() => {
    setSidebarFocused(false);
  }, []);

  // Editor typing state — used to fade titlebar settings
  const [editorTyping, setEditorTyping] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleEditorTyping = useCallback(() => {
    setEditorTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => setEditorTyping(false), 1500);
  }, []);

  const handleCopyMarkdown = useCallback(() => {
    if (!selectedNote?.content) return;
    const md = htmlToMarkdown(selectedNote.content);
    navigator.clipboard.writeText(md);
  }, [selectedNote]);

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
        onGetFolderNoteCount={handleGetFolderNoteCount}
        onUpdateFolderIcon={handleUpdateFolderIcon}
        onNewNote={handleNewNote}
        onToggleSearch={toggleSearch}
        onCloseSearch={closeSearch}
        searchOpen={searchOpen}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        globalSearch={globalSearch}
        theme={theme}
        onToggleTheme={toggleTheme}
        onMoveNoteToFolder={handleMoveNoteToFolder}
        isTrash={isTrash}
        editorTyping={editorTyping}
        iconColor={iconColor}
        onIconColorChange={setIconColor}
      />

      <div ref={containerRef} style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <NoteList
          notes={displayedNotes}
          selectedId={selectedId}
          selectedIds={selectedIds}
          newNoteId={newNoteId}
          onSelect={handleSelectNote}
          onDelete={handleDeleteNote}
          onDeleteSelected={handleDeleteSelected}
          onRestore={handleRestoreNote}
          searchQuery={searchQuery}
          sidebarFocused={sidebarFocused}
          onToggleSidebar={toggleSidebar}
          collapsed={sidebarCollapsed}
          style={{ width: sidebarCollapsed ? 0 : sidebarWidth }}
          isTrash={isTrash}
          currentFolderId={currentFolderId}
          globalSearch={globalSearch}
          folderNameMap={folderNameMap}
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
            background: "var(--bg-primary)",
          }}
        >
          {loading ? null : searchResults !== null && searchResults.length === 0 ? (
            <div style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "0px",
              userSelect: "none",
              WebkitUserSelect: "none",
            }}>
              <img
                className="empty-state-img"
                src="/pinguin4.png"
                alt="No results"
                style={{
                  maxWidth: "85%",
                  maxHeight: "70vh",
                  objectFit: "contain",
                  opacity: 0.4,
                  flexShrink: 1,
                }}
              />
              <span style={{ fontSize: "20px", fontWeight: 600, color: "var(--text-secondary)", marginTop: 8 }}>
                No results
              </span>
              <span style={{ fontSize: "13px", fontWeight: 450, color: "var(--text-tertiary)", marginTop: 6 }}>
                Nothing found for &ldquo;{searchQuery}&rdquo;
              </span>
            </div>
          ) : notes.length === 0 ? (
            <div style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "0px",
              userSelect: "none",
              WebkitUserSelect: "none",
            }}>
              <img
                className="empty-state-img"
                src={isTrash ? "/pinguin3.png" : "/pinguin2.png"}
                alt={isTrash ? "Empty trash" : "No notes"}
                style={{
                  maxWidth: "85%",
                  maxHeight: "70vh",
                  objectFit: "contain",
                  opacity: 0.45,
                  flexShrink: 1,
                }}
              />
              <span style={{ fontSize: "20px", fontWeight: 600, color: "var(--text-secondary)", marginTop: 8 }}>
                {isTrash ? "Trash is empty" : "No notes yet"}
              </span>
              {!isTrash && (
                <span style={{ fontSize: "13px", fontWeight: 450, color: "var(--text-tertiary)", marginTop: 6 }}>
                  Press Ctrl+N to create one
                </span>
              )}
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
              onEditorFocus={handleEditorFocus}
              onEditorTyping={handleEditorTyping}
              selectedNote={selectedNote}
              editorInstance={editorInstance}
              readOnly={isTrash}
              onDeleteNote={() => selectedId && handleDeleteNote(selectedId)}
              onCopyMarkdown={handleCopyMarkdown}
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
              color: "var(--text-muted)",
              transition: "background 0.1s, color 0.1s",
              zIndex: 10,
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
            <PanelLeftOpen size={16} strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  );
}
