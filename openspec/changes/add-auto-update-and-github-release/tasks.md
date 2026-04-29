## 1. Packaging and release configuration

- [x] 1.1 Add `electron-builder` and `electron-updater` dependencies and keep the existing `electron-vite` build path intact.
- [x] 1.2 Add release packaging configuration with app id, product name, output directory, artifact naming, packaged files, platform targets, and GitHub publish provider.
- [x] 1.3 Add npm scripts for local packaging, distributable builds, and publish-capable release builds.
- [x] 1.4 Add or document required application icon and installer branding assets for packaged artifacts.

## 2. GitHub release workflow

- [x] 2.1 Add a GitHub Actions workflow triggered by `v*` tags with repository permissions for publishing release assets.
- [x] 2.2 Add a tag/package version consistency check that fails before publishing when the tag version does not match `package.json`.
- [x] 2.3 Run install, lint, typecheck, production build, and platform packaging in the release workflow.
- [x] 2.4 Publish platform installers and generated updater metadata to the matching GitHub Release.
- [x] 2.5 Document signing and notarization secrets, including the behavior when signing secrets are unavailable.

## 3. Main-process updater service

- [x] 3.1 Add shared update status, progress, and result types under `src/shared/types/`.
- [x] 3.2 Add updater IPC channel constants for checking, reading current state, installing a downloaded update, and subscribing to update state changes.
- [x] 3.3 Implement a main-process `UpdateService` that wraps `electron-updater`, gates real checks behind `app.isPackaged`, and prevents duplicate checks or downloads.
- [x] 3.4 Wire updater events into the shared state machine: checking, available, not available, downloading, downloaded, error, and unavailable.
- [x] 3.5 Show native confirmation prompts before downloading an available update and before restarting to install a downloaded update.
- [x] 3.6 Register updater IPC in `src/main/main.ts` after creating the service and start the launch update check once the main window is ready.

## 4. Preload and renderer integration

- [x] 4.1 Expose a narrow `updateApi` through preload for `checkForUpdates`, `getState`, `installDownloadedUpdate`, and update-state subscriptions.
- [x] 4.2 Update renderer window typings for the new `updateApi`.
- [x] 4.3 Add a renderer update store that hydrates the current updater state and subscribes to main-process changes.
- [x] 4.4 Add an `Updates` category to Settings with current version, update status, manual `Check for Updates`, progress display, and restart/install action when available.
- [x] 4.5 Surface short update status in the Status Bar without replacing terminal, SSH, or Explorer content.

## 5. Documentation

- [x] 5.1 Update README scripts and release instructions for local packaging and GitHub tag publishing.
- [x] 5.2 Document the end-user update behavior: startup check, manual check, download confirmation, and restart confirmation.
- [x] 5.3 Document maintainer release prerequisites, including GitHub repository secrets for signing and publishing.

## 6. Verification

- [x] 6.1 Run `npm run lint` and `npm run typecheck`.
- [x] 6.2 Run a local production build and package command for the current development platform.
- [ ] 6.3 Manually verify the packaged app starts, creates a local terminal, and leaves terminal sessions usable while update checks run.
- [ ] 6.4 Manually verify development mode reports updates as unavailable instead of making real update checks.
- [ ] 6.5 Manually verify the full GitHub update flow with two sequential release versions: detect update, prompt before download, download, prompt before restart, and install.
