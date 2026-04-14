## 1. OpenSpec migration baseline

- [x] 1.1 Confirm `migrate-superpowers-to-openspec` is the primary OpenSpec change for replacing the current Superpowers planning path.
- [x] 1.2 Preserve `docs/handoff.md` and `docs/superpowers/` as migration inputs/history while treating this change's artifacts as the primary implementation reference.
- [x] 1.3 Verify the change contains proposal, design, capability specs, and tasks before starting implementation through the OpenSpec apply flow.

## 2. Settings view workspace architecture

- [x] 2.1 Add main-area view state so the workbench can switch between terminal workspace and settings view.
- [x] 2.2 Refactor `MainArea` to keep the terminal workspace mounted while showing or hiding the settings view.
- [x] 2.3 Wire the Activity Bar gear entry to open the settings view and show active state when selected.
- [x] 2.4 Add a return action from the settings view back to the terminal workspace.

## 3. Settings persistence and runtime application

- [x] 3.1 Add a renderer-side settings store that hydrates persisted settings and writes merged updates back to the existing `settings` schema.
- [x] 3.2 Restore the persisted theme before mounting the renderer app so startup matches the saved appearance.
- [x] 3.3 Expand the theme registry to support `dark-plus` and `light-plus`, including safe fallback for unknown theme ids.
- [x] 3.4 Build the settings form for `fontFamily`, `fontSize`, `shellPath`, `loginShell`, and `theme`.
- [x] 3.5 Apply theme changes immediately when the theme setting changes.
- [x] 3.6 Apply font family and font size changes to running terminal instances and refit affected terminals.

## 4. New terminal launch behavior

- [x] 4.1 Extend terminal creation inputs so new PTY sessions receive the latest `shellPath` and `loginShell` settings.
- [x] 4.2 Update main-process shell launch handling so empty shell path falls back to the system default shell.
- [x] 4.3 Ensure changed shell launch settings affect only terminals created after the change, not existing sessions.
- [x] 4.4 Surface invalid shell path failures back to the terminal UI with a clear error message.

## 5. Validation

- [x] 5.1 Run static validation for the settings view implementation (`npm run lint` and `npx tsc --noEmit`).
- [x] 5.2 Manually verify the GUI flow: open settings, return to terminal, preserve existing sessions, switch theme, update font settings, and confirm new shell settings only affect newly created terminals.
- [x] 5.3 Confirm application restart restores persisted settings and the saved theme.
