# Architecture & Code Design

> Keep this file up to date after any significant change to component responsibilities, data flow, or design decisions.

---

## Render Model

The core principle: **typing must never cause App or NoteList to re-render.**

| Component | Re-renders when… |
|---|---|
| `Editor` | Every keystroke (owns its own state — expected) |
| `NoteList` | After auto-save fires (500ms debounce), when notes array changes |
| `NoteItem` | Only when that specific note's data changes (memo + per-item key) |
| `App` | Window resize/move, note selection change, search query change |

---

## State Ownership

```
App
├── layout/window state: inset, maximized
├── ui state: searchQuery, autoFocus, fontSize
└── delegates everything else ↓

useNotes (hook)
├── notes[]         — full list, loaded from SQLite on mount
├── selectedId      — which note is active
└── selectedNote    — useMemo derived from notes + selectedId

Editor (component)
├── titleValue      — controlled input state
├── bodyContent     — mirrors TipTap HTML; drives useAutoSave dep array
├── titleRef        — read inside TipTap onUpdate closure (avoids stale capture)
├── bodyRef         — read inside title onChange (avoids stale capture)
├── isDirty ref     — gate: skips DB write if nothing changed
└── calls useAutoSave internally
```

**Why Editor owns its state:** If `editorContent`/`editorTitle` lived in App (previous design), every keystroke would call `setEditorContent` → App re-renders → NoteList re-renders. Moving state into Editor breaks that chain entirely.

---

## Data Flow

### Typing in editor
```
keystroke
  → TipTap onUpdate
  → bodyRef.current = html  (sync, no re-render)
  → isDirty.current = true  (sync, no re-render)
  → setBodyContent(html)    (Editor re-renders only)
  → useAutoSave resets 500ms timer
```

### Auto-save fires (after 500ms idle)
```
timer expires
  → isDirty.current check (skip if false)
  → updateNote() → SQLite write
  → onSaved(id, title, content)
  → refreshNote() in useNotes
  → notes[] state update → App re-renders
  → NoteList re-renders (memo still skips unchanged NoteItems)
  → only the saved NoteItem re-renders (title/updated_at changed)
```

### Switching notes
```
click in NoteList
  → onSelect(id) → setSelectedId() in useNotes
  → selectedNote changes → App re-renders
  → Editor receives new noteId prop
  → noteId !== lastNoteId.current → resets all Editor state
  → isDirty.current = false (prevents saving previous note's stale content)
  → setContent(..., { emitUpdate: false }) (no dirty flag set on load)
```

---

## Memoization Strategy

| Thing | How | Why |
|---|---|---|
| `NoteList` | `memo()` | Stable props while typing — skips all sidebar work |
| `NoteItem` | `memo()` | Only the changed note re-renders after save |
| `NoteItem.preview` | `useMemo` on `note.content` | stripHtml creates a DOM node — skip if content unchanged |
| `displayedNotes` | `useMemo` on `[searchResults, notes]` | Stable array ref so NoteList memo isn't broken |
| `handleContextMenu` | `useMemo` with `[]` deps | Stable ref so NoteItem memo isn't broken |
| `handleSelectNote` | `useCallback` | Stable ref passed to NoteList |
| `handleNewNote` | `useCallback` | Stable ref passed to NoteList |
| `newNote` | `useCallback` with `[]` deps | Uses `noteCountRef` instead of `notes.length` to avoid dep churn |
| `refreshNote` | `useCallback` with `[]` deps | Uses setState updater form — no external deps needed |
| `selectedNote` | `useMemo` on `[notes, selectedId]` | Avoids `.find()` on every hook call |

---

## Key Design Decisions

- **Editor owns its state** — the biggest perf win. Never lift editor content back to App.
- **`isDirty` ref gate** — prevents a save on every note switch (content is loaded, not typed).
- **`{ emitUpdate: false }` on setContent** — TipTap v3 API; suppresses `onUpdate` when loading a note so `isDirty` stays false.
- **`refreshNote` updates in-memory only** — no DB re-fetch after save. Editor already has the truth; we just sync title + `updated_at` into the notes array for the sidebar.
- **`noteCountRef`** — tracks how many notes have been created to name them "New 1", "New 2", etc. without putting `notes.length` in a `useCallback` dep array (which would invalidate `handleNewNote` on every note change).
