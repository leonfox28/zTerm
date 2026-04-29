## Context

zTerm currently uses `electron-vite` to build main, preload, and renderer bundles, but it does not yet define installer packaging, release publishing, or update metadata generation. The app also has no updater IPC, no Settings updates area, and no release automation under `.github/`.

The desired user experience is intentionally conservative: zTerm checks for updates on every packaged app launch and when the user clicks `Check for Updates` in Settings. If a newer version exists, zTerm asks before downloading. After the download completes, zTerm asks again before restarting to install so active terminal sessions are not interrupted without confirmation.

## Goals / Non-Goals

**Goals:**
- Package zTerm into distributable desktop artifacts and publish them to GitHub Releases.
- Generate updater metadata compatible with packaged zTerm clients.
- Check for updates once per packaged app launch and on manual Settings action.
- Require user confirmation before downloading and before restarting to install.
- Surface updater state in Settings and short workbench status feedback without exposing updater internals directly to renderer code.
- Keep update failures non-blocking for terminal, SSH, and Explorer workflows.

**Non-Goals:**
- No beta, canary, or multi-channel update flow in the first implementation.
- No forced background download or forced restart.
- No private update server.
- No full notification center or VS Code-style command palette integration.
- No implementation of code signing credentials themselves; the release workflow will support signing secrets when provided.

## Decisions

### 1. Use electron-builder and electron-updater for release packaging and updates
- Add `electron-builder` for platform packaging and GitHub publishing.
- Add `electron-updater` for release metadata lookup, update download, progress events, and `quitAndInstall`.
- Keep `electron-vite build` as the bundle step, then let `electron-builder` package the `out/` output.

**Why this over Electron's bare autoUpdater:**
- GitHub Releases plus generated metadata is the target distribution model.
- `electron-updater` handles the common provider metadata and cross-platform package conventions that bare `autoUpdater` would leave to project code.

### 2. Main process owns updater orchestration
- Introduce an `UpdateService` in the main process that owns the updater instance, state machine, and confirmation prompts.
- Register an updater IPC module beside existing `terminal`, `store`, `sftp`, and `context-menu` IPC modules.
- Gate real update checks behind `app.isPackaged`; development builds return an unavailable status instead of making release network calls.
- Start the launch check after the BrowserWindow is created, with a small delay or readiness guard so status events can reach the renderer.

**Why this over renderer-owned update logic:**
- Update download and installation are privileged desktop operations.
- The renderer should only request checks and observe state through a narrow preload API, matching the existing context-isolated architecture.

### 3. Model updates as an explicit state machine
- Shared update types should represent at least:
  - `idle`
  - `checking`
  - `available`
  - `not-available`
  - `downloading`
  - `downloaded`
  - `error`
  - `unavailable`
- State includes current app version, available version when known, progress when downloading, and a user-facing message.
- Guard duplicate operations: a manual check during an active check/download should return the current state instead of starting a second updater run.

**Why this over ad hoc events only:**
- Settings needs a stable current snapshot.
- Startup checks can begin before the user opens Settings, so renderer components need both subscription and `getState()`.

### 4. Confirmation prompts happen from main using Electron message boxes
- When an update is available, `UpdateService` asks whether to download and install.
- If the user agrees, it calls the updater download flow.
- When the update is downloaded, `UpdateService` asks whether to restart now. If the user agrees, it calls `quitAndInstall`; if not, the app remains open and Settings exposes an install/restart action.

**Why this over building a new renderer modal first:**
- zTerm currently has a specific SSH connection modal, not a reusable confirmation dialog system.
- Main-owned prompts keep updater control in the privileged process and reduce renderer race conditions during startup checks.

### 5. Settings gets an Updates category, Status Bar gets short feedback
- Add an `Updates` category to Settings with current version, last updater state, a `Check for Updates` action, progress text while downloading, and a restart/install action when downloaded.
- The Status Bar may show short non-blocking update state such as `Update available`, `Downloading update`, or `Restart to install update`.
- Existing terminal sessions remain mounted and usable while update checks and downloads occur.

**Why this over a new top-level page:**
- Updating is an application preference/maintenance action, not a workbench activity like Terminal or Settings.

### 6. GitHub release workflow is tag-driven
- Add a release workflow triggered by `v*` tags.
- Validate that the tag version matches `package.json` version.
- Run lint, typecheck, build, and packaging before publishing assets.
- Publish installers and updater metadata to the matching GitHub Release.
- Keep signing and notarization configurable through repository secrets; unsigned builds remain useful for internal validation but should be documented as lower-trust public artifacts.

**Why this over manual local publishing:**
- Release artifacts need to be reproducible and tied to source tags.
- GitHub Releases are the update feed, so CI should own asset upload consistency.

## Risks / Trade-offs

- **Unsigned public builds trigger OS trust warnings** -> Add signing/notarization hooks and document required repository secrets; allow initial internal validation before public signing is ready.
- **Startup prompt can interrupt the first window** -> Delay launch check until the main window has loaded and renderer listeners are registered.
- **Update restart can kill active terminals** -> Require explicit restart confirmation and support postponing installation.
- **Network or GitHub errors are common** -> Treat failures as non-blocking state and keep terminals usable.
- **Multi-platform packaging can expose native dependency issues** -> Include packaged smoke checks for local PTY startup, SSH connection failure surfacing, and Settings update UI.
- **Duplicate checks/downloads can race** -> Centralize operation guards in `UpdateService`.

## Migration Plan

1. Add packaging dependencies, release configuration, and scripts while keeping existing `npm run build` behavior intact.
2. Add the main-process updater service, IPC/preload API, shared types, and renderer store/UI.
3. Add the GitHub Actions release workflow and documentation for local packaging, tag release, and signing secrets.
4. Verify static checks with `npm run lint` and `npm run typecheck`.
5. Verify packaged behavior by creating a local package and, for full update testing, publishing at least two sequential GitHub Release versions.

Rollback is straightforward before public adoption: remove the release workflow, updater dependencies/config, and updater IPC/UI files. After public releases exist, rollback should publish a fixed newer version rather than deleting release assets that installed clients may query.
