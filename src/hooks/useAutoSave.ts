// Debounced auto-save: writes to SQLite after `delay`ms of inactivity, only when isDirty is true.
// Derives title from content on every save (Bear-style: title = first H1 or first text line).
import { useEffect, useRef } from "react";
import { updateNote } from "../lib/db";
import { extractTitle } from "../lib/extractTitle";

export function useAutoSave(
  id: string | null,
  content: string,
  onSaved: (id: string, content: string) => void,
  isDirty: React.MutableRefObject<boolean>,
  delay = 500
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!id) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (!isDirty.current) return;
      const { title } = extractTitle(content);
      await updateNote(id, title || "Untitled", content);
      onSaved(id, content);
    }, delay);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [id, content]);
}
