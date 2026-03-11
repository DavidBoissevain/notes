import { useState, useEffect, useCallback } from "react";
import { getAllNotes, createNote, deleteNote, type Note } from "../lib/db";

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllNotes().then((loaded) => {
      setNotes(loaded);
      if (loaded.length > 0) setSelectedId(loaded[0].id);
      setLoading(false);
    });
  }, []);

  const newNote = useCallback(async () => {
    const note = await createNote(`New ${notes.length + 1}`);
    setNotes((prev) => [note, ...prev]);
    setSelectedId(note.id);
  }, [notes.length]);

  const removeNote = useCallback(async (id: string) => {
    await deleteNote(id);
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id);
      if (selectedId === id) setSelectedId(next[0]?.id ?? null);
      return next;
    });
  }, [selectedId]);

  const refreshNote = useCallback((id: string, title: string, content: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, title, content, updated_at: Date.now() } : n))
    );
  }, []);

  const selectedNote = notes.find((n) => n.id === selectedId) ?? null;

  return { notes, selectedNote, selectedId, setSelectedId, newNote, removeNote, refreshNote, loading };
}
