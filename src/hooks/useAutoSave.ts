// Debounced auto-save: writes to SQLite after `delay`ms of inactivity, only when isDirty is true.
import { useEffect, useRef } from "react";
import { updateNote } from "../lib/db";

export function useAutoSave(
  id: string | null,
  title: string,
  content: string,
  onSaved: (id: string, title: string, content: string) => void,
  isDirty: React.MutableRefObject<boolean>,
  delay = 500
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!id) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (!isDirty.current) return; // skip if nothing changed since last save
      await updateNote(id, title, content);
      onSaved(id, title, content); // updates notes list in useNotes so sidebar reflects new title/timestamp
    }, delay);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [id, title, content]);
}
