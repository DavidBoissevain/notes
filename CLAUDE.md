# Notes App — Working Reference

> Vision, inspiration, and monetization strategy → see [VISION.md](VISION.md)
> Architecture, render model, and code design choices → see [ARCHITECTURE.md](ARCHITECTURE.md)

**For larger requests:** read [ARCHITECTURE.md](ARCHITECTURE.md) first to understand the current design before proposing changes.

**After any significant change:** update [ARCHITECTURE.md](ARCHITECTURE.md) to reflect the new state — component responsibilities, data flow, and any new design decisions.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Desktop shell | Tauri v2 (Rust backend, WebView2 on Windows) |
| UI | React + TypeScript + Tailwind CSS |
| Editor | TipTap (ProseMirror-based) |
| Database | SQLite via `tauri-plugin-sql` |
| Search | SQLite `LIKE` queries (no FTS5) |
| Sync | None in v1 |

---

## UI Style Rules

- **No warm colors** — never use warm/amber/parchment tones in the UI. Keep it cool/neutral.
- **Two-column layout only** — no three-column (no icon nav sidebar).
- Bear is referenced for layout and typography inspiration only, not color palette.

---

## Key Decisions (never revisit without good reason)

- **No custom editor** — TipTap. Problem solved.
- **No sync in v1** — complexity trap.
- **SQLite only** — local first, no servers.
- **Auto-save everything** — debounced 500ms, no save button ever.
- **Memoize aggressively** — sidebar/note list must not re-render while typing.
- **Design is first-class** — reference Bear and Typora constantly.
- **No code signing** — not purchasing a cert for now.
- **Auto-updater deferred** — planned for a later phase (tauri-plugin-updater).

---

## Windows Styling

- `decorations: false` + `transparent: true` + `shadow: true` in tauri.conf.json
- **Segoe UI Variable Display** — system font stack (no bundled font)
- Lucide Icons (not Fluent)
- Custom draggable titlebar via `data-tauri-drag-region`

### Known WebView2 Quirks (already solved)

- **Document overflow / scrollbar**: With `transparent: true`, `html.scrollHeight` is ~16px larger than the viewport due to a WebView2 quirk. Fix: use `position: fixed; inset: 0` on the root app div instead of `height: 100vh`.
- **Native scrollbar blocking resize**: Do NOT use `scrollBarStyle: "fluentOverlay"` — it renders a native scrollbar over resize handles. The `::-webkit-scrollbar` CSS approach is sufficient.
- **Resize permission**: `startResizeDragging` requires `core:window:allow-start-resize-dragging` in `capabilities/default.json`.

---

## Core V1 Feature Set

1. Create and edit notes — TipTap rich text editor
2. Note list — sidebar, sorted by last modified
3. Folders + drag-to-folder
4. Trash (soft delete + restore)
5. Search — LIKE-based, per-folder or global
6. Auto-save — debounced 500ms, flushed on window close
7. Dark/light theme
8. Copy as Markdown
9. Beautiful Windows-native UI

---

## Production Hardening (implemented)

- **Error Boundary** — `src/components/ErrorBoundary.tsx` wraps the app, catches React crashes
- **Error toasts** — `src/lib/toast.ts` + `src/components/Toast.tsx`, error-only (no success toasts)
- **DB error handling** — all operations in `useNotes`, `useAutoSave`, and `App.tsx` are wrapped in try/catch with user-visible error toasts
- **SQLite backup** — Rust `backup_database` command copies `notes.db` → `notes.db.backup` on every launch (before DB connection opens)
- **Close handler** — `onCloseRequested` flushes any pending auto-save before the window closes
- **CSP** — real Content Security Policy set in `tauri.conf.json` (was `null` before)
- **CI/CD** — `.github/workflows/release.yml` builds Windows/macOS/Linux on tag push, creates draft GitHub Release

---

## Project Structure

```
src/
  components/
    Editor/           # TipTap wrapper, toolbar, format bar, table context menu
    NoteList/         # Sidebar note list
    TitleBar/         # Custom draggable titlebar + folder switcher
    ErrorBoundary.tsx # React error boundary
    Toast.tsx         # Error toast notifications
  hooks/
    useNotes.ts       # Notes CRUD + state
    useSearch.ts      # Debounced search
    useAutoSave.ts    # Debounced save + flushPendingSave() for close handler
    useNoteHistory.ts # Back/forward navigation
  lib/
    db.ts             # SQLite queries + backup on init
    toast.ts          # Error pub/sub (no React dependency)
    theme.ts          # Dark/light theme persistence
    markdown.ts       # HTML → Markdown conversion
    extractTitle.ts   # Title extraction from content
    timeAgo.ts        # Relative time formatting
    folderIcons.tsx   # Folder icon components
  App.tsx
  main.tsx            # Entry point — ErrorBoundary + ToastContainer + dev-only MCP
src-tauri/
  src/lib.rs          # Rust: backup_database command + tauri-plugin-mcp (debug only)
  tauri.conf.json
  capabilities/default.json
.github/
  workflows/release.yml  # CI/CD: build + draft release on tag push
```

---

## SQLite Schema

```sql
CREATE TABLE folders (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  icon       TEXT NOT NULL DEFAULT 'folder',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE notes (
  id             TEXT PRIMARY KEY,
  title          TEXT NOT NULL DEFAULT 'Untitled',
  content        TEXT NOT NULL DEFAULT '',
  folder_id      TEXT NOT NULL DEFAULT 'notes',
  prev_folder_id TEXT DEFAULT NULL,   -- for trash restore
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL
);
```

Default folders seeded on init: `notes` (Notes), `todo` (Todo). Trash uses special folder ID `__trash__`.

---

## Dev Tools

### Tauri MCP (live app interaction)
The app has `tauri-plugin-mcp` integrated for dev-only AI interaction.

**Setup:**
- Rust plugin in `src-tauri/src/lib.rs` — TCP on port 4000, debug builds only
- MCP server config in `.mcp.json` — TCP to port 4000
- Frontend in `src/main.tsx` — `setupPluginListeners()` from `tauri-plugin-mcp` npm package, dev-only import

**Available tools:** `take_screenshot`, `execute_js`, `query_page`, `click`, `type_text`, `manage_window`, etc.

**Note:** App must be running (`npm run tauri dev`) for MCP tools to connect.

### Context7 (up-to-date docs)
Use `mcp__plugin_context7_context7__resolve-library-id` then `mcp__plugin_context7_context7__query-docs`.

**Library IDs for this project:**

| Library | Context7 ID | Best for |
|---|---|---|
| Tauri v2 | `/websites/v2_tauri_app` | Config, window, webview API questions |
| Tauri v2 Rust API | `/websites/rs_tauri` | Rust-side plugin/command questions |
| TipTap | resolve via name `tiptap` | Editor extensions, ProseMirror |

---

## References

- Tauri v2 docs: https://v2.tauri.app
- TipTap docs: https://tiptap.dev
- tauri-plugin-mcp (Rust): https://github.com/P3GLEG/tauri-plugin-mcp
- tauri-plugin-sql: https://github.com/tauri-apps/tauri-plugin-sql
