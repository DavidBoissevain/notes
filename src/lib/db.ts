import Database from "@tauri-apps/plugin-sql";

let _db: Database | null = null;

async function getDb(): Promise<Database> {
  if (!_db) {
    _db = await Database.load("sqlite:notes.db");
    await initSchema(_db);
  }
  return _db;
}

async function initSchema(db: Database) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS notes (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL DEFAULT 'Untitled',
      content    TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
}

export interface Note {
  id: string;
  title: string;
  content: string;
  created_at: number;
  updated_at: number;
}

export async function getAllNotes(): Promise<Note[]> {
  const db = await getDb();
  return db.select<Note[]>(
    "SELECT id, title, content, created_at, updated_at FROM notes ORDER BY updated_at DESC"
  );
}

export async function createNote(title = "Untitled"): Promise<Note> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = Date.now();
  await db.execute(
    "INSERT INTO notes (id, title, content, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)",
    [id, title, "", now, now]
  );
  return { id, title, content: "", created_at: now, updated_at: now };
}

export async function updateNote(id: string, title: string, content: string): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  await db.execute(
    "UPDATE notes SET title = $1, content = $2, updated_at = $3 WHERE id = $4",
    [title, content, now, id]
  );
}

export async function updateNoteContent(id: string, content: string): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  await db.execute(
    "UPDATE notes SET content = $1, updated_at = $2 WHERE id = $3",
    [content, now, id]
  );
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM notes WHERE id = $1", [id]);
}

export async function searchNotes(query: string): Promise<Note[]> {
  const db = await getDb();
  const pattern = `%${query}%`;
  return db.select<Note[]>(
    `SELECT id, title, content, created_at, updated_at FROM notes
     WHERE title LIKE $1 OR content LIKE $1
     ORDER BY updated_at DESC`,
    [pattern]
  );
}
