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
| Persistence | electron-store |
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

## Docs

- `docs/handoff.md` — quickest way to resume work in a fresh Claude context
- `docs/project-plan.md` — current roadmap, architecture summary, and technical decisions
- `docs/superpowers/specs/2026-04-12-project-restructure-design.md` — Phase 1.5 design background
- `docs/superpowers/plans/2026-04-12-project-restructure.md` — Phase 1.5 implementation plan record

## Project Structure

```text
eslint.config.js             # ESLint v9 flat config
src/
├── main/                    # Electron main process
│   ├── main.ts              # App entry, BrowserWindow setup, terminal/store IPC registration
│   ├── services/
│   │   ├── pty.service.ts   # PTY process management
│   │   └── store.service.ts # electron-store wrapper
│   └── ipc/
│       ├── terminal.ipc.ts  # Terminal IPC handler registration
│       └── store.ipc.ts     # Store IPC handler registration
├── preload/
│   └── index.ts             # contextBridge: exposes terminalApi and storeApi to renderer
├── renderer/                # React renderer process
│   ├── components/
│   │   ├── workbench/       # Layout: Workbench, TitleBar, ActivityBar, Sidebar, Sash, AuxiliarySidebar, StatusBar
│   │   ├── terminal/        # TerminalTabs, TerminalPanel, TerminalInstance
│   │   └── sidebar/         # ConnectionTree
│   ├── stores/
│   │   ├── workbench.store.ts    # Sidebar visibility/width/activeView
│   │   ├── terminal.store.ts     # Terminal tabs
│   │   └── connections.store.ts  # Saved connections tree + persistence init
│   ├── utils/
│   │   └── theme.ts         # Theme injection helper
│   └── styles/
│       ├── global.css       # Layout CSS variables, codicons import
│       ├── workbench.css    # Workbench grid, activitybar, sidebar, sash, statusbar
│       ├── terminal.css     # Tab bar, terminal panel
│       └── sidebar.css      # Connection tree
└── shared/
    ├── config/
    │   ├── theme.config.ts  # Theme values
    │   ├── layout.config.ts # Layout constants
    │   └── shell.config.ts  # Shell defaults
    ├── ipc-channels.ts      # Terminal and store IPC channel constants
    └── types/
        ├── terminal.ts      # Shared terminal types
        ├── services.ts      # ITerminalService
        └── store.ts         # electron-store schema
```

## Architecture Notes

- Main process owns PTY processes via `PtyService` and persistence via `StoreService`. Renderer communicates through `terminalApi` and `storeApi` (both exposed via contextBridge).
- Renderer injects theme CSS variables before React renders via `applyTheme(darkPlusTheme)`, while `global.css` keeps only layout-sized variables.
- `TerminalInstance` reads terminal colors from shared theme config and enables the xterm WebGL addon with a canvas fallback path.
- `electron-store` currently backs `settings`, `connections`, and `connectionFolders`; the renderer connections store already initializes from persisted folders.
- New terminal: renderer dispatches `CustomEvent('zterm:new-terminal')` → `TerminalPanel` picks it up → calls `terminalApi.create()`.
- Sidebar toggle: clicking an active activity bar icon hides the sidebar; dragging below 120px width also hides it.
- VS Code source at `/Users/huyuanzhe/prj-code/vscode` is used as a reference (not forked).

## Roadmap

- **Phase 1.5 (completed)**: tech debt cleanup, ESLint flat config, config extraction, JS theme injection skeleton, WebGL renderer enablement, `ITerminalService` abstraction, `electron-store` schema/persistence, docs refresh
- **Phase 2**: introduce DI with `inversify`, add `ssh2`-backed `SshService`, build the new connection dialog, wire `safeStorage`, support connection save/edit/delete, reconnect/status handling, and richer sidebar connection management
- **Phase 3**: activate the auxiliary sidebar for SFTP browsing, add upload/download with queue + progress, and integrate Monaco Editor for remote file editing
- **Phase 4**: session recording/playback, command snippets, multi-window support, and richer theme support on top of the Phase 1.5 theme skeleton
- **Future**: serial port, RDP, WebDAV config sync, and a plugin system
