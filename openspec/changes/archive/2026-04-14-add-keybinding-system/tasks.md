## 1. Keybinding foundation

- [x] 1.1 Create renderer-side keybinding and command modules that normalize keydown events, register default shortcuts, and resolve them to command handlers.
- [x] 1.2 Add centralized scope checks for main view, active terminal tab presence, text-input focus, and terminal-focus allowlisting before command execution.

## 2. Shared command integration

- [x] 2.1 Extract shared command handlers for opening settings, returning to terminal, creating a terminal, splitting the active pane, and closing the active tab.
- [x] 2.2 Update existing mouse-driven UI entry points to reuse the shared command handlers instead of owning separate action logic.

## 3. Terminal keyboard actions

- [x] 3.1 Register default shortcuts for new terminal, close active tab, split vertically, split horizontally, and opening settings.
- [x] 3.2 Implement previous-tab and next-tab commands with wraparound behavior and bind them to default shortcuts.
- [x] 3.3 Bind a return shortcut for leaving the settings view and verify terminal sessions remain intact after switching back.

## 4. Validation

- [x] 4.1 Run `npm run lint` and `npx tsc --noEmit` after the shortcut system changes.
- [x] 4.2 Manually verify the GUI flow with user-run Electron: trigger each shortcut, confirm settings/text inputs do not misfire, and confirm terminal typing still works normally.