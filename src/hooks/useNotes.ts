// Central notes state: loads from SQLite on mount, exposes CRUD + refreshNote for sidebar updates.
import { useState, useEffect, useCallback, useMemo } from "react";
import { getNotesByFolder, createNote, deleteNote, type Note } from "../lib/db";
import { extractTitle } from "../lib/extractTitle";

export function useNotes(folderId: string) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newNoteId, setNewNoteId] = useState<string | null>(null);

  // Reload notes when folder changes
  useEffect(() => {
    setLoading(true);
    getNotesByFolder(folderId).then((loaded) => {
      setNotes(loaded);
      setSelectedId(loaded[0]?.id ?? null);
      setLoading(false);
    });
  }, [folderId]);

  const newNote = useCallback(async () => {
    const note = await createNote("", folderId);
    setNotes((prev) => [note, ...prev]);
    setSelectedId(note.id);
    setNewNoteId(note.id);
    return note.id;
  }, [folderId]);

  // Clear newNoteId after animation completes
  useEffect(() => {
    if (newNoteId) {
      const timer = setTimeout(() => setNewNoteId(null), 400);
      return () => clearTimeout(timer);
    }
  }, [newNoteId]);

  const removeNote = useCallback(async (id: string) => {
    await deleteNote(id);
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id);
      if (selectedId === id) setSelectedId(next[0]?.id ?? null);
      return next;
    });
  }, [selectedId]);

  // Called by Editor after auto-save; derives title from content, updates sidebar, re-sorts by updated_at.
  const refreshNote = useCallback((id: string, content: string) => {
    const { title } = extractTitle(content);
    const now = Date.now();
    setNotes((prev) => {
      const updated = prev.map((n) =>
        n.id === id ? { ...n, title: title || "Untitled", content, updated_at: now } : n
      );
      updated.sort((a, b) => b.updated_at - a.updated_at);
      return updated;
    });
  }, []);

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId]
  );

  return { notes, selectedNote, selectedId, setSelectedId, newNote, removeNote, refreshNote, loading, newNoteId };
}
