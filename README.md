# zTerm

A cross-platform terminal emulator and SSH client with a VS Code-like workbench UI.

## Features

- Local terminal sessions with PTY support (`node-pty`, login shell, `xterm-256color`)
- SSH terminal sessions backed by `ssh2`
- Saved SSH connections with create / edit / delete and folder grouping
- Password / private-key authentication metadata with secure credential storage via Electron `safeStorage`
- Multi-tab terminal workspace with split panes and drag-to-resize
- Reusable renderer-side context menu host
- VS Code-like workbench UI with:
  - Activity Bar top-level Terminal / Settings page switching
  - Terminal page with connections sidebar + auxiliary remote file sidebar
  - Settings page with VS Code-like search, TOC, and setting rows
  - SSH connection dialog for create/edit flows
- Built-in settings page for theme, terminal font, shell path, and login shell
- Dark+ / Light+ theme switching with persisted startup restore
- Keyboard shortcuts for new terminal, close tab, split panes, tab switching, and settings navigation

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop | Electron 39 |
| UI | React 19 + TypeScript |
| Terminal rendering | xterm.js (`@xterm/xterm` v6) |
| Local PTY backend | node-pty |
| SSH backend | ssh2 |
| State management | Zustand |
| Persistence | electron-store |
| Secure credentials | Electron `safeStorage` |
| Icons | `@vscode/codicons` |
| Build | electron-vite 5 + Vite 6 |

## Prerequisites

- Node.js 22 (use [nvm](https://github.com/nvm-sh/nvm): `nvm use 22`)
- npm

## Getting Started

```bash
npm install
npm run dev
```

On first install on macOS, the `node-pty` spawn-helper binary needs execute permission:

```bash
chmod +x node_modules/node-pty/prebuilds/darwin-arm64/spawn-helper
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start in development mode |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier |

## Docs

- `docs/handoff.md` — 新上下文继续工作的首要入口
- `openspec/specs/` — 当前已落地能力的主规范来源
- `openspec/changes/archive/` — 已完成 change 的历史记录
- `docs/project-plan.md` — 当前 roadmap、架构摘要与阶段状态
- `docs/superpowers/` — 历史规划记录，仅作迁移背景参考

## Project Structure

```text
src/
├── main/
│   ├── main.ts
│   ├── ipc/
│   │   ├── connection.ipc.ts
│   │   ├── sftp.ipc.ts
│   │   ├── store.ipc.ts
│   │   └── terminal.ipc.ts
│   └── services/
│       ├── connection.service.ts
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
│   │   ├── context-menu/
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
        ├── sftp.ts
        └── ...
```

## Architecture Notes

- Main process owns PTY processes, SSH sessions, and persisted connection records.
- Renderer communicates through `terminalApi`, `storeApi`, `connectionsApi`, and `sftpApi` exposed from preload.
- SSH connections are persisted as records; terminal launch uses saved `connectionId` instead of transient form data.
- The Activity Bar provides the two top-level workbench pages: Terminal and Settings.
- The terminal workspace stays mounted while switching to the settings page, so existing sessions remain alive.
- The terminal page hosts the connections sidebar and auxiliary remote file sidebar; the settings page uses its own internal TOC + content layout.
- SSH create/edit uses a modal dialog instead of a dedicated main-area page.
- Connection tree icons express connection type, not runtime connection state.
- Failed SSH connection attempts surface in the terminal output area instead of mutating sidebar state.
- VS Code source at `/Users/huyuanzhe/prj-code/vscode` remains the primary local UI reference.

## Current Phase Status

- **Phase 1 / 1.5 complete**
  - Workbench shell
  - Local PTY terminals
  - Split panes
  - Shared context menu
  - Settings page
  - Theme persistence
  - Keyboard shortcuts
- **Phase 2 complete (SSH connection management)**
  - Saved SSH connections
  - SSH create/edit dialog
  - Secure credential storage
  - SSH-backed terminal tabs
- **Current major phase**
  - SFTP / remote file workflows in the auxiliary sidebar are in place
  - Next focus is richer remote workflows and future protocol support (serial, RDP, etc.)

## Roadmap

- **Next**: upload/download queue, drag-and-drop upload, remote file editing
- **Later**: multi-window support, richer theme system, session recording/playback, command snippets
- **Future**: serial connections, RDP, config sync, plugin/extensibility work
