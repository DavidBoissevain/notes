// Debounced auto-save: writes to SQLite after `delay`ms of inactivity, only when isDirty is true.
import { useEffect, useRef } from "react";
import { updateNoteContent } from "../lib/db";

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
      await updateNoteContent(id, content);
      onSaved(id, content);
    }, delay);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [id, content]);
}
