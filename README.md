# Markdown Live Viewer

A Markdown preview for VS Code in the spirit of LaTeX Workshop's PDF viewer: a preview tab beside your editor that refreshes **as you type** (and instantly on save), with a light / dark / auto colour switch, KaTeX math and Mermaid diagrams.

By Lawrence Shin.

## New to Markdown?

Open the **Markdown Guide** from the sidebar (the book button, or “New to Markdown?”). It explains Markdown in plain words, with pictures, for people who have never written code:

- Every lesson shows **what you type** next to **what you see**
- **Copy** and **Insert into my file** buttons on every example
- A list of **common mistakes** and a one-page **cheat sheet**
- A **Try it yourself** box, and a ready-made practice file

## Features

- **Live refresh**: re-renders while you type (150 ms debounce) and immediately on save. The page is updated in place, so it never flickers or loses its scroll position.
- **Themes**: the toolbar button in the top-right of the preview cycles **Auto → Light → Dark**. Auto follows your VS Code theme. The choice is remembered (setting `mdViewer.theme`). You can also click the theme item in the status bar.
- **Mermaid**: ```` ```mermaid ```` blocks render as diagrams. While you edit a diagram, the last good version stays on screen (dimmed) with the parse error underneath, so typing never makes it flash or disappear.
- **Math**: `$inline$` and `$$display$$` with KaTeX.
- **Code highlighting** for all highlight.js languages, matched to the theme.
- **Scroll sync**: the preview follows the editor's scroll position.
- **Double-click to source**: double-click anything in the preview to jump to that line in the editor (like SyncTeX).
- Task lists, tables, footnotes, raw HTML, local images, links between `.md` files.
- The preview follows whichever Markdown file is active, and is restored after a reload.

## Usage

Click the **Markdown Live Viewer icon in the left activity bar** to open the dashboard, then press **Open Preview**. You can also press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>V</kbd> (<kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>V</kbd> on macOS) or click the preview icon in the editor title bar.

To change the shortcut: **File → Preferences → Keyboard Shortcuts**, search `MD Viewer: Open Preview`.

### Sidebar dashboard

- Current file, unsaved-changes dot, and whether the preview is open
- **Open / Show Preview** and **Refresh** buttons
- Theme (Auto / Light / Dark) and font size
- Refresh mode (Typing / Save / Both)
- Switches for scroll sync, math and Mermaid
- Document stats: words, reading time, lines, headings, diagrams, code blocks
- Outline: click a heading to jump to it
- All Markdown files in the workspace, with a filter

Commands (Command Palette, prefix **MD Viewer**):

| Command | |
|---|---|
| Open Preview to the Side | `Ctrl+Shift+Alt+V` |
| Markdown Guide for Beginners | |
| Rescan Markdown Files | |
| Open Settings | |
| Toggle Preview Theme (Light / Dark / Auto) | |
| Refresh Preview | |

## Settings

| Setting | Default | |
|---|---|---|
| `mdViewer.refreshOn` | `both` | `type`, `save` or `both` |
| `mdViewer.typeDelay` | `150` | Debounce (ms) for live refresh |
| `mdViewer.theme` | `auto` | `auto`, `light` or `dark` |
| `mdViewer.scrollSync` | `true` | Preview follows editor scroll |
| `mdViewer.math` | `true` | KaTeX math |
| `mdViewer.mermaid` | `true` | Mermaid diagrams |
| `mdViewer.fontSize` | `15` | Preview font size (px) |
| `mdViewer.customCss` | `""` | Path to an extra stylesheet (absolute or workspace-relative) |

## Install

```bash
code --install-extension md-live-viewer-0.3.0.vsix
```

Or in VS Code: Extensions view → `…` menu → **Install from VSIX…**.

## Development

```bash
npm install
npm run build      # bundle to dist/
npm run watch      # rebuild on change
npm test           # renderer unit tests
npm run package    # produce the .vsix
```

Press <kbd>F5</kbd> in VS Code to launch an Extension Development Host with `examples/demo.md`.

### Layout

```
src/extension.ts     commands, status bar, panel restore
src/dashboard.ts     sidebar dashboard (activity bar view)
src/previewPanel.ts  webview lifecycle, live refresh, sync, links
src/renderer.ts      markdown-it + KaTeX + highlight.js + Mermaid fences, data-line mapping
src/config.ts        settings
media/preview.js     webview: DOM swap, Mermaid cache, theme toggle, scroll sync
media/preview.css    light and dark palettes
media/dashboard.*    sidebar UI
src/guide*.ts        beginner guide panel and its lessons
media/guide.*        guide page and illustrations
```

## License

MIT © 2026 Lawrence Shin
