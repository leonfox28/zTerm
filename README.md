# zTerm

A cross-platform terminal emulator and SSH client with a VS Code-like workbench UI.

## Features (current)

- Local terminal sessions with full PTY support (login shell, xterm-256color)
- Multi-tab interface with tab overflow scrolling
- VS Code Dark+ themed UI: title bar, activity bar, sidebar, status bar
- Resizable sidebar with drag-to-hide (snap-to-close below threshold)
- Connection tree in sidebar (folder grouping, planned SSH support)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop | Electron 39 |
| UI | React 19 + TypeScript |
| Terminal rendering | xterm.js (@xterm/xterm v6) |
| PTY backend | node-pty |
| State management | Zustand |
| Icons | @vscode/codicons |
| Build | electron-vite 5 + Vite 6 |

## Prerequisites

- Node.js 22 (use [nvm](https://github.com/nvm-sh/nvm): `nvm use 22`)
- npm

## Getting Started

```bash
npm install
npm run dev
```

On first install on macOS, the node-pty spawn-helper binary needs execute permission:

```bash
chmod +x node_modules/node-pty/prebuilds/darwin-arm64/spawn-helper
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start in development mode (with HMR) |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier |

## Project Structure

```
src/
├── main/                    # Electron main process
│   ├── main.ts              # App entry, BrowserWindow setup
│   ├── services/
│   │   └── pty.service.ts   # PTY process management
│   └── ipc/
│       └── terminal.ipc.ts  # IPC handler registration
├── preload/
│   └── index.ts             # contextBridge: exposes terminalApi to renderer
├── renderer/                # React renderer process
│   ├── components/
│   │   ├── workbench/       # Layout: Workbench, TitleBar, ActivityBar, Sidebar, Sash, AuxiliarySidebar, StatusBar
│   │   ├── terminal/        # TerminalTabs, TerminalPanel, TerminalInstance
│   │   └── sidebar/         # ConnectionTree
│   ├── stores/
│   │   ├── workbench.store.ts    # Sidebar visibility/width/activeView
│   │   ├── terminal.store.ts     # Terminal tabs
│   │   └── connections.store.ts  # Saved connections tree
│   └── styles/
│       ├── global.css        # CSS variables (VS Code Dark+ palette), codicons import
│       ├── workbench.css     # Workbench grid, activitybar, sidebar, sash, statusbar
│       ├── terminal.css      # Tab bar, terminal panel
│       └── sidebar.css       # Connection tree
└── shared/
    ├── ipc-channels.ts       # IPC channel name constants
    └── types/terminal.ts     # Shared TypeScript interfaces
```

## Architecture Notes

- Main process owns PTY processes via `PtyService`. Renderer communicates through `terminalApi` (exposed via contextBridge).
- New terminal: renderer dispatches `CustomEvent('zterm:new-terminal')` → `TerminalPanel` picks it up → calls `terminalApi.create()`.
- Sidebar toggle: clicking an active activity bar icon hides the sidebar; dragging below 120px width also hides it.
- VS Code source at `/Users/huyuanzhe/prj-code/vscode` is used as a reference (not forked).

## Roadmap

- **Phase 2**: SSH connections (ssh2), connection save/edit/delete
- **Phase 3**: SFTP file browser + Monaco Editor integration
- **Phase 4**: Session recording, snippets, multi-window, themes
- **Future**: Serial port, RDP, plugin system
