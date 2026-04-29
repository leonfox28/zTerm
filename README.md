# zTerm

A cross-platform terminal emulator and SSH client with a VS Code-like workbench
UI. zTerm aims to stay lightweight and focused while providing a productive
local terminal, SSH sessions, and file workflows.

## Goals

- Provide a high-performance local terminal experience.
- Support SSH connections and SFTP file management.
- Keep the workbench layout and interaction model close to VS Code.
- Preserve a clear extension path for future protocols such as serial and RDP.

## Features

- Local terminal sessions with PTY support (`node-pty`, login shell, `xterm-256color`)
- SSH terminal sessions backed by `ssh2`
- Saved SSH connections with create / edit / delete and folder grouping
- Password / private-key authentication metadata with secure credential storage via Electron `safeStorage`
- Multi-tab terminal workspace with split panes and drag-to-resize
- Electron native context menus for terminal panes, connection items, and Explorer items
- VS Code-like workbench UI:
  - Activity Bar top-level Terminal / Settings page switching
  - Terminal page with connections sidebar + auxiliary Explorer sidebar
  - Settings page with VS Code-like search, TOC, and setting rows
  - SSH connection dialog for create/edit flows
- Unified Explorer file tree for local and SSH-backed providers
- SFTP remote file workflows including directory browsing, upload, download, and details
- Explorer failures surfaced through the Status Bar without replacing the file tree UI
- Built-in settings page for theme, terminal font, shell path, login shell, and copy-on-selection
- Packaged-app update checks backed by GitHub Releases, with user confirmation before download and restart
- Terminal clipboard support with `Cmd+C` / `Cmd+V`, pane context menu copy/paste, and optional copy-on-selection
- Dark+ / Light+ theme switching with persisted startup restore
- Keyboard shortcuts for new terminal, close terminal pane, split panes, tab switching, terminal clipboard, and settings navigation

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop | Electron 39 |
| UI | React 19 + TypeScript |
| Terminal rendering | xterm.js (`@xterm/xterm` v6) |
| Local PTY backend | node-pty |
| SSH / SFTP backend | ssh2 |
| State management | Zustand |
| Persistence | electron-store |
| Secure credentials | Electron `safeStorage` |
| Icons | `@vscode/codicons` |
| Build | electron-vite 5 + Vite 6 + electron-builder |
| Package manager | npm |

## Prerequisites

