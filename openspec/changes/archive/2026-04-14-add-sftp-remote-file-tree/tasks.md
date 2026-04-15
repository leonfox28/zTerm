## 1. OpenSpec artifacts and shared contracts

- [x] 1.1 Define the SFTP remote file tree proposal, design, and spec artifacts for the first read-only slice.
- [x] 1.2 Add shared SFTP IPC channels and shared remote file entry/result types for preload and renderer consumption.

## 2. Main-process SFTP service

- [x] 2.1 Refactor SSH connection config creation so SFTP can reuse saved connection lookup, credential resolution, and private-key loading.
- [x] 2.2 Implement a main-process SFTP service and IPC handlers for loading the initial remote directory and listing child directories.
- [x] 2.3 Expose the new SFTP API from preload with typed renderer access.

## 3. Renderer remote file explorer

- [x] 3.1 Add a renderer store for per-connection remote file tree caching, loading state, expansion state, and error state.
- [x] 3.2 Replace the auxiliary sidebar placeholder with a read-only remote file tree driven by the active terminal session's SSH connection context.
- [x] 3.3 Add minimal remote explorer styling, icons, and refresh/empty/error states consistent with the current workbench.

## 4. Validation

- [x] 4.1 Run `npm run lint` and `npx tsc --noEmit` after the SFTP remote file tree changes.
- [x] 4.2 Manually verify with user-run Electron that local tabs show an empty state, SSH tabs show the remote tree, directory expansion works, and SFTP failures stay scoped to the auxiliary sidebar.