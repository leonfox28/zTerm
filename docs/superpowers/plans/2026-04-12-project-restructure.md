# zTerm Phase 1.5 Implementation Plan

> 历史 superpowers 文档：保留作背景参考。当前新的规划/实现主入口请看 `openspec/changes/migrate-superpowers-to-openspec/`。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up Phase 1 technical debt, extract hardcoded config into a theme system skeleton, enable WebGL rendering, abstract the service layer for Phase 2 DI, and introduce electron-store for persistence.

**Architecture:** Main process gains a service interface (`ITerminalService`) and a `StoreService` wrapping electron-store. Renderer gains a theme system that injects CSS variables from JS config at startup, replacing hardcoded CSS values. Config constants are centralized in `src/shared/config/`.

**Tech Stack:** Electron 39, React 19, TypeScript, xterm.js v6, node-pty, Zustand 5, electron-store, @xterm/addon-webgl, ESLint v9 flat config

---

## File Map

### New Files

| File | Responsibility |
|------|---------------|
| `src/shared/config/theme.config.ts` | ITheme interface + Dark+ default theme (UI + terminal colors) |
| `src/shared/config/layout.config.ts` | Layout dimension constants (sidebar, titlebar, statusbar, etc.) |
| `src/shared/config/shell.config.ts` | Shell defaults (login shell flag) |
| `src/shared/types/services.ts` | ITerminalService interface |
| `src/shared/types/store.ts` | ISettings, IConnectionItem, IConnectionFolder schemas for electron-store |
| `src/renderer/utils/theme.ts` | applyTheme() — injects theme as CSS variables |
| `src/main/services/store.service.ts` | StoreService wrapping electron-store |
| `src/main/ipc/store.ipc.ts` | IPC handlers for store:get/set/getAll |
| `eslint.config.js` | ESLint v9 flat config |

### Modified Files

| File | Changes |
|------|---------|
| `src/renderer/styles/global.css` | Remove hardcoded color variables from `:root`, keep layout vars + reset + scrollbar |
| `src/renderer/main.tsx` | Import and call `applyTheme(darkPlusTheme)` before render |
| `src/renderer/components/terminal/TerminalInstance.tsx` | Use theme config for xterm theme, add WebGL addon with fallback |
| `src/renderer/stores/workbench.store.ts` | Import layout constants instead of magic numbers |
| `src/renderer/components/workbench/Sash.tsx` | (no change needed — reads from store which now uses constants) |
| `src/main/services/pty.service.ts` | Add `implements ITerminalService`, adjust method signatures |
| `src/main/ipc/terminal.ipc.ts` | Type service param as ITerminalService |
| `src/shared/ipc-channels.ts` | Add STORE_GET, STORE_SET, STORE_GET_ALL channels |
| `src/preload/index.ts` | Add storeApi exposure |
| `src/renderer/env.d.ts` | Add StoreApi type to Window |
| `src/renderer/stores/connections.store.ts` | Load initial state from storeApi, persist on change |
| `src/main/main.ts` | Import and register store IPC |
| `package.json` | Add electron-store, ESLint plugins |
| `docs/project-plan.md` | Full rewrite with Phase 1.5 + updated roadmap |
| `docs/handoff.md` | Sync to current state |
| `README.md` | Update structure + roadmap |

### Deleted Files

| File | Reason |
|------|--------|
| `src/renderer/components/terminal/useTerminal.ts` | Unused, duplicates TerminalInstance logic |
| `src/renderer/services/` | Empty directory |

---

## Task 1: Tech Debt Cleanup

**Files:**
- Delete: `src/renderer/components/terminal/useTerminal.ts`
- Delete: `src/renderer/services/` (empty directory)

- [ ] **Step 1: Delete unused hook file**

```bash
rm src/renderer/components/terminal/useTerminal.ts
```

- [ ] **Step 2: Delete empty services directory**

```bash
rmdir src/renderer/services
```

- [ ] **Step 3: Verify no imports reference deleted file**

```bash
grep -r "useTerminal" src/
```

Expected: No results (file was never imported).

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove unused useTerminal hook and empty services dir"
```

---

## Task 2: Create Config Files

**Files:**
- Create: `src/shared/config/theme.config.ts`
- Create: `src/shared/config/layout.config.ts`
- Create: `src/shared/config/shell.config.ts`

- [ ] **Step 1: Create theme.config.ts**

```typescript
// src/shared/config/theme.config.ts

/**
 * Theme definition for zTerm UI and terminal colors.
 * CSS variable names are derived from property keys: camelCase → kebab-case with `--` prefix.
 * e.g. bgEditor → --bg-editor
 */
export interface ITheme {
  // Title Bar
  bgTitlebar: string
  textTitlebar: string

  // Activity Bar
  bgActivitybar: string
  activitybarFgActive: string
  activitybarFgInactive: string
  activitybarBadgeBg: string

  // Editor / Terminal area
  bgEditor: string
  fgEditor: string

  // Tabs
  bgTabsContainer: string
  bgTabActive: string
  bgTabInactive: string
  fgTabActive: string
  fgTabInactive: string
  tabBorder: string
  tabActiveBorderBottom: string
  tabActiveBorderTop: string

  // Sidebar
  bgSidebar: string
  fgSidebar: string
  fgSidebarTitle: string

  // Status Bar
  bgStatusbar: string
  fgStatusbar: string

  // Borders & General
  borderColor: string
  bgHover: string
  bgActive: string
  focusBorder: string

  // Terminal (xterm.js ITheme subset)
  terminalBackground: string
  terminalForeground: string
  terminalCursor: string
  terminalSelectionBackground: string
}

export const darkPlusTheme: ITheme = {
  // Title Bar
  bgTitlebar: '#3c3c3c',
  textTitlebar: '#cccccc',

  // Activity Bar
  bgActivitybar: '#333333',
  activitybarFgActive: '#ffffff',
  activitybarFgInactive: 'rgba(255, 255, 255, 0.4)',
  activitybarBadgeBg: '#007acc',

  // Editor / Terminal area
  bgEditor: '#1e1e1e',
  fgEditor: '#d4d4d4',

  // Tabs
  bgTabsContainer: '#252526',
  bgTabActive: '#1e1e1e',
  bgTabInactive: '#2d2d2d',
  fgTabActive: '#ffffff',
  fgTabInactive: 'rgba(255, 255, 255, 0.5)',
  tabBorder: '#252526',
  tabActiveBorderBottom: '#1e1e1e',
  tabActiveBorderTop: '#007acc',

  // Sidebar
  bgSidebar: '#252526',
  fgSidebar: '#cccccc',
  fgSidebarTitle: '#bbbbbb',

  // Status Bar
  bgStatusbar: '#007acc',
  fgStatusbar: '#ffffff',

  // Borders & General
  borderColor: '#414141',
  bgHover: 'rgba(90, 93, 94, 0.31)',
  bgActive: 'rgba(255, 255, 255, 0.12)',
  focusBorder: '#007fd4',

  // Terminal
  terminalBackground: '#1e1e1e',
  terminalForeground: '#cccccc',
  terminalCursor: '#ffffff',
  terminalSelectionBackground: '#264f78'
}
```

- [ ] **Step 2: Create layout.config.ts**

```typescript
// src/shared/config/layout.config.ts

export const LAYOUT = {
  titlebar: { height: 38 },
  activitybar: { width: 48 },
  statusbar: { height: 22 },
  sidebar: {
    defaultWidth: 240,
    minWidth: 170,
    maxWidth: 500,
    autoHideThreshold: 120
  },
  auxiliarySidebar: { width: 240 }
} as const
```

- [ ] **Step 3: Create shell.config.ts**

```typescript
// src/shared/config/shell.config.ts

export const SHELL_DEFAULTS = {
  loginShell: true
} as const
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/shared/config/
git commit -m "feat: add centralized config files for theme, layout, and shell defaults"
```

---

## Task 3: Create Theme Utility

**Files:**
- Create: `src/renderer/utils/theme.ts`

- [ ] **Step 1: Create applyTheme utility**

```typescript
// src/renderer/utils/theme.ts

import { ITheme } from '@shared/config/theme.config'

/**
 * Converts camelCase property name to CSS variable name.
 * e.g. "bgEditor" → "--bg-editor"
 *      "activitybarFgActive" → "--activitybar-fg-active"
 *      "terminalBackground" → "--terminal-background"
 */
function toCssVar(key: string): string {
  return '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase()
}

/**
 * Applies a theme by setting CSS custom properties on :root.
 * Call this before React renders to avoid flash of unstyled content.
 */
