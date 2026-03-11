import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentWindow, currentMonitor } from "@tauri-apps/api/window";
import { TitleBar } from "./components/TitleBar/TitleBar";
import { NoteList } from "./components/NoteList/NoteList";
import { Editor, FONT_SIZE_DEFAULT } from "./components/Editor/Editor";
import { useNotes } from "./hooks/useNotes";
import { useAutoSave } from "./hooks/useAutoSave";
import { useSearch } from "./hooks/useSearch";
import { FileText } from "lucide-react";

const RESIZE_SIZE = 12;

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
  const [editorContent, setEditorContent] = useState("");
  const [editorTitle, setEditorTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoFocus, setAutoFocus] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [inset, setInset] = useState({ top: 16, right: 16, bottom: 16, left: 16 });

  useEffect(() => {
    const win = getCurrentWindow();
    const EDGE_PX = 16;
    const THRESHOLD = 4;

    async function update() {
      const isMax = await win.isMaximized();
      setMaximized(isMax);
      if (isMax) { setInset({ top: 0, right: 0, bottom: 0, left: 0 }); return; }

      const [pos, size, monitor] = await Promise.all([
        win.outerPosition(),
        win.outerSize(),
        currentMonitor(),
      ]);
      if (!monitor) return;

      const dpr = window.devicePixelRatio || 1;
      const mx = monitor.position.x, my = monitor.position.y;
      const mw = monitor.size.width, mh = monitor.size.height;
      const t = Math.round(THRESHOLD * dpr), e = Math.round(EDGE_PX * dpr);

      setInset({
        top:    pos.y          <= my + t       ? 0 : EDGE_PX,
        left:   pos.x          <= mx + t       ? 0 : EDGE_PX,
        bottom: pos.y + size.height >= my + mh - t ? 0 : EDGE_PX,
        right:  pos.x + size.width  >= mx + mw - t ? 0 : EDGE_PX,
      });
      void e;
    }

    update();
    const unlistenResize = win.onResized(update);
    const unlistenMove   = win.onMoved(update);
    return () => { unlistenResize.then(fn => fn()); unlistenMove.then(fn => fn()); };
  }, []);
  const [fontSize, setFontSize] = useState(() => {
    const stored = localStorage.getItem("editor-font-size");
    return stored ? parseFloat(stored) : FONT_SIZE_DEFAULT;
  });

  useEffect(() => {
    localStorage.setItem("editor-font-size", String(fontSize));
  }, [fontSize]);
  const isDirty = useRef(false);

  const { results: searchResults } = useSearch(searchQuery);
  const displayedNotes = searchResults ?? notes;

  const handleEditorChange = useCallback((content: string, title: string) => {
    isDirty.current = true;
    setEditorContent(content);
    setEditorTitle(title);
  }, []);

  const handleSelectNote = useCallback((id: string) => {
    isDirty.current = false;
    setAutoFocus(false);
    setSelectedId(id);
  }, [setSelectedId]);

  const handleNewNote = useCallback(async () => {
    isDirty.current = false;
    setAutoFocus(true);
    await newNote();
  }, [newNote]);

  useAutoSave(selectedId, editorTitle, editorContent, refreshNote, isDirty);

  const noteContent = selectedNote?.content ?? "";

  return (
    <div
      style={{
        position: "fixed",
        top: inset.top,
        right: inset.right,
        bottom: inset.bottom,
        left: inset.left,
        display: "flex",
        flexDirection: "column",
        borderRadius: (inset.top || inset.left || inset.right || inset.bottom) ? "8px" : 0,
        overflow: "hidden",
        boxShadow: (inset.top || inset.left || inset.right || inset.bottom) ? "0 6.4px 14.4px 0 rgba(0,0,0,0.132), 0 1.2px 3.6px 0 rgba(0,0,0,0.108)" : "none",
      }}
    >
      <ResizeHandles maximized={maximized} />
      <TitleBar maximized={maximized} />

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <NoteList
          notes={displayedNotes}
          selectedId={selectedId}
          onSelect={handleSelectNote}
          onNew={handleNewNote}
          onDelete={removeNote}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
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
              title={selectedNote?.title ?? ""}
              content={noteContent}
              onChange={handleEditorChange}
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
