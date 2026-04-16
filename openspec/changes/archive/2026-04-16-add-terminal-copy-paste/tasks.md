## 1. Settings and clipboard bridge

- [x] 1.1 Extend the shared settings schema and defaults with a `copyOnSelect` boolean that persists through the existing settings store.
- [x] 1.2 Expose plain-text clipboard read/write helpers through the Electron preload bridge and update renderer window typings.

## 2. Terminal clipboard actions

- [x] 2.1 Add terminal-instance clipboard handlers for copy selection, paste clipboard text, and copy-on-selection behavior using xterm selection APIs.
- [x] 2.2 Provide a shared runtime access path for the active terminal pane so keyboard shortcuts and context menu actions can invoke the same copy/paste handlers.
- [x] 2.3 Update terminal pane context menus to include `Copy` and `Paste`, disabling `Copy` when the target pane has no selection.

## 3. Keyboard and settings integration

- [x] 3.1 Extend the workbench keybinding/command flow so `Cmd+C` copies only when the active terminal has a selection and `Cmd+V` pastes into the active terminal.
- [x] 3.2 Add a Settings row for `copyOnSelect`, default it to enabled in the UI, and keep running terminal behavior in sync with setting changes.

## 4. Validation

- [x] 4.1 Run `npm run lint`.
- [x] 4.2 Run `npx tsc --noEmit`.
- [x] 4.3 Ask the user to run `npm run dev` and manually verify terminal copy shortcut, paste shortcut, terminal context menu copy/paste, and copy-on-selection on/off behavior.