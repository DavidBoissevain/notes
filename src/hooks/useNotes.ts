// Central notes state: loads from SQLite on mount, exposes CRUD + refreshNote for sidebar updates.
import { useState, useEffect, useCallback, useMemo } from "react";
import { getNotesByFolder, createNote, deleteNote, deleteNotes, softDeleteNote as dbSoftDelete, softDeleteNotes as dbSoftDeleteNotes, restoreNote as dbRestoreNote, type Note } from "../lib/db";
import { extractTitle } from "../lib/extractTitle";
import { showError } from "../lib/toast";

export function useNotes(folderId: string) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newNoteId, setNewNoteId] = useState<string | null>(null);

  const loadNotes = useCallback(() => {
    setLoading(true);
    getNotesByFolder(folderId).then((loaded) => {
      setNotes(loaded);
      setSelectedId((prev) => {
        if (prev && loaded.some((n) => n.id === prev)) return prev;
        return loaded[0]?.id ?? null;
      });
      setLoading(false);
    }).catch(() => {
      showError("Failed to load notes");
      setLoading(false);
    });
  }, [folderId]);

  // Reload notes when folder changes
  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const newNote = useCallback(async () => {
    try {
      const note = await createNote("", folderId);
      setNotes((prev) => [note, ...prev]);
      setSelectedId(note.id);
      setNewNoteId(note.id);
      return note.id;
    } catch {
      showError("Failed to create note");
      return null;
    }
  }, [folderId]);

  // Clear newNoteId after animation completes
  useEffect(() => {
    if (newNoteId) {
      const timer = setTimeout(() => setNewNoteId(null), 400);
      return () => clearTimeout(timer);
    }
  }, [newNoteId]);

  // Permanent delete
  const removeNote = useCallback(async (id: string) => {
    try {
      await deleteNote(id);
      setNotes((prev) => {
        const next = prev.filter((n) => n.id !== id);
        if (selectedId === id) setSelectedId(next[0]?.id ?? null);
        return next;
      });
    } catch {
      showError("Failed to delete note");
    }
  }, [selectedId]);

  const removeNotes = useCallback(async (ids: string[]) => {
    try {
      await deleteNotes(ids);
      const idSet = new Set(ids);
      setNotes((prev) => {
        const next = prev.filter((n) => !idSet.has(n.id));
        if (selectedId && idSet.has(selectedId)) setSelectedId(next[0]?.id ?? null);
        return next;
      });
    } catch {
      showError("Failed to delete notes");
    }
  }, [selectedId]);

  // Soft delete (move to trash)
  const softRemoveNote = useCallback(async (id: string) => {
    try {
      await dbSoftDelete(id);
      setNotes((prev) => {
        const next = prev.filter((n) => n.id !== id);
        if (selectedId === id) setSelectedId(next[0]?.id ?? null);
        return next;
      });
    } catch {
      showError("Failed to move note to trash");
    }
  }, [selectedId]);

  const softRemoveNotes = useCallback(async (ids: string[]) => {
    try {
      await dbSoftDeleteNotes(ids);
      const idSet = new Set(ids);
      setNotes((prev) => {
        const next = prev.filter((n) => !idSet.has(n.id));
        if (selectedId && idSet.has(selectedId)) setSelectedId(next[0]?.id ?? null);
        return next;
      });
    } catch {
      showError("Failed to move notes to trash");
    }
  }, [selectedId]);

  // Restore from trash
  const restoreNote = useCallback(async (id: string) => {
    try {
      await dbRestoreNote(id);
      setNotes((prev) => {
        const next = prev.filter((n) => n.id !== id);
        if (selectedId === id) setSelectedId(next[0]?.id ?? null);
        return next;
      });
    } catch {
      showError("Failed to restore note");
    }
  }, [selectedId]);

  // Called by Editor after auto-save
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

  // Full reload from DB
  const refreshNotes = useCallback(() => {
    loadNotes();
  }, [loadNotes]);

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId]
  );

  return { notes, selectedNote, selectedId, setSelectedId, newNote, removeNote, removeNotes, softRemoveNote, softRemoveNotes, restoreNote, refreshNote, refreshNotes, loading, newNoteId };
}