export function applyTheme(theme: ITheme): void {
  const root = document.documentElement
  for (const [key, value] of Object.entries(theme)) {
    root.style.setProperty(toCssVar(key), value)
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/utils/theme.ts
git commit -m "feat: add applyTheme utility for CSS variable injection"
```

---

## Task 4: Integrate Theme System into Renderer

**Files:**
- Modify: `src/renderer/styles/global.css`
- Modify: `src/renderer/main.tsx`

- [ ] **Step 1: Remove hardcoded color variables from global.css**

Replace the entire `:root` block in `src/renderer/styles/global.css` with layout-only variables. Color variables are now injected by `applyTheme()` at runtime.

The new `:root` block should be:

```css
:root {
  /* Layout dimensions — structural constants, not theme-dependent */
  --titlebar-height: 38px;
  --activitybar-width: 48px;
  --statusbar-height: 22px;
  --sidebar-width: 240px;
  --auxiliarybar-width: 240px;
}
```

Remove lines 11–51 from the original (all color variables: `--bg-titlebar` through `--focus-border`). Keep the `@import` on line 1, the new `:root` with only layout vars, and everything from line 53 onward (`*` reset, `html,body,#root`, scrollbar styles) unchanged.

- [ ] **Step 2: Update main.tsx to apply theme before render**

Replace `src/renderer/main.tsx` with:

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { darkPlusTheme } from '@shared/config/theme.config'
import { applyTheme } from './utils/theme'
import './styles/global.css'

// Apply theme CSS variables before React renders to avoid FOUC
applyTheme(darkPlusTheme)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Manual verification**

Run `npm run dev` and verify:
- All UI colors still match VS Code Dark+ (no visual change)
- Inspect `:root` in DevTools → CSS variables are set by JS, not by stylesheet

- [ ] **Step 5: Commit**

```bash
git add src/renderer/styles/global.css src/renderer/main.tsx
git commit -m "feat: switch from hardcoded CSS variables to JS theme injection"
```

---

## Task 5: Update TerminalInstance — Theme Config + WebGL

**Files:**
- Modify: `src/renderer/components/terminal/TerminalInstance.tsx`

- [ ] **Step 1: Update TerminalInstance.tsx**

Replace the entire file with:

```typescript
import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'
import { darkPlusTheme } from '@shared/config/theme.config'
import '@xterm/xterm/css/xterm.css'

interface TerminalInstanceProps {
  tabId: number
  visible: boolean
}

export function TerminalInstance({ tabId, visible }: TerminalInstanceProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const ptyIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const term = new Terminal({
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
      theme: {
        background: darkPlusTheme.terminalBackground,
        foreground: darkPlusTheme.terminalForeground,
        cursor: darkPlusTheme.terminalCursor,
        selectionBackground: darkPlusTheme.terminalSelectionBackground
      },
      cursorBlink: true
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(containerRef.current)
    fitAddon.fit()

    // Enable WebGL rendering with canvas fallback
    try {
      const webglAddon = new WebglAddon()
      webglAddon.onContextLoss(() => {
        webglAddon.dispose()
      })
      term.loadAddon(webglAddon)
    } catch {
      // WebGL not available — canvas renderer is used automatically
    }

    termRef.current = term
    fitAddonRef.current = fitAddon

    // Register data listener BEFORE creating PTY so we don't miss initial output
    const removeDataListener = window.terminalApi.onData(({ id: termId, data }) => {
      if (termId === ptyIdRef.current) {
        term.write(data)
      }
    })

    const removeExitListener = window.terminalApi.onExit(({ id: termId }) => {
      if (termId === ptyIdRef.current) {
        term.write('\r\n[Process exited]')
      }
    })

    // Now create the PTY
    window.terminalApi.create({ cols: term.cols, rows: term.rows }).then((ptyId) => {
      ptyIdRef.current = ptyId

      // Send input to PTY
      term.onData((data) => {
        window.terminalApi.write(ptyId, data)
      })

      term.onResize(({ cols, rows }) => {
        window.terminalApi.resize(ptyId, cols, rows)
      })
    })

    // Observe container resize
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit()
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      removeDataListener()
      removeExitListener()
      resizeObserver.disconnect()
      if (ptyIdRef.current !== null) {
        window.terminalApi.kill(ptyIdRef.current)
      }
      term.dispose()
    }
  }, [tabId])

  // Re-fit when visibility changes
  useEffect(() => {
    if (visible && fitAddonRef.current) {
      setTimeout(() => fitAddonRef.current?.fit(), 0)
    }
  }, [visible])

  return (
    <div
      ref={containerRef}
      className={`terminal-panel__instance ${!visible ? 'terminal-panel__instance--hidden' : ''}`}
    />
  )
}
```

Changes from original:
1. Added `import { WebglAddon }` and `import { darkPlusTheme }`
2. Terminal theme uses `darkPlusTheme` properties instead of hardcoded hex values
3. WebGL addon loaded after `term.open()` with try-catch fallback and context loss handler

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Manual verification**

Run `npm run dev` and verify:
- Terminal renders correctly with same colors as before
- In DevTools Console, check for WebGL context creation (no errors)

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/terminal/TerminalInstance.tsx
git commit -m "feat: use theme config for terminal colors and enable WebGL rendering"
```

---

## Task 6: Use Layout Config in Workbench Store

**Files:**
- Modify: `src/renderer/stores/workbench.store.ts`

- [ ] **Step 1: Update workbench.store.ts to use layout constants**

Replace the entire file with:

```typescript
import { create } from 'zustand'
import { LAYOUT } from '@shared/config/layout.config'

interface WorkbenchState {
  sidebarVisible: boolean
  sidebarWidth: number
  activeViewId: string
  toggleSidebar: () => void
  setSidebarWidth: (width: number) => void
  setActiveView: (id: string) => void
}

export const useWorkbenchStore = create<WorkbenchState>((set, get) => ({
  sidebarVisible: true,
  sidebarWidth: LAYOUT.sidebar.defaultWidth,
  activeViewId: 'terminal',

  toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),

  setSidebarWidth: (width) => {
    if (width < LAYOUT.sidebar.autoHideThreshold) {
      set({ sidebarVisible: false })
    } else {
      const clamped = Math.max(LAYOUT.sidebar.minWidth, Math.min(LAYOUT.sidebar.maxWidth, width))
      set({ sidebarWidth: clamped, sidebarVisible: true })
    }
  },

  setActiveView: (id) => {
    const state = get()
    if (id === state.activeViewId && state.sidebarVisible) {
      set({ sidebarVisible: false })
    } else {
      set({ activeViewId: id, sidebarVisible: true })
    }
  }
}))
```

Changes: magic numbers `120`, `170`, `500`, `240` replaced with `LAYOUT.sidebar.*` constants.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/stores/workbench.store.ts
git commit -m "refactor: use layout config constants in workbench store"
```

---

## Task 7: Service Layer Interface

**Files:**
- Create: `src/shared/types/services.ts`
- Modify: `src/main/services/pty.service.ts`
- Modify: `src/main/ipc/terminal.ipc.ts`

- [ ] **Step 1: Create ITerminalService interface**

```typescript
// src/shared/types/services.ts

import { IShellOptions } from './terminal'

export interface ITerminalService {
  spawn(
    options: IShellOptions,
    onData: (id: number, data: string) => void,
    onExit: (id: number, code: number | undefined) => void
  ): number
  write(id: number, data: string): void
  resize(id: number, cols: number, rows: number): void
  kill(id: number): void
  dispose(): void
}
```

Note: The interface keeps the current `spawn()` callback pattern rather than separate `onData`/`onExit` methods, because it matches how the IPC layer actually uses the service. Phase 2 inversify will bind this interface to concrete implementations.

- [ ] **Step 2: Update PtyService to implement the interface**

Replace `src/main/services/pty.service.ts` with:

```typescript
import * as pty from 'node-pty'
import { IShellOptions } from '@shared/types/terminal'
import { ITerminalService } from '@shared/types/services'
import { SHELL_DEFAULTS } from '@shared/config/shell.config'
import os from 'os'

export class PtyService implements ITerminalService {
  private processes = new Map<number, pty.IPty>()
  private nextId = 1

  getDefaultShell(): string {
    if (process.platform === 'win32') {
      return process.env.COMSPEC || 'cmd.exe'
    }
    return process.env.SHELL || '/bin/zsh'
  }

  spawn(
    options: IShellOptions,
    onData: (id: number, data: string) => void,
    onExit: (id: number, code: number | undefined) => void
  ): number {
    const id = this.nextId++
    const shell = options.shell || this.getDefaultShell()
    const cwd = options.cwd || os.homedir()
    const args = SHELL_DEFAULTS.loginShell ? ['-l'] : []

    const proc = pty.spawn(shell, args, {
      name: 'xterm-256color',
      cols: options.cols,
      rows: options.rows,
      cwd,
      env: { ...process.env, ...options.env } as Record<string, string>
    })

    proc.onData((data) => onData(id, data))
    proc.onExit(({ exitCode }) => {
      onExit(id, exitCode)
      this.processes.delete(id)
    })

    this.processes.set(id, proc)
    return id
  }

  write(id: number, data: string): void {
    this.processes.get(id)?.write(data)
  }

  resize(id: number, cols: number, rows: number): void {
    this.processes.get(id)?.resize(cols, rows)
  }

  kill(id: number): void {
    this.processes.get(id)?.kill()
    this.processes.delete(id)
  }

  dispose(): void {
    for (const [id] of this.processes) {
      this.kill(id)
    }
  }
}
```

Changes from original:
1. Added `implements ITerminalService`
2. Imported `SHELL_DEFAULTS` — login shell flag now comes from config
3. Shell args computed from `SHELL_DEFAULTS.loginShell` instead of hardcoded `['-l']`

- [ ] **Step 3: Update terminal.ipc.ts to use interface type**

Replace `src/main/ipc/terminal.ipc.ts` with:

```typescript
import { ipcMain, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { IShellOptions } from '@shared/types/terminal'
import { ITerminalService } from '@shared/types/services'

export function registerTerminalIpc(
  terminalService: ITerminalService,
  getWindow: () => BrowserWindow | null
) {
  ipcMain.handle(IPC_CHANNELS.TERMINAL_CREATE, (_event, options: IShellOptions) => {
    const win = getWindow()
    const id = terminalService.spawn(
      options,
      (termId, data) => {
        if (!win?.isDestroyed()) {
          win?.webContents.send(IPC_CHANNELS.TERMINAL_DATA, { id: termId, data })
        }
      },
      (termId, code) => {
        if (!win?.isDestroyed()) {
          win?.webContents.send(IPC_CHANNELS.TERMINAL_EXIT, { id: termId, code })
        }
      }
    )
    return id
  })

  ipcMain.on(IPC_CHANNELS.TERMINAL_WRITE, (_event, { id, data }: { id: number; data: string }) => {
    terminalService.write(id, data)
  })

  ipcMain.on(
    IPC_CHANNELS.TERMINAL_RESIZE,
    (_event, { id, cols, rows }: { id: number; cols: number; rows: number }) => {
      terminalService.resize(id, cols, rows)
    }
  )

  ipcMain.on(IPC_CHANNELS.TERMINAL_KILL, (_event, { id }: { id: number }) => {
    terminalService.kill(id)
  })
}
```

Changes: parameter type changed from `PtyService` to `ITerminalService`, variable renamed to `terminalService`.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Manual verification**

Run `npm run dev`, open a terminal — everything should work as before.

- [ ] **Step 6: Commit**

```bash
git add src/shared/types/services.ts src/main/services/pty.service.ts src/main/ipc/terminal.ipc.ts
git commit -m "feat: add ITerminalService interface and implement in PtyService"
```

---

## Task 8: electron-store Setup

**Files:**
- Create: `src/shared/types/store.ts`
- Create: `src/main/services/store.service.ts`
- Create: `src/main/ipc/store.ipc.ts`
- Modify: `src/shared/ipc-channels.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/renderer/env.d.ts`
- Modify: `src/main/main.ts`
- Modify: `package.json` (install dependency)

- [ ] **Step 1: Install electron-store**

```bash
npm install electron-store
```

- [ ] **Step 2: Create store type definitions**

```typescript
// src/shared/types/store.ts

export interface ISettings {
  fontSize: number
  fontFamily: string
  shellPath: string
  loginShell: boolean
  theme: string
}

export interface IConnectionItem {
  id: string
  name: string
  type: 'local' | 'ssh'
  folderId?: string
  // SSH fields (Phase 2)
  host?: string
  port?: number
  username?: string
  authType?: 'password' | 'privateKey'
  encryptedPassword?: string   // base64 of safeStorage-encrypted buffer
  privateKeyPath?: string      // file path only, never content
  encryptedPassphrase?: string // base64 of safeStorage-encrypted buffer
}

export interface IConnectionFolder {
  id: string
  name: string
  parentId?: string
  expanded: boolean
}

export interface IStoreSchema {
  settings: ISettings
  connections: IConnectionItem[]
  connectionFolders: IConnectionFolder[]
}

export const DEFAULT_SETTINGS: ISettings = {
  fontSize: 14,
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
  shellPath: '',
  loginShell: true,
  theme: 'dark-plus'
}
```

- [ ] **Step 3: Create StoreService**

```typescript
// src/main/services/store.service.ts

import Store from 'electron-store'
import { IStoreSchema, DEFAULT_SETTINGS } from '@shared/types/store'

const store = new Store<IStoreSchema>({
  defaults: {
    settings: DEFAULT_SETTINGS,
    connections: [],
    connectionFolders: []
  }
})

export class StoreService {
  get<K extends keyof IStoreSchema>(key: K): IStoreSchema[K] {
    return store.get(key)
  }

  set<K extends keyof IStoreSchema>(key: K, value: IStoreSchema[K]): void {
    store.set(key, value)
  }

  getAll(): IStoreSchema {
    return store.store
  }
}
```

- [ ] **Step 4: Add store IPC channels**

Replace `src/shared/ipc-channels.ts` with:

```typescript
export const IPC_CHANNELS = {
  TERMINAL_CREATE: 'terminal:create',
  TERMINAL_WRITE: 'terminal:write',
  TERMINAL_RESIZE: 'terminal:resize',
  TERMINAL_KILL: 'terminal:kill',
  TERMINAL_DATA: 'terminal:data',
  TERMINAL_EXIT: 'terminal:exit',
  STORE_GET: 'store:get',
  STORE_SET: 'store:set',
  STORE_GET_ALL: 'store:getAll'
} as const
```

- [ ] **Step 5: Create store IPC handlers**

```typescript
// src/main/ipc/store.ipc.ts

import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { IStoreSchema } from '@shared/types/store'
import { StoreService } from '../services/store.service'

export function registerStoreIpc(storeService: StoreService) {
  ipcMain.handle(IPC_CHANNELS.STORE_GET, (_event, key: keyof IStoreSchema) => {
    return storeService.get(key)
  })

  ipcMain.on(
    IPC_CHANNELS.STORE_SET,
    (_event, { key, value }: { key: keyof IStoreSchema; value: IStoreSchema[keyof IStoreSchema] }) => {
      storeService.set(key, value as never)
    }
  )

  ipcMain.handle(IPC_CHANNELS.STORE_GET_ALL, () => {
    return storeService.getAll()
  })
}
```

- [ ] **Step 6: Extend preload with storeApi**

Replace `src/preload/index.ts` with:

```typescript
import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { IShellOptions } from '@shared/types/terminal'
import { IStoreSchema } from '@shared/types/store'

const terminalApi = {
  create: (options: IShellOptions): Promise<number> => {
    return ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_CREATE, options)
  },
  write: (id: number, data: string): void => {
    ipcRenderer.send(IPC_CHANNELS.TERMINAL_WRITE, { id, data })
  },
  resize: (id: number, cols: number, rows: number): void => {
    ipcRenderer.send(IPC_CHANNELS.TERMINAL_RESIZE, { id, cols, rows })
  },
  kill: (id: number): void => {
    ipcRenderer.send(IPC_CHANNELS.TERMINAL_KILL, { id })
  },
  onData: (callback: (data: { id: number; data: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: { id: number; data: string }) =>
      callback(data)
    ipcRenderer.on(IPC_CHANNELS.TERMINAL_DATA, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.TERMINAL_DATA, listener)
  },
  onExit: (callback: (data: { id: number; code: number | undefined }) => void) => {
    const listener =
      (_event: Electron.IpcRendererEvent, data: { id: number; code: number | undefined }) =>
        callback(data)
    ipcRenderer.on(IPC_CHANNELS.TERMINAL_EXIT, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.TERMINAL_EXIT, listener)
  }
}

const storeApi = {
  get: <K extends keyof IStoreSchema>(key: K): Promise<IStoreSchema[K]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.STORE_GET, key)
  },
  set: <K extends keyof IStoreSchema>(key: K, value: IStoreSchema[K]): void => {
    ipcRenderer.send(IPC_CHANNELS.STORE_SET, { key, value })
  },
  getAll: (): Promise<IStoreSchema> => {
    return ipcRenderer.invoke(IPC_CHANNELS.STORE_GET_ALL)
  }
}

contextBridge.exposeInMainWorld('terminalApi', terminalApi)
contextBridge.exposeInMainWorld('storeApi', storeApi)

export type TerminalApi = typeof terminalApi
export type StoreApi = typeof storeApi
```

- [ ] **Step 7: Update env.d.ts with StoreApi type**

Replace `src/renderer/env.d.ts` with:

```typescript
import { TerminalApi, StoreApi } from '../../preload/index'

declare module '*.css' {
  const content: Record<string, string>
  export default content
}

declare global {
  interface Window {
    terminalApi: TerminalApi
    storeApi: StoreApi
  }
}
```

- [ ] **Step 8: Register store IPC in main.ts**

Replace `src/main/main.ts` with:

```typescript
import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { PtyService } from './services/pty.service'
import { StoreService } from './services/store.service'
import { registerTerminalIpc } from './ipc/terminal.ipc'
import { registerStoreIpc } from './ipc/store.ipc'

let mainWindow: BrowserWindow | null = null
const ptyService = new PtyService()
const storeService = new StoreService()

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  registerTerminalIpc(ptyService, () => mainWindow)
  registerStoreIpc(storeService)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  ptyService.dispose()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
```

Changes: imported `StoreService` and `registerStoreIpc`, instantiated `storeService`, registered store IPC in `whenReady`.

- [ ] **Step 9: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 10: Manual verification**

Run `npm run dev`. Open DevTools Console and test:
```javascript
await window.storeApi.getAll()
// Should return: { settings: {...defaults}, connections: [], connectionFolders: [] }
```

- [ ] **Step 11: Commit**

```bash
git add src/shared/types/store.ts src/main/services/store.service.ts src/main/ipc/store.ipc.ts src/shared/ipc-channels.ts src/preload/index.ts src/renderer/env.d.ts src/main/main.ts package.json package-lock.json
git commit -m "feat: add electron-store with settings and connections schema"
```

---

## Task 9: Connect Connections Store to electron-store

**Files:**
- Modify: `src/renderer/stores/connections.store.ts`

- [ ] **Step 1: Update connections.store.ts to persist via storeApi**

Replace the entire file with:

```typescript
import { create } from 'zustand'
import { IConnectionItem as StoredConnectionItem, IConnectionFolder as StoredConnectionFolder } from '@shared/types/store'

export interface ConnectionItem {
  id: string
  name: string
  type: 'local' | 'ssh'
}

export interface ConnectionFolder {
  id: string
  name: string
  expanded: boolean
  children: (ConnectionItem | ConnectionFolder)[]
}

export function isFolder(node: ConnectionItem | ConnectionFolder): node is ConnectionFolder {
  return 'children' in node
}

interface ConnectionsState {
  folders: ConnectionFolder[]
  initialized: boolean
  init: () => Promise<void>
  addFolder: (name: string) => void
  toggleFolder: (id: string) => void
  removeFolder: (id: string) => void
}

let nextFolderId = 1

function persistFolders(folders: ConnectionFolder[]) {
  const flat: StoredConnectionFolder[] = folders.map((f) => ({
    id: f.id,
    name: f.name,
    expanded: f.expanded
  }))
  window.storeApi.set('connectionFolders', flat)
}

export const useConnectionsStore = create<ConnectionsState>((set, get) => ({
  folders: [],
  initialized: false,

  init: async () => {
    if (get().initialized) return
    const stored = await window.storeApi.get('connectionFolders')
    if (stored && stored.length > 0) {
      const folders: ConnectionFolder[] = stored.map((f) => ({
        id: f.id,
        name: f.name,
        expanded: f.expanded,
        children: []
      }))
      // Update nextFolderId to avoid collisions
      const maxId = stored.reduce((max, f) => {
        const num = parseInt(f.id.replace('folder-', ''), 10)
        return isNaN(num) ? max : Math.max(max, num)
      }, 0)
      nextFolderId = maxId + 1
      set({ folders, initialized: true })
    } else {
      set({ initialized: true })
    }
  },

  addFolder: (name) =>
    set((state) => {
      const folders = [
        ...state.folders,
        { id: `folder-${nextFolderId++}`, name, expanded: true, children: [] }
      ]
      persistFolders(folders)
      return { folders }
    }),

  toggleFolder: (id) =>
    set((state) => {
      const folders = toggleFolderInTree(state.folders, id)
      persistFolders(folders)
      return { folders }
    }),

  removeFolder: (id) =>
    set((state) => {
      const folders = state.folders.filter((f) => f.id !== id)
      persistFolders(folders)
      return { folders }
    })
}))

function toggleFolderInTree(folders: ConnectionFolder[], id: string): ConnectionFolder[] {
  return folders.map((folder) => {
    if (folder.id === id) {
      return { ...folder, expanded: !folder.expanded }
    }
    if (folder.children.length > 0) {
      return {
        ...folder,
        children: folder.children.map((child) =>
          isFolder(child) ? toggleFolderInTree([child], id)[0] : child
        )
      }
    }
    return folder
  })
}
```

Changes:
1. Added `initialized` flag and `init()` async method that loads from electron-store
2. Each mutation (`addFolder`, `toggleFolder`, `removeFolder`) now calls `persistFolders()` to sync back
3. `nextFolderId` is recovered from persisted data to avoid ID collisions

- [ ] **Step 2: Call init() on app startup**

The `init()` method needs to be called early. Add it in `src/renderer/App.tsx`. Replace the file with:

```typescript
import { useEffect } from 'react'
import { Workbench } from './components/workbench/Workbench'
import { useConnectionsStore } from './stores/connections.store'

function App() {
  const init = useConnectionsStore((s) => s.init)

  useEffect(() => {
    init()
  }, [init])

  return <Workbench />
}

export default App
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Manual verification**

Run `npm run dev`:
1. Create a folder in the sidebar
2. Quit the app (`Cmd+Q`)
3. Run `npm run dev` again
4. The folder should still be there (persisted)

- [ ] **Step 5: Commit**

```bash
git add src/renderer/stores/connections.store.ts src/renderer/App.tsx
git commit -m "feat: persist connection folders via electron-store"
```

---

## Task 10: ESLint Configuration

**Files:**
- Create: `eslint.config.js`
- Modify: `package.json` (install devDeps + update lint script)

- [ ] **Step 1: Install ESLint plugins**

```bash
npm install -D @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-react eslint-plugin-react-hooks
```

- [ ] **Step 2: Create eslint.config.js**

```javascript
// eslint.config.js

import js from '@eslint/js'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true }
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        ResizeObserver: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react': reactPlugin,
      'react-hooks': reactHooksPlugin
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn'
    },
    settings: {
      react: { version: 'detect' }
    }
  },
  {
    ignores: ['out/', 'node_modules/', '*.config.*']
  }
]
```

- [ ] **Step 3: Update lint script in package.json**

Change the `lint` script from:
```json
"lint": "eslint src/ --ext .ts,.tsx"
```
to:
```json
"lint": "eslint src/"
```

(ESLint v9 flat config doesn't use `--ext`; file matching is handled by the `files` pattern in config.)

- [ ] **Step 4: Run lint**

```bash
npm run lint
```

Fix any errors that come up. Warnings for unused vars are expected and fine.

- [ ] **Step 5: Commit**

```bash
git add eslint.config.js package.json package-lock.json
git commit -m "chore: add ESLint v9 flat config with TypeScript and React plugins"
```

---

## Task 11: Documentation Updates

**Files:**
- Modify: `docs/project-plan.md`
- Modify: `docs/handoff.md`
- Modify: `README.md`

- [ ] **Step 1: Update docs/project-plan.md**

Key updates needed:
1. In **技术栈** table: add `electron-store` row with description "用户设置与连接持久化"
2. In **架构设计 3.1 进程模型**: add `StoreService` box next to the existing services
3. In **功能模块规划**: add **Phase 1.5** section before Phase 1 剩余 items, listing all 6 completed items from this plan
4. In **关键技术决策记录**: add rows for: theme management (JS injects CSS vars), WebGL rendering, electron-store, credential security (safeStorage), service interface abstraction
5. In **项目结构**: add `src/shared/config/`, `src/shared/types/services.ts`, `src/shared/types/store.ts`, `src/main/services/store.service.ts`, `src/main/ipc/store.ipc.ts`, `src/renderer/utils/theme.ts`, `eslint.config.js`
6. Update **Phase 2-4 和 Future** roadmap to match the design spec's Section 8 (including WebDAV sync in Future)

- [ ] **Step 2: Update docs/handoff.md**

Key updates:
1. **当前完成状态** table: add Phase 1.5 completed items (tech debt cleanup, theme system, WebGL, service interface, electron-store, ESLint)
2. **项目结构**: add new files/directories
3. **关键实现细节**: add sections for theme injection mechanism, WebGL fallback, electron-store persistence, ITerminalService interface
4. **IPC Channels**: add STORE_GET, STORE_SET, STORE_GET_ALL
5. **CSS 变量速查**: note that color vars are now injected by JS, only layout vars remain in CSS
6. **下一步工作建议**: update to reflect Phase 1 remaining (split screen, settings page, keybindings)

- [ ] **Step 3: Update README.md**

Key updates:
1. **Project Structure**: add `config/`, `utils/`, `store.service.ts`, `store.ipc.ts`, `services.ts`, `store.ts` to the tree
2. **Roadmap**: add Phase 1.5 as completed, update Phase 2-Future to match design spec

- [ ] **Step 4: Commit**

```bash
git add docs/project-plan.md docs/handoff.md README.md
git commit -m "docs: update project plan, handoff, and README for Phase 1.5"
```

---

## Verification Checklist

After all tasks are complete:

- [ ] `npx tsc --noEmit` — no TypeScript errors
- [ ] `npm run lint` — no ESLint errors (warnings OK)
- [ ] `npm run dev` — app launches, terminal works, colors match VS Code Dark+
- [ ] DevTools → Elements → `:root` shows CSS variables set by JS (not stylesheet)
- [ ] DevTools → Console → `await window.storeApi.getAll()` returns schema with defaults
- [ ] Create a folder in sidebar → quit → relaunch → folder persists
- [ ] DevTools → Console → no WebGL errors (or graceful fallback message)
