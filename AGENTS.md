# zTerm Agent Instructions

Project-specific instructions for `/Users/huyuanzhe/prj-code/zTerm`. General
Codex behavior lives in `~/.codex/AGENTS.md`.

## Start Here

- This file is the primary handoff entry for new agent contexts.
- Use `README.md` for the human-readable project overview, architecture summary, status, and roadmap.
- Treat `openspec/specs/` as the source of truth for implemented capability specs.
- Use `openspec/changes/archive/` only as historical context for completed changes.
- Treat `docs/superpowers/` as migration background, not the active planning source.
- Source code in `src/` is the final truth when docs and implementation disagree.
- User-facing replies should be in Chinese unless the user asks otherwise.

## Project Snapshot

zTerm is a cross-platform terminal emulator and SSH client with a VS Code-like
workbench UI.

- Desktop: Electron 39
- UI: React 19 + TypeScript
- Build: electron-vite 5 + Vite 6
- Terminal rendering: xterm.js
- Local PTY backend: node-pty
- SSH/SFTP backend: ssh2
- State management: Zustand
- Persistence: electron-store and Electron `safeStorage`
- Icons: `@vscode/codicons`
- Package manager: npm

## Current State

Completed major capabilities:

- Workbench shell with Activity Bar, Sidebar, terminal main area, auxiliary Explorer sidebar, and Status Bar.
- Local PTY terminals, multi-tab terminal workspace, split panes, resize, focus, and close flows.
- Electron native context menus for terminal panes, connection items, and Explorer items.
- Settings page with VS Code-like search, TOC, setting rows, theme persistence, terminal font, shell path, login shell, and copy-on-selection.
- Keyboard shortcuts for terminal creation, pane close, splitting, tab switching, clipboard, and settings navigation.
- SSH connection save / edit / delete, folder grouping, SSH-backed terminal sessions, and terminal-surfaced connection failures.
- Secure credential storage through Electron `safeStorage`.
- Unified local/SSH Explorer file tree with parent navigation, refresh, terminal cwd synchronization, upload, download, and details.
- Explorer failures surface through the Status Bar instead of replacing the file tree.

Current focus:

- Richer SFTP and remote file workflows.
- Upload/download queue, drag-and-drop upload, and transfer progress.
- Remote file editing, likely with Monaco Editor.
- Future protocol expansion such as serial and RDP.

## Development Commands

- Install dependencies: `npm install`
- Start dev app: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Format source: `npm run format`

Use npm for this project.

## Verification

- Prefer `npm run lint` and `npm run typecheck` after TypeScript, React, IPC, preload, or service changes.
- Use `npm run build` when changes affect Electron/Vite config, preload/main bundling, packaging behavior, or cross-process imports.
- Electron GUI behavior is usually verified manually by the user with `npm run dev`; mention when manual verification is still needed.
- Known non-blocking issue: `[MODULE_TYPELESS_PACKAGE_JSON]` can appear because `eslint.config.js` uses ESM syntax while `package.json` does not declare `"type": "module"`.

Previously verified baseline:

- `npm run lint`
- `npm run typecheck`
- Manual app checks for local terminals, split panes, Settings, SSH connection flows, local/remote Explorer, file tree refresh/navigation, upload/download/details, cwd following, and Status Bar Explorer errors.

## Architecture Boundaries

- Main process owns PTY processes, SSH sessions, SFTP access, credential handling, native menus, and persistent records.
- Renderer state lives in Zustand stores under `src/renderer/stores/`.
- Renderer communicates with main through preload bridges in `src/preload/index.ts`.
- Shared IPC channels and cross-process types belong under `src/shared/`.
- Keep terminal/session concerns separate from workbench layout concerns.
- Keep connection persistence and credential storage in main-process services; do not expose secrets directly to renderer state.

## Key Files

Main process:

- `src/main/main.ts` registers the BrowserWindow and IPC modules.
- `src/main/services/pty.service.ts` manages local PTY sessions.
- `src/main/services/local-shell-integration.ts` injects local shell cwd reporting.
- `src/main/services/local-file-tree.service.ts` reads local file tree directories.
- `src/main/services/ssh.service.ts` manages SSH sessions and remote shell cwd reporting.
- `src/main/services/sftp.service.ts` handles SFTP directory reads, uploads, downloads, and details.
- `src/main/services/terminal-manager.service.ts` unifies local and SSH terminal launch.
- `src/main/services/connection.service.ts` manages connection records and credential handling.
- `src/main/services/store.service.ts` wraps electron-store.
- `src/main/ipc/*.ipc.ts` exposes terminal, connection, store, SFTP, local file tree, clipboard, and context menu IPC.

Preload:

- `src/preload/index.ts` exposes `terminalApi`, `storeApi`, `connectionsApi`, `sftpApi`, `localFileTreeApi`, `clipboardApi`, and `contextMenuApi`.

Renderer:

- `src/renderer/components/workbench/` contains Workbench, ActivityBar, Sidebar, MainArea, StatusBar, TitleBar, and AuxiliarySidebar.
- `src/renderer/components/terminal/` contains TerminalTabs, TerminalPanel, TerminalPaneTree, TerminalInstance, and split sash UI.
- `src/renderer/components/settings/SettingsView.tsx` owns the Settings page.
- `src/renderer/components/connections/SshConnectionView.tsx` owns the SSH connection dialog.
- `src/renderer/components/sidebar/ConnectionTree.tsx` owns the connection tree.
- `src/renderer/components/sidebar/FileTree.tsx` owns the unified Explorer file tree.
- `src/renderer/stores/workbench.store.ts` owns page, sidebar, dialog, and Status Bar state.
- `src/renderer/stores/terminal.store.ts` owns tabs, panes, sessions, and cwd cache.
- `src/renderer/stores/settings.store.ts` owns settings initialization, persistence, and theme application.
- `src/renderer/stores/connections.store.ts` owns saved connections and folders.
- `src/renderer/stores/explorer.store.ts` owns Explorer cache, expansion state, provider routing, and Status Bar error synchronization.
- `src/renderer/utils/context-menu.ts` serializes renderer menu state and dispatches callbacks.
- `src/renderer/keybindings/useWorkbenchKeybindings.ts` is the keyboard shortcut entry point.

Shared:

- `src/shared/ipc-channels.ts` defines IPC channel names.
- `src/shared/config/theme.config.ts` defines themes.
- `src/shared/config/layout.config.ts` defines layout constants.
- `src/shared/config/shell.config.ts` defines shell defaults.
- `src/shared/types/` contains cross-process types.

## UI Rules

- Keep UI behavior and visual details close to VS Code while using zTerm's React, Zustand, and CSS variable architecture.
- Use local VS Code source at `/Users/huyuanzhe/prj-code/vscode` as the primary UI reference.
- Use `@vscode/codicons` for VS Code-style icons when suitable.
- Preserve the current workbench model: Activity Bar, connections sidebar, terminal main area, auxiliary Explorer sidebar, Status Bar, and Settings page.
- Avoid marketing-style layouts or decorative UI that does not match a workbench product surface.
- SSH create/edit belongs in a terminal-page modal, not a separate top-level page.
- Connection tree icons express connection type, not runtime connection state.
- Failed SSH connection attempts should surface in the terminal output, not mutate sidebar state.
- Explorer read or transfer failures should surface in the Status Bar while keeping the file tree visible and usable.

Useful VS Code reference paths:

- Terminal: `/Users/huyuanzhe/prj-code/vscode/src/vs/workbench/contrib/terminal/browser/`
- Context menu: `/Users/huyuanzhe/prj-code/vscode/src/vs/platform/contextview/browser/contextMenuService.ts`
- Sash/layout UI: `/Users/huyuanzhe/prj-code/vscode/src/vs/base/browser/ui/sash/sash.ts`
- Workbench layout: `/Users/huyuanzhe/prj-code/vscode/src/vs/workbench/browser/layout.ts`

## OpenSpec Workflow

- For new planned capabilities, prefer creating or updating an OpenSpec change before implementation when the behavior is non-trivial.
- Before implementing an existing capability area, read the relevant spec under `openspec/specs/`.
- Archived changes are background only; do not treat archived tasks as current TODOs unless the user explicitly revives them.

## Git Rules

- Non-trivial changes should be made on a separate branch when the worktree is clean enough to switch safely.
- Recommended branch names: `feature/<task-name>`, `fix/<task-name>`, or `chore/<task-name>`.
- Do not create or switch branches when unrelated uncommitted changes are present; ask first.
- Default commit message format: `<type>: <Chinese description>`, where `type` is one of `feat`, `fix`, `docs`, `refactor`, or `chore`.
- Force pushing and rewriting already-pushed history are prohibited.
