# Notes App — Vision & Soul

## Goal
Build a **Windows-first** desktop note-taking app that is lightning fast and visually beautiful — filling a gap that currently exists on Windows specifically. No existing Windows app combines Notepad++-level launch speed with Bear-level design quality.

The target user is a Windows power user who currently uses Notepad++ for quick notes but needs better organization and search.

---

## Background & Inspiration

The developer currently uses **Notepad++** for quick notes. Key things to preserve:
- Launches near-instantly
- Typing feels native and snappy
- Zero friction to get a note open

### Apps to Study
- **Bear** (Mac) — gold standard for beautiful + fast, study its typography and whitespace
- **Notesnook** — good reference for modern UI (built with React + React Native)
- **Simplenote** — closest to the speed goal, very clean
- **Typora** — beautiful markdown experience

---

## Platform Decision: Windows-First

Building for Windows only in v1. Mac users already have Bear. This gap is on Windows.

- One WebView engine — WebView2 (Chromium-based)
- One build target — no Mac/Linux CI matrix
- Windows 11 native design language for free
- Target: Windows power users who use Notepad++ daily

---

## What Makes This Different

No note app currently combines all of these on Windows:
- Sub-second launch time
- Genuinely beautiful, Windows-native UI (Segoe UI, frosted glass)
- Good full-text search
- Local-first, no account required
- Great writing experience

---

## Speed Expectations (Honest)

This stack will **not** match Notepad++'s raw speed (~100ms launch, ~1ms keystroke). That's a pure Win32/C++ binary ceiling.

This app targets:
- Launch in **~300–500ms** — perceptually instant
- **~10ms keystroke latency** — feels instant
- Dramatically faster than Electron apps (Notion: 2–5s)

Speed maximized by: window shell before React loads, debounced auto-save, memoized sidebar, optimistic UI.

---

## Open Source & Monetization

- Ship open source from day one — builds trust for a personal data app
- License: GPL or Business Source License
- Future paid feature: Sync (proven model: Obsidian, Bear, Standard Notes)
- Validate first — 500+ GitHub stars before deciding what to charge for
