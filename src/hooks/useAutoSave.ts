// Debounced auto-save: writes to SQLite after `delay`ms of inactivity, only when isDirty is true.
// Derives title from content on every save (Bear-style: title = first H1 or first text line).
import { useEffect, useRef } from "react";
import { updateNote } from "../lib/db";
import { extractTitle } from "../lib/extractTitle";
import { showError } from "../lib/toast";

// Module-level flush function for the close handler to call
let _flushSave: (() => Promise<void>) | null = null;

export async function flushPendingSave(): Promise<void> {
  if (_flushSave) await _flushSave();
}

export function useAutoSave(
  id: string | null,
  content: string,
  onSaved: (id: string, content: string) => void,
  isDirty: React.MutableRefObject<boolean>,
  delay = 500
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef(content);
  contentRef.current = content;
  const idRef = useRef(id);
  idRef.current = id;

  // Register flush function so close handler can force-save
  _flushSave = async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (isDirty.current && idRef.current) {
      const { title } = extractTitle(contentRef.current);
      try {
        await updateNote(idRef.current, title || "Untitled", contentRef.current);
        isDirty.current = false;
      } catch { /* swallow on close */ }
    }
  };

  useEffect(() => {
    if (!id) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (!isDirty.current) return;
      const { title } = extractTitle(content);
      try {
        await updateNote(id, title || "Untitled", content);
        onSaved(id, content);
      } catch {
        showError("Failed to save note");
      }
    }, delay);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [id, content]);

  // Clear flush function on unmount
  useEffect(() => {
    return () => { _flushSave = null; };
  }, []);
}
