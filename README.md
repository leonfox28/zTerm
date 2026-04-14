# zTerm

A cross-platform terminal emulator and SSH client with a VS Code-like workbench UI.

## Features (current)

- Local terminal sessions with full PTY support (login shell, xterm-256color)
- Multi-tab interface with tab overflow scrolling
- Terminal split panes (horizontal / vertical) with drag-to-resize
- Reusable context menu system (shared renderer-side host, terminal pane as first consumer)
- VS Code-like workbench UI with terminal page and full-page settings view
- Built-in settings page for theme, terminal font, shell path, and login shell
- Dark+ / Light+ theme switching with persisted startup restore
- Live font updates for running terminals; shell launch settings apply to newly created terminals only
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

- `docs/handoff.md` — 新上下文继续工作的首要入口
- `openspec/changes/migrate-superpowers-to-openspec/` — 当前实现与后续协作的主规范来源
- `docs/project-plan.md` — 当前 roadmap、架构摘要与技术决策
- `docs/superpowers/` — 历史规划记录，仅作迁移背景参考，不再作为新实现的主规范

## Project Structure

```text
eslint.config.js             # ESLint v9 flat config
src/
├── main/                    # Electron main process
│   ├── main.ts              # App entry, BrowserWindow setup, terminal/store IPC registration
│   ├── services/
│   │   ├── pty.service.ts   # PTY process management
│   │   ├── shell-launch.ts  # Shell path/login shell resolution helper
│   │   └── store.service.ts # electron-store wrapper
│   └── ipc/
│       ├── terminal.ipc.ts  # Terminal IPC handler registration
│       └── store.ipc.ts     # Store IPC handler registration
├── preload/
│   └── index.ts             # contextBridge: exposes terminalApi and storeApi to renderer
├── renderer/                # React renderer process
│   ├── components/
│   │   ├── workbench/       # Workbench, MainArea, TerminalWorkspace, ActivityBar, Sidebar, Sash, AuxiliarySidebar, StatusBar
│   │   ├── terminal/        # TerminalTabs, TerminalPanel, TerminalPaneTree, TerminalSplitSash, TerminalInstance
│   │   ├── settings/        # SettingsView
│   │   ├── context-menu/    # ContextMenuHost (shared reusable context menu)
│   │   └── sidebar/         # ConnectionTree
│   ├── stores/
│   │   ├── workbench.store.ts    # Sidebar visibility/width + terminal/settings main view switching
│   │   ├── terminal.store.ts     # Terminal tabs, pane tree, split state
│   │   ├── settings.store.ts     # Persisted settings hydration and runtime updates
│   │   ├── context-menu.store.ts # Shared context menu state
│   │   └── connections.store.ts  # Saved connections tree + persistence init
│   ├── utils/
│   │   └── theme.ts         # Theme injection helper
│   └── styles/
│       ├── global.css       # Layout CSS variables, codicons import
│       ├── workbench.css    # Workbench grid, activitybar, sidebar, sash, statusbar
│       ├── terminal.css     # Tab bar, terminal panel, pane tree, split sash
│       ├── settings.css     # Settings page styles
│       ├── context-menu.css # Shared context menu (uses menu theme tokens)
│       └── sidebar.css      # Connection tree
└── shared/
    ├── config/
    │   ├── theme.config.ts  # Theme values (includes menu tokens)
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
- Renderer restores the persisted theme before React renders via `applyTheme(getThemeById(savedTheme))`, while `global.css` keeps only layout-sized variables.
- `settings.store.ts` hydrates persisted settings, applies theme changes immediately, and updates running terminal font settings without recreating sessions.
- `TerminalInstance` reads terminal colors from shared theme config, enables the xterm WebGL addon with a canvas fallback path, and applies shell launch settings only to newly created PTYs.
- `electron-store` currently backs `settings`, `connections`, and `connectionFolders`; renderer settings and connections stores both initialize from persisted data.
- New terminal: renderer dispatches `CustomEvent('zterm:new-terminal')` → `TerminalPanel` picks it up → calls `terminalApi.create()`.
- Terminal split panes use a tree model (`TerminalLeafPane` / `TerminalSplitPane`) with percentage-based absolute positioning.
- Shared context menu: `ContextMenuHost` mounted at workbench level; consumers call `openContextMenu({ anchor, items })` from their `onContextMenu` handler.
- Sidebar toggle: clicking an active activity bar icon hides the sidebar; dragging below 120px width also hides it.
- VS Code source at `/Users/huyuanzhe/prj-code/vscode` is used as a reference (not forked). All UI implementations should reference VS Code's corresponding modules.

## Roadmap

- **Phase 1.5 (completed)**: tech debt cleanup, ESLint flat config, config extraction, JS theme injection skeleton, WebGL renderer enablement, `ITerminalService` abstraction, `electron-store` schema/persistence, docs refresh
- **Phase 1 ongoing**: terminal split panes (done), shared reusable context menu (done), context menu visual alignment with VS Code (done), settings page (done), keybindings
- **Phase 2**: introduce DI with `inversify`, add `ssh2`-backed `SshService`, build the new connection dialog, wire `safeStorage`, support connection save/edit/delete, reconnect/status handling, and richer sidebar connection management
- **Phase 3**: activate the auxiliary sidebar for SFTP browsing, add upload/download with queue + progress, and integrate Monaco Editor for remote file editing
- **Phase 4**: session recording/playback, command snippets, multi-window support, and richer theme support on top of the Phase 1.5 theme skeleton
- **Future**: serial port, RDP, WebDAV config sync, and a plugin system