- Node.js 22 (use [nvm](https://github.com/nvm-sh/nvm): `nvm use 22`)
- npm

## Getting Started

```bash
npm install
npm run dev
```

On first install on macOS, the `node-pty` spawn-helper binary may need execute
permission:

```bash
chmod +x node_modules/node-pty/prebuilds/darwin-arm64/spawn-helper
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start in development mode |
| `npm run build` | Build for production |
| `npm run pack` | Build and create an unpacked app for the current platform |
| `npm run dist` | Build and create distributable artifacts for the current platform |
| `npm run release` | Build and publish release artifacts when `GH_TOKEN` and a release tag are available |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type check without emitting files |
| `npm run format` | Run Prettier over `src/` |

## Releases And Updates

zTerm uses `electron-builder` and `electron-updater` for packaged releases.
Maintainers publish by updating `package.json`, pushing a matching `v*` tag,
and letting the GitHub Actions release workflow upload installers and updater
metadata to GitHub Releases.

Packaged apps check for updates once after launch and Settings exposes a manual
`Updates` category. zTerm asks before downloading an available update and asks
again before restarting to install it.

See [docs/release.md](docs/release.md) for local packaging commands, tag
publishing, end-user update behavior, and signing/notarization secrets.

## Architecture Overview

```text
┌─────────────────────────────────────────────────┐
│                  Main Process                   │
│                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │ PtyService  │  │ StoreService │  │SshService│ │
│  │ (node-pty)  │  │electron-store│  │  (ssh2)  │ │
│  └──────┬──────┘  └──────┬───────┘  └────┬─────┘ │
│         └────────────────┴───────────────┘       │
│                    IPC Bridge                    │
└─────────────────────────┼─────────────────────────┘
                          │ contextBridge
┌─────────────────────────┼─────────────────────────┐
│                Renderer Process                   │
│  ┌──────────────────────┴───────────────────────┐ │
│  │                Zustand Stores                │ │
│  │ workbench / terminal / connections / explorer│ │
│  └──────────────────────┬───────────────────────┘ │
│  ┌──────────────────────┴───────────────────────┐ │
│  │               React Components               │ │
│  │ Workbench / Terminal / Sidebar / Settings    │ │
│  └──────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────┘
```

- Main process owns PTY processes, SSH sessions, SFTP access, native menus, persisted records, and credential handling.
- Renderer communicates through preload bridges such as `terminalApi`, `storeApi`, `connectionsApi`, `sftpApi`, `localFileTreeApi`, `clipboardApi`, `contextMenuApi`, and `updateApi`.
- Shared IPC channels are defined in `src/shared/ipc-channels.ts`.
- SSH terminal launch uses saved `connectionId` records instead of transient form data.
- Context menus follow a VS Code-like renderer/main split: the renderer defines menu state and actions, while the main process transports native Electron menu popup and selection events.

## Workbench Layout

```text
┌────────────────────────────────────────────────────────┐
│                     Title Bar (38px)                   │
├──────┬─────────────┬──────────────────┬────────────────┤
│      │  Sidebar    │   Tab Bar        │                │
│ Act  │ (terminal   ├──────────────────┤  Auxiliary     │
│ ivity│  page only) │                  │  Sidebar       │
│ Bar  │ Connections │  Terminal Area   │  Explorer      │
│(48px)│  + tree     │  (xterm.js)      │                │
│      │             │                  │                │
├──────┴─────────────┴──────────────────┴────────────────┤
│                    Status Bar (22px)                   │
└────────────────────────────────────────────────────────┘
```

- The Activity Bar exposes two top-level pages: Terminal and Settings.
- The terminal workspace stays mounted while switching to Settings, so existing sessions remain alive.
- The terminal page hosts the connections sidebar and auxiliary Explorer sidebar.
- Settings uses its own VS Code-like search, TOC, and setting rows layout.
- SSH create/edit uses a modal dialog instead of a dedicated main-area page.
- Connection tree icons express connection type, not runtime connection state.
- Failed SSH connection attempts surface in the terminal output area.

## Project Structure

```text
src/
├── main/
│   ├── main.ts
│   ├── ipc/
│   │   ├── clipboard.ipc.ts
│   │   ├── connection.ipc.ts
│   │   ├── context-menu.ipc.ts
│   │   ├── local-file-tree.ipc.ts
│   │   ├── sftp.ipc.ts
│   │   ├── store.ipc.ts
│   │   └── terminal.ipc.ts
│   └── services/
│       ├── connection.service.ts
│       ├── local-file-tree.service.ts
│       ├── pty.service.ts
│       ├── sftp.service.ts
│       ├── shell-integration.ts
│       ├── shell-launch.ts
│       ├── ssh.service.ts
│       ├── store.service.ts
│       └── terminal-manager.service.ts
├── preload/
│   └── index.ts
├── renderer/
│   ├── components/
│   │   ├── connections/
│   │   ├── settings/
│   │   ├── sidebar/
│   │   ├── terminal/
│   │   └── workbench/
│   ├── commands/
│   ├── keybindings/
│   ├── stores/
│   ├── styles/
│   └── utils/
└── shared/
    ├── config/
    ├── ipc-channels.ts
    └── types/
```

## Current Status

Phase 1 and 1.5 are complete:

- Workbench shell
- Local PTY terminals
- Multi-tab terminal workspace
- Terminal split panes
- Native context menus
- Settings page
- Theme persistence
- Keyboard shortcuts
- WebGL terminal rendering with fallback
- `electron-store` persistence foundation

Phase 2 is complete:

- Saved SSH connections
- SSH create/edit dialog
- Secure credential storage
- SSH-backed terminal tabs
- Failed SSH attempts shown in the terminal

The current major area is SFTP and richer file workflows:

- Local and SSH-backed Explorer providers are in place.
- Remote file browsing, upload, download, and details are available.
- Explorer failures are shown through the Status Bar while preserving the file tree UI.
- Next focus: transfer queue, drag-and-drop upload, progress, and remote file editing.

## Roadmap

- Next: upload/download queue, drag-and-drop upload, transfer progress, remote file editing.
- Later: multi-window support, richer theme system, session recording/playback, command snippets.
- Future: serial connections, RDP, config sync, plugin/extensibility work.

## Planning And Specs

- `AGENTS.md` is the agent handoff and implementation rules entry point.
- `openspec/specs/` is the source of truth for implemented capability specs.
- `openspec/changes/archive/` stores completed change history.
- `docs/superpowers/` is historical planning background only.
- Source code in `src/` is the final implementation truth.

## Technical Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| VS Code relationship | New implementation with VS Code as reference | Avoid inheriting VS Code's full framework and historical complexity |
| UI stack | React + TypeScript | Efficient for the current scale and component model |
| Terminal stack | xterm.js + node-pty | Mature and proven by VS Code |
| SSH implementation | `ssh2` + saved connection records | Direct fit for the current terminal workspace |
| State management | Zustand | Lightweight and TypeScript-friendly |
| Persistence | electron-store | Enough for settings and connection records |
| Credential security | Electron `safeStorage` | Uses system keychain capabilities |
| Theme system | JS-injected CSS variables | Keeps future theme switching straightforward |
| WebGL rendering | Enabled with fallback | Balances performance and compatibility |
| Service boundary | `ITerminalService` + `TerminalManagerService` | Unifies local PTY and SSH session launch |
| Connection editing | Terminal-page modal | Keeps the workbench navigation model compact |
| Connection icon semantics | Connection type only | Keeps navigation stable and avoids runtime-state churn |
| Context menus | Electron native menus with renderer/main split | Matches VS Code desktop semantics while keeping business logic in renderer |
| Explorer errors | Status Bar | Keeps the file tree visible and retryable |

## References

- VS Code source: `/Users/huyuanzhe/prj-code/vscode`
  - Terminal: `src/vs/workbench/contrib/terminal/`
  - Context menu: `src/vs/platform/contextview/browser/contextMenuService.ts`
  - Sash: `src/vs/base/browser/ui/sash/sash.ts`
  - Workbench layout: `src/vs/workbench/browser/layout.ts`
- xterm.js: <https://xtermjs.org/>
- node-pty: <https://github.com/microsoft/node-pty>
- ssh2: <https://github.com/mscdex/ssh2>
- electron-vite: <https://electron-vite.org/>
