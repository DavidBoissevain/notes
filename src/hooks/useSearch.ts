import { useState, useEffect } from "react";
import { searchNotes, type Note } from "../lib/db";

export function useSearch(query: string) {
  const [results, setResults] = useState<Note[] | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const found = await searchNotes(query.trim());
        setResults(found);
      } catch {
        setResults([]);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  return { results };
}
