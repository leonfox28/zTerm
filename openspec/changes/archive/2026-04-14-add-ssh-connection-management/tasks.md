## 1. Connection data and secure storage foundation

- [x] 1.1 Extend the shared connection types, preload bridge, and main-process store/security helpers so SSH connection records and secure credential handling can be persisted safely.
- [x] 1.2 Add renderer-side connection store actions for loading, creating, updating, deleting, and listing SSH connections alongside connection folders.

## 2. SSH connection management UI

- [x] 2.1 Add a main-area SSH connection form flow for creating and editing SSH connections with validation for host, username, auth mode, and private key path requirements.
- [x] 2.2 Update the Sidebar and connection tree so users can create SSH connections, edit/delete saved items, and distinguish local terminal entries from SSH entries.

## 3. SSH terminal session integration

- [x] 3.1 Add the SSH runtime dependency and implement a main-process SSH terminal service that can open interactive shell sessions, forward data, resize, and close cleanly.
- [x] 3.2 Extend terminal creation and session metadata flow so activating a saved SSH connection opens an SSH-backed terminal tab in the existing workspace.
- [x] 3.3 Surface SSH connection state and connection failures in the Sidebar and/or terminal UI so users can understand connecting, connected, and error outcomes.

## 4. Validation

- [x] 4.1 Run `npm run lint` and `npx tsc --noEmit` after the SSH connection management changes.
- [x] 4.2 Manually verify with user-run Electron: create/edit/delete SSH connections, save password/private-key configurations, open an SSH terminal, and confirm failure feedback works when credentials are invalid.