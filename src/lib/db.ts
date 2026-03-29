import Database from "@tauri-apps/plugin-sql";

let _db: Database | null = null;

async function getDb(): Promise<Database> {
  if (!_db) {
    _db = await Database.load("sqlite:notes.db");
    await initSchema(_db);
  }
  return _db;
}

// Well-known default folder IDs
export const DEFAULT_FOLDER_ID = "notes";
export const TODO_FOLDER_ID = "todo";

async function initSchema(db: Database) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS folders (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      icon       TEXT NOT NULL DEFAULT 'folder',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS notes (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL DEFAULT 'Untitled',
      content    TEXT NOT NULL DEFAULT '',
      folder_id  TEXT NOT NULL DEFAULT 'notes',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // Add folder_id column to existing notes tables that lack it
  try {
    await db.execute(`ALTER TABLE notes ADD COLUMN folder_id TEXT DEFAULT 'notes'`);
  } catch {
    // Column already exists — ignore
  }
  // Backfill any nulls to the default folder
  await db.execute(`UPDATE notes SET folder_id = 'notes' WHERE folder_id IS NULL`);

  // Add icon column to existing folders tables that lack it
  try {
    await db.execute(`ALTER TABLE folders ADD COLUMN icon TEXT DEFAULT 'folder'`);
  } catch {
    // Column already exists — ignore
  }
  await db.execute(`UPDATE folders SET icon = 'folder' WHERE icon IS NULL`);

  // Seed default folders
  const now = Date.now();
  await db.execute(
    `INSERT OR IGNORE INTO folders (id, name, icon, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)`,
    [DEFAULT_FOLDER_ID, "Notes", "note", now, now]
  );
  await db.execute(
    `INSERT OR IGNORE INTO folders (id, name, icon, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)`,
    [TODO_FOLDER_ID, "Todo", "todo", now, now]
  );
}

export interface Folder {
  id: string;
  name: string;
  icon: string;
  created_at: number;
  updated_at: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  folder_id: string;
  created_at: number;
  updated_at: number;
}

// ── Folder operations ──

export async function getAllFolders(): Promise<Folder[]> {
  const db = await getDb();
  return db.select<Folder[]>(
    "SELECT id, name, icon, created_at, updated_at FROM folders ORDER BY created_at ASC"
  );
}

export async function createFolder(name: string, icon = "folder"): Promise<Folder> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = Date.now();
  await db.execute(
    "INSERT INTO folders (id, name, icon, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)",
    [id, name, icon, now, now]
  );
  return { id, name, icon, created_at: now, updated_at: now };
}

export async function renameFolder(id: string, name: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE folders SET name = $1, updated_at = $2 WHERE id = $3", [name, Date.now(), id]);
}

export async function updateFolderIcon(id: string, icon: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE folders SET icon = $1, updated_at = $2 WHERE id = $3", [icon, Date.now(), id]);
}

export async function deleteFolder(id: string): Promise<void> {
  const db = await getDb();
  // Move notes in this folder to default "Notes" folder
  await db.execute("UPDATE notes SET folder_id = $1 WHERE folder_id = $2", [DEFAULT_FOLDER_ID, id]);
  await db.execute("DELETE FROM folders WHERE id = $1", [id]);
}

// ── Note operations ──

export async function getNotesByFolder(folderId: string): Promise<Note[]> {
  const db = await getDb();
  return db.select<Note[]>(
    "SELECT id, title, content, folder_id, created_at, updated_at FROM notes WHERE folder_id = $1 ORDER BY updated_at DESC",
    [folderId]
  );
}

export async function getAllNotes(): Promise<Note[]> {
  const db = await getDb();
  return db.select<Note[]>(
    "SELECT id, title, content, folder_id, created_at, updated_at FROM notes ORDER BY updated_at DESC"
  );
}

export async function createNote(title = "Untitled", folderId = DEFAULT_FOLDER_ID): Promise<Note> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = Date.now();
  await db.execute(
    "INSERT INTO notes (id, title, content, folder_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)",
    [id, title, "", folderId, now, now]
  );
  return { id, title, content: "", folder_id: folderId, created_at: now, updated_at: now };
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

export async function deleteNotes(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
  await db.execute(`DELETE FROM notes WHERE id IN (${placeholders})`, ids);
}

export async function searchNotes(query: string, folderId?: string): Promise<Note[]> {
  const db = await getDb();
  const pattern = `%${query}%`;
  if (folderId) {
    return db.select<Note[]>(
      `SELECT id, title, content, folder_id, created_at, updated_at FROM notes
       WHERE folder_id = $1 AND (title LIKE $2 OR content LIKE $2)
       ORDER BY updated_at DESC`,
      [folderId, pattern]
    );
  }
  return db.select<Note[]>(
    `SELECT id, title, content, folder_id, created_at, updated_at FROM notes
     WHERE title LIKE $1 OR content LIKE $1
     ORDER BY updated_at DESC`,
    [pattern]
  );
}
