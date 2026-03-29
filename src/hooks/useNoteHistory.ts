import { useCallback, useRef, useState } from "react";

const MAX_HISTORY = 100;

export function useNoteHistory(setSelectedId: (id: string) => void) {
  const [history, setHistory] = useState<string[]>([]);
  const [cursor, setCursor] = useState(-1);
  const navigatingRef = useRef(false);

  const pushHistory = useCallback((id: string) => {
    if (navigatingRef.current) {
      navigatingRef.current = false;
      return;
    }
    setHistory((prev) => {
      // Trim forward history when navigating to a new note
      const trimmed = prev.slice(0, cursor + 1);
      const next = [...trimmed, id];
      if (next.length > MAX_HISTORY) next.shift();
      return next;
    });
    setCursor((prev) => {
      const newCursor = Math.min(prev + 1, MAX_HISTORY - 1);
      return newCursor;
    });
  }, [cursor]);

  const canGoBack = cursor > 0;
  const canGoForward = cursor < history.length - 1;

  const goBack = useCallback(() => {
    if (cursor <= 0) return;
    navigatingRef.current = true;
    const newCursor = cursor - 1;
    setCursor(newCursor);
    setSelectedId(history[newCursor]);
  }, [cursor, history, setSelectedId]);

  const goForward = useCallback(() => {
    if (cursor >= history.length - 1) return;
    navigatingRef.current = true;
    const newCursor = cursor + 1;
    setCursor(newCursor);
    setSelectedId(history[newCursor]);
  }, [cursor, history, setSelectedId]);

  return { pushHistory, goBack, goForward, canGoBack, canGoForward };
}
