// Central notes state: loads from SQLite on mount, exposes CRUD + refreshNote for sidebar updates.
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { getAllNotes, createNote, deleteNote, type Note } from "../lib/db";

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const noteCountRef = useRef(0); // stable counter for new note names — avoids notes.length in useCallback dep array

  useEffect(() => {
    getAllNotes().then((loaded) => {
      setNotes(loaded);
      noteCountRef.current = loaded.length;
      if (loaded.length > 0) setSelectedId(loaded[0].id);
      setLoading(false);
    });
  }, []);

  const newNote = useCallback(async () => {
    noteCountRef.current += 1;
    const note = await createNote(`New ${noteCountRef.current}`);
    setNotes((prev) => [note, ...prev]);
    setSelectedId(note.id);
  }, []);

  const removeNote = useCallback(async (id: string) => {
    await deleteNote(id);
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id);
      if (selectedId === id) setSelectedId(next[0]?.id ?? null);
      return next;
    });
  }, [selectedId]);

  // Called by Editor after auto-save; updates the sidebar title and updated_at without a DB round-trip.
  const refreshNote = useCallback((id: string, content: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, content, updated_at: Date.now() } : n))
    );
  }, []);

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId]
  );

  return { notes, selectedNote, selectedId, setSelectedId, newNote, removeNote, refreshNote, loading };
}
