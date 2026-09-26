// Debounced auto-save: writes to SQLite after `delay`ms of inactivity.
// Derives title from content on every save (Bear-style: title = first H1 or first text line).
// A pending save remembers which note it belongs to, so switching notes flushes
// the previous note's edits instead of dropping them.
import { useCallback, useEffect, useRef } from "react";
import { updateNote } from "../lib/db";
import { extractTitle } from "../lib/extractTitle";
import { showError } from "../lib/toast";

type Pending = { id: string; content: string };

// Module-level flush function for the close handler to call
let _flushSave: (() => Promise<void>) | null = null;

export async function flushPendingSave(): Promise<void> {
  if (_flushSave) await _flushSave();
}

export function useAutoSave(
  onSaved: (id: string, content: string) => void,
  delay = 500
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Pending | null>(null);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const p = pending.current;
    pending.current = null;
    if (!p) return;
    const { title } = extractTitle(p.content);
    try {
      await updateNote(p.id, title || "Untitled", p.content);
      onSavedRef.current(p.id, p.content);
    } catch {
      showError("Failed to save note");
    }
  }, []);

  // Call on every edit. Edits to a different note than the pending one save
  // the pending one first.
  const schedule = useCallback((id: string, content: string) => {
    if (pending.current && pending.current.id !== id) flush();
    pending.current = { id, content };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, delay);
  }, [flush, delay]);

  // Register flush for the close handler; save anything pending on unmount
  useEffect(() => {
    _flushSave = flush;
    return () => {
      flush();
      _flushSave = null;
    };
  }, [flush]);

  return { schedule, flush };
}
