# Notes

A fast, beautiful, local-first note-taking app for Windows.

No accounts. No cloud. No tracking. Just your notes, stored locally in SQLite.

## Features

- **Rich text editor** — headings, bold, italic, code blocks with syntax highlighting, tables, task lists, images, links, and more
- **Folders** — organize notes into custom folders with drag-and-drop
- **Trash** — soft delete with one-click restore
- **Search** — instant search per-folder or across all notes
- **Auto-save** — every change saved automatically, flushed on close
- **Dark / Light theme** — one-click toggle
- **Copy as Markdown** — export any note to clipboard
- **Back / Forward navigation** — browse through your note history
- **Keyboard-driven** — Ctrl+N, Ctrl+F, Ctrl+Shift+F, Ctrl+\

## Tech

Built with [Tauri v2](https://v2.tauri.app) (Rust + WebView2), React, TypeScript, [TipTap](https://tiptap.dev), and SQLite. ~5 MB installer, sub-second launch.

## Install

Download the latest installer from [Releases](https://github.com/DavidBoissevain/notes/releases/latest).

> Windows SmartScreen may show a warning since the app is not code-signed. Click **"More info"** then **"Run anyway"**.

## Build from Source

Requires [Node.js](https://nodejs.org/) (20+) and [Rust](https://rustup.rs/).

```bash
npm install
npm run tauri dev       # development
npm run tauri build     # production build
```

## License

[GPL-3.0](LICENSE)
