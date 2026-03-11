# Notes App — Working Reference

> Vision, inspiration, and monetization strategy → see [VISION.md](VISION.md)

---

## Tech Stack

| Layer | Choice |
|---|---|
| Desktop shell | Tauri v2 (Rust backend, WebView2 on Windows) |
| UI | React + TypeScript + Tailwind CSS |
| Components | shadcn/ui |
| Editor | TipTap (ProseMirror-based) |
| Database | SQLite via `tauri-plugin-sql` |
| Search | SQLite FTS5 (built-in) |
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

---

## Windows Styling

- `decorations: false` + `transparent: true` + `shadow: false` in tauri.conf.json
- **Inter Variable** — app-wide font (bundled via `@fontsource-variable/inter`)
- Frosted glass via CSS `backdrop-filter: blur(20px)` (not Mica)
- Lucide Icons (not Fluent)
- Custom draggable titlebar via `data-tauri-drag-region`

### Known WebView2 Quirks (already solved)

- **Document overflow / scrollbar**: With `transparent: true`, `html.scrollHeight` is ~16px larger than the viewport due to a WebView2 quirk. Fix: use `position: fixed; inset: 0` on the root app div instead of `height: 100vh`.
- **Native scrollbar blocking resize**: Do NOT use `scrollBarStyle: "fluentOverlay"` — it renders a native scrollbar over resize handles. The `::-webkit-scrollbar` CSS approach is sufficient.
- **Resize permission**: `startResizeDragging` requires `core:window:allow-start-resize-dragging` in `capabilities/default.json`.
- **`backdrop-filter` creates fixed positioning context**: Children with `position: fixed` are positioned relative to the element with `backdrop-filter`, not the viewport.

---

## Core V1 Feature Set

1. Create and edit notes — TipTap rich text editor
2. Note list — sidebar, sorted by last modified
3. Fast full-text search — SQLite FTS5
4. Auto-save — debounced, no save button
5. Fast launch — under 500ms
6. Beautiful Windows-native UI

---

## Project Structure

```
src/
  components/
    Editor/       # TipTap wrapper + extensions
    NoteList/     # Sidebar note list
    TitleBar/     # Custom draggable titlebar
  hooks/
    useNotes.ts
    useSearch.ts
    useAutoSave.ts
  lib/
    db.ts         # SQLite queries
  App.tsx
  main.tsx        # setupPluginListeners() called here (dev only)
src-tauri/
  src/lib.rs      # tauri-plugin-mcp registered here (debug only, TCP port 4000)
  tauri.conf.json
  capabilities/default.json
```

---

## SQLite Schema

```sql
CREATE TABLE notes (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL DEFAULT 'Untitled',
  content    TEXT NOT NULL DEFAULT '{}',  -- TipTap JSON
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE VIRTUAL TABLE notes_fts USING fts5(
  title, content, content=notes, content_rowid=rowid
);
```

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
| shadcn/ui | resolve via name `shadcn` | Component usage |

---

## References

- Tauri v2 docs: https://v2.tauri.app
- TipTap docs: https://tiptap.dev
- tauri-plugin-mcp (Rust): https://github.com/P3GLEG/tauri-plugin-mcp
- tauri-plugin-sql: https://github.com/tauri-apps/tauri-plugin-sql
- SQLite FTS5: https://www.sqlite.org/fts5.html
