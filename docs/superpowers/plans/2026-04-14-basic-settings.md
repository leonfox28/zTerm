# Basic Settings View Implementation Plan

> Historical superpowers plan: kept for reference only. The current source of truth for this work is `openspec/changes/migrate-superpowers-to-openspec/`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a VS Code-inspired Settings View in the main workbench area that persists terminal/theme settings and applies them at the correct runtime boundaries.

**Architecture:** Keep the terminal workspace mounted and add a second main-area view for settings so existing PTYs survive when the user opens settings. Introduce a renderer-side settings store for hydration/persistence/theme application, expand the theme registry to support `dark-plus` and `light-plus`, and pass shell launch settings only when new PTYs are created.

**Tech Stack:** Electron 39, React 19, TypeScript 5, Zustand 5, xterm.js 6, electron-store, Vitest, Testing Library

---

## File Structure

### Create
- `vitest.config.ts` — Vitest config with React plugin, aliases, jsdom setup
- `src/test/setup.ts` — Testing Library matchers setup
- `src/shared/config/theme.config.test.ts` — theme registry/fallback tests
- `src/renderer/stores/settings.store.ts` — settings hydration, persistence, theme side effects
- `src/renderer/stores/settings.store.test.ts` — settings store tests
- `src/renderer/stores/workbench.store.test.ts` — main-view routing tests
- `src/renderer/components/workbench/TerminalWorkspace.tsx` — keeps terminal subtree mounted while hidden
- `src/renderer/components/settings/SettingsView.tsx` — settings page UI
- `src/renderer/components/settings/SettingsView.test.tsx` — settings form interaction tests
- `src/renderer/styles/settings.css` — settings page styles
- `src/main/services/shell-launch.ts` — pure helper for shell path/login shell resolution
- `src/main/services/shell-launch.test.ts` — shell launch helper tests

### Modify
- `package.json:1-46` — add test scripts and dev dependencies
- `src/shared/config/theme.config.ts:1-114` — add `ThemeId`, `lightPlusTheme`, registry helpers
- `src/shared/types/store.ts:1-42` — type `theme` as `ThemeId`
- `src/shared/types/terminal.ts:1-17` — add `loginShell?: boolean`
- `src/renderer/main.tsx:1-15` — async bootstrap to restore saved theme before render
- `src/renderer/App.tsx:1-15` — initialize settings store alongside connections store
- `src/renderer/stores/workbench.store.ts:1-37` — track `activeMainView` and settings navigation helpers
- `src/renderer/components/workbench/MainArea.tsx:1-11` — render terminal/settings views side by side, keep both mounted
- `src/renderer/components/workbench/ActivityBar.tsx:1-31` — wire gear click + active state
- `src/renderer/components/terminal/TerminalPanel.tsx:1-52` — accept `workspaceVisible` and pass combined visibility to panes
- `src/renderer/components/terminal/TerminalInstance.tsx:1-223` — consume settings store, update xterm appearance live, pass shell launch settings, surface create failures
- `src/renderer/styles/workbench.css:91-98` — add generic main-area view visibility helpers
- `src/main/services/pty.service.ts:1-65` — use shell launch helper
- `src/main/ipc/terminal.ipc.ts:1-42` — rethrow create errors with clean messages

---

### Task 1: Add test harness and theme registry

**Files:**
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/shared/config/theme.config.test.ts`
- Modify: `package.json:1-46`
- Modify: `src/shared/config/theme.config.ts:1-114`
- Modify: `src/shared/types/store.ts:1-42`

- [ ] **Step 1: Write the failing theme registry test and test harness files**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': resolve('src/shared'),
      '@main': resolve('src/main'),
      '@renderer': resolve('src/renderer')
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts']
  }
})
```

```ts
// src/test/setup.ts
import '@testing-library/jest-dom/vitest'
```

```ts
// src/shared/config/theme.config.test.ts
import { describe, expect, it } from 'vitest'
import { darkPlusTheme, getThemeById, lightPlusTheme, themeOptions } from './theme.config'

describe('theme registry', () => {
  it('returns the requested theme when the id is known', () => {
    expect(getThemeById('light-plus')).toEqual(lightPlusTheme)
  })

  it('falls back to dark-plus for unknown theme ids', () => {
    expect(getThemeById('unknown-theme')).toEqual(darkPlusTheme)
  })

  it('exposes both selectable theme options', () => {
    expect(themeOptions).toEqual([
      { value: 'dark-plus', label: 'Dark+' },
      { value: 'light-plus', label: 'Light+' }
    ])
  })
})
```

```json
// package.json (replace scripts + devDependencies blocks)
{
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "lint": "eslint src/",
    "format": "prettier --write src/",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@electron-toolkit/preload": "^3.0.0",
    "@electron-toolkit/utils": "^4.0.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@typescript-eslint/eslint-plugin": "^8.58.1",
    "@typescript-eslint/parser": "^8.58.1",
    "@vitejs/plugin-react": "^4.3.0",
    "electron": "^39.8.7",
    "electron-vite": "^5.0.0",
    "eslint": "^9.0.0",
    "eslint-plugin-react": "^7.37.5",
    "eslint-plugin-react-hooks": "^7.0.1",
    "jsdom": "^26.1.0",
    "prettier": "^3.4.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 2: Install the new test dependencies**

Run: `npm install`
Expected: npm adds `vitest`, `jsdom`, and Testing Library packages without changing runtime dependencies.

- [ ] **Step 3: Run the new test to verify it fails**

Run: `npx vitest run src/shared/config/theme.config.test.ts`
Expected: FAIL with errors like `No exported member 'getThemeById'` and `No exported member 'lightPlusTheme'`.

- [ ] **Step 4: Implement the theme registry and typed theme id**

```ts
// src/shared/config/theme.config.ts
export interface ITheme {
  bgTitlebar: string
  textTitlebar: string
  bgActivitybar: string
  activitybarFgActive: string
  activitybarFgInactive: string
  activitybarBadgeBg: string
  bgEditor: string
  fgEditor: string
  bgTabsContainer: string
  bgTabActive: string
  bgTabInactive: string
  fgTabActive: string
  fgTabInactive: string
  tabBorder: string
  tabActiveBorderBottom: string
  tabActiveBorderTop: string
  bgSidebar: string
  fgSidebar: string
  fgSidebarTitle: string
  bgStatusbar: string
  fgStatusbar: string
  borderColor: string
  bgHover: string
  bgActive: string
  focusBorder: string
  menuBackground: string
  menuForeground: string
  menuSelectionBackground: string
  menuSelectionForeground: string
  menuBorder: string
  menuSeparatorBackground: string
  terminalBackground: string
  terminalForeground: string
  terminalCursor: string
  terminalSelectionBackground: string
}

export type ThemeId = 'dark-plus' | 'light-plus'

export const darkPlusTheme: ITheme = {
  bgTitlebar: '#3c3c3c',
  textTitlebar: '#cccccc',
  bgActivitybar: '#333333',
  activitybarFgActive: '#ffffff',
  activitybarFgInactive: 'rgba(255, 255, 255, 0.4)',
  activitybarBadgeBg: '#007acc',
  bgEditor: '#1e1e1e',
  fgEditor: '#d4d4d4',
  bgTabsContainer: '#252526',
  bgTabActive: '#1e1e1e',
  bgTabInactive: '#2d2d2d',
  fgTabActive: '#ffffff',
  fgTabInactive: 'rgba(255, 255, 255, 0.5)',
  tabBorder: '#252526',
  tabActiveBorderBottom: '#1e1e1e',
  tabActiveBorderTop: '#007acc',
  bgSidebar: '#252526',
  fgSidebar: '#cccccc',
  fgSidebarTitle: '#bbbbbb',
  bgStatusbar: '#007acc',
  fgStatusbar: '#ffffff',
  borderColor: '#414141',
  bgHover: 'rgba(90, 93, 94, 0.31)',
  bgActive: 'rgba(255, 255, 255, 0.12)',
  focusBorder: '#007fd4',
  menuBackground: '#252526',
  menuForeground: '#cccccc',
  menuSelectionBackground: '#0078d4',
  menuSelectionForeground: '#ffffff',
  menuBorder: '#454545',
  menuSeparatorBackground: '#454545',
  terminalBackground: '#1e1e1e',
  terminalForeground: '#cccccc',
  terminalCursor: '#ffffff',
  terminalSelectionBackground: '#264f78'
}

export const lightPlusTheme: ITheme = {
  bgTitlebar: '#dddddd',
  textTitlebar: '#333333',
  bgActivitybar: '#f3f3f3',
  activitybarFgActive: '#424242',
  activitybarFgInactive: 'rgba(66, 66, 66, 0.55)',
  activitybarBadgeBg: '#007acc',
  bgEditor: '#ffffff',
  fgEditor: '#333333',
  bgTabsContainer: '#f3f3f3',
  bgTabActive: '#ffffff',
  bgTabInactive: '#ececec',
  fgTabActive: '#333333',
  fgTabInactive: 'rgba(51, 51, 51, 0.7)',
  tabBorder: '#e5e5e5',
  tabActiveBorderBottom: '#ffffff',
  tabActiveBorderTop: '#005fb8',
  bgSidebar: '#f3f3f3',
  fgSidebar: '#3c3c3c',
  fgSidebarTitle: '#6f6f6f',
  bgStatusbar: '#007acc',
  fgStatusbar: '#ffffff',
  borderColor: '#e5e5e5',
  bgHover: 'rgba(0, 0, 0, 0.04)',
  bgActive: 'rgba(0, 0, 0, 0.08)',
  focusBorder: '#0090f1',
  menuBackground: '#ffffff',
  menuForeground: '#333333',
  menuSelectionBackground: '#0060c0',
  menuSelectionForeground: '#ffffff',
  menuBorder: '#c8c8c8',
  menuSeparatorBackground: '#e5e5e5',
  terminalBackground: '#ffffff',
  terminalForeground: '#333333',
  terminalCursor: '#333333',
  terminalSelectionBackground: '#add6ff'
}

export const themesById: Record<ThemeId, ITheme> = {
  'dark-plus': darkPlusTheme,
  'light-plus': lightPlusTheme
}

export const themeOptions: Array<{ value: ThemeId; label: string }> = [
  { value: 'dark-plus', label: 'Dark+' },
  { value: 'light-plus', label: 'Light+' }
]

export function getThemeById(themeId: string | undefined): ITheme {
  if (themeId === 'light-plus') {
    return lightPlusTheme
  }

  return darkPlusTheme
}
```

```ts
// src/shared/types/store.ts
import type { ThemeId } from '@shared/config/theme.config'

export interface ISettings {
  fontSize: number
  fontFamily: string
  shellPath: string
  loginShell: boolean
  theme: ThemeId
}

export interface IConnectionItem {
  id: string
  name: string
  type: 'local' | 'ssh'
  folderId?: string
  host?: string
  port?: number
  username?: string
  authType?: 'password' | 'privateKey'
  encryptedPassword?: string
  privateKeyPath?: string
  encryptedPassphrase?: string
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

- [ ] **Step 5: Run the theme registry test to verify it passes**

Run: `npx vitest run src/shared/config/theme.config.test.ts`
Expected: PASS with `3 passed`.

- [ ] **Step 6: Commit**

```bash
git add package.json vitest.config.ts src/test/setup.ts src/shared/config/theme.config.ts src/shared/config/theme.config.test.ts src/shared/types/store.ts
git commit -m "test: add theme registry coverage"
```

### Task 2: Add settings store hydration and startup theme bootstrap

**Files:**
- Create: `src/renderer/stores/settings.store.ts`
- Create: `src/renderer/stores/settings.store.test.ts`
- Modify: `src/renderer/main.tsx:1-15`
- Modify: `src/renderer/App.tsx:1-15`

- [ ] **Step 1: Write the failing settings store test**

```ts
// src/renderer/stores/settings.store.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/types/store'
import { lightPlusTheme } from '@shared/config/theme.config'
import { useSettingsStore } from './settings.store'

const applyTheme = vi.fn()

vi.mock('../utils/theme', () => ({
  applyTheme
}))

describe('settings store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.storeApi = {
      get: vi.fn().mockResolvedValue({ theme: 'light-plus', fontSize: 16 }),
      set: vi.fn(),
      getAll: vi.fn()
    } as Window['storeApi']

    useSettingsStore.setState({
      settings: DEFAULT_SETTINGS,
      initialized: false,
      init: useSettingsStore.getState().init,
      updateSettings: useSettingsStore.getState().updateSettings
    })
  })

  it('hydrates saved settings and applies the stored theme', async () => {
    await useSettingsStore.getState().init()

    expect(window.storeApi.get).toHaveBeenCalledWith('settings')
    expect(useSettingsStore.getState().settings).toMatchObject({
      theme: 'light-plus',
      fontSize: 16,
      fontFamily: DEFAULT_SETTINGS.fontFamily
    })
    expect(applyTheme).toHaveBeenCalledWith(lightPlusTheme)
  })

  it('persists merged updates and reapplies the selected theme', () => {
    useSettingsStore.getState().updateSettings({ theme: 'light-plus' })

    expect(window.storeApi.set).toHaveBeenCalledWith('settings', {
      ...DEFAULT_SETTINGS,
      theme: 'light-plus'
    })
    expect(applyTheme).toHaveBeenCalledWith(lightPlusTheme)
  })
})
```

- [ ] **Step 2: Run the settings store test to verify it fails**

Run: `npx vitest run src/renderer/stores/settings.store.test.ts`
Expected: FAIL with `Cannot find module './settings.store'`.

- [ ] **Step 3: Implement settings hydration, persistence, and startup bootstrap**

```ts
// src/renderer/stores/settings.store.ts
import { create } from 'zustand'
import { DEFAULT_SETTINGS, type ISettings } from '@shared/types/store'
import { getThemeById } from '@shared/config/theme.config'
import { applyTheme } from '../utils/theme'

interface SettingsState {
  settings: ISettings
  initialized: boolean
  init: () => Promise<void>
  updateSettings: (patch: Partial<ISettings>) => void
}

function normalizeSettings(stored: Partial<ISettings> | undefined): ISettings {
  return {
    ...DEFAULT_SETTINGS,
    ...stored
  }
}

function applySettings(settings: ISettings): void {
  applyTheme(getThemeById(settings.theme))
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  initialized: false,

  init: async () => {
    if (get().initialized) {
      return
    }

    const stored = await window.storeApi.get('settings').catch(() => DEFAULT_SETTINGS)
    const settings = normalizeSettings(stored)
    applySettings(settings)
    set({ settings, initialized: true })
  },

  updateSettings: (patch) => {
    const next = normalizeSettings({
      ...get().settings,
      ...patch
    })

    applySettings(next)
    window.storeApi.set('settings', next)
    set({ settings: next })
  }
}))
```

```ts
// src/renderer/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { DEFAULT_SETTINGS } from '@shared/types/store'
import { getThemeById } from '@shared/config/theme.config'
import { applyTheme } from './utils/theme'
import './styles/global.css'

async function bootstrap() {
  const stored = await window.storeApi.get('settings').catch(() => DEFAULT_SETTINGS)
  const settings = {
    ...DEFAULT_SETTINGS,
    ...stored
  }

  applyTheme(getThemeById(settings.theme))

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

void bootstrap()
```

```ts
// src/renderer/App.tsx
import { useEffect } from 'react'
import { Workbench } from './components/workbench/Workbench'
import { useConnectionsStore } from './stores/connections.store'
import { useSettingsStore } from './stores/settings.store'

function App() {
  const initConnections = useConnectionsStore((s) => s.init)
  const initSettings = useSettingsStore((s) => s.init)

  useEffect(() => {
    void initSettings()
    void initConnections()
  }, [initConnections, initSettings])

  return <Workbench />
}

export default App
```

- [ ] **Step 4: Run the settings store test to verify it passes**

Run: `npx vitest run src/renderer/stores/settings.store.test.ts`
Expected: PASS with `2 passed`.

- [ ] **Step 5: Run type-checking on the new bootstrap/store path**

Run: `npx tsc --noEmit`
Expected: PASS with no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/stores/settings.store.ts src/renderer/stores/settings.store.test.ts src/renderer/main.tsx src/renderer/App.tsx
git commit -m "feat: hydrate renderer settings"
```

### Task 3: Add main-area view switching without unmounting terminals

**Files:**
- Create: `src/renderer/stores/workbench.store.test.ts`
- Create: `src/renderer/components/workbench/TerminalWorkspace.tsx`
- Modify: `src/renderer/stores/workbench.store.ts:1-37`
- Modify: `src/renderer/components/workbench/MainArea.tsx:1-11`
- Modify: `src/renderer/components/workbench/ActivityBar.tsx:1-31`
- Modify: `src/renderer/components/terminal/TerminalPanel.tsx:1-52`
- Modify: `src/renderer/styles/workbench.css:91-98`

- [ ] **Step 1: Write the failing workbench store test**

```ts
// src/renderer/stores/workbench.store.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { LAYOUT } from '@shared/config/layout.config'
import { useWorkbenchStore } from './workbench.store'

describe('workbench store', () => {
  beforeEach(() => {
    useWorkbenchStore.setState({
      sidebarVisible: true,
      sidebarWidth: LAYOUT.sidebar.defaultWidth,
      activeViewId: 'terminal',
      activeMainView: 'terminal',
      toggleSidebar: useWorkbenchStore.getState().toggleSidebar,
      setSidebarWidth: useWorkbenchStore.getState().setSidebarWidth,
      setActiveView: useWorkbenchStore.getState().setActiveView,
      openSettingsView: useWorkbenchStore.getState().openSettingsView,
      openTerminalView: useWorkbenchStore.getState().openTerminalView
    })
  })

  it('opens settings without changing the selected sidebar view', () => {
    useWorkbenchStore.getState().openSettingsView()

    expect(useWorkbenchStore.getState().activeMainView).toBe('settings')
    expect(useWorkbenchStore.getState().activeViewId).toBe('terminal')
  })

  it('returns to the terminal main view when a sidebar icon is selected', () => {
    useWorkbenchStore.getState().openSettingsView()
    useWorkbenchStore.getState().setActiveView('connections')

    expect(useWorkbenchStore.getState().activeMainView).toBe('terminal')
    expect(useWorkbenchStore.getState().activeViewId).toBe('connections')
  })
})
```

- [ ] **Step 2: Run the workbench store test to verify it fails**

Run: `npx vitest run src/renderer/stores/workbench.store.test.ts`
Expected: FAIL with `Property 'activeMainView' does not exist`.

- [ ] **Step 3: Implement main-area view state and keep-mounted terminal workspace**

```ts
// src/renderer/stores/workbench.store.ts
import { create } from 'zustand'
import { LAYOUT } from '@shared/config/layout.config'

interface WorkbenchState {
  sidebarVisible: boolean
  sidebarWidth: number
  activeViewId: string
  activeMainView: 'terminal' | 'settings'
  toggleSidebar: () => void
  setSidebarWidth: (width: number) => void
  setActiveView: (id: string) => void
  openSettingsView: () => void
  openTerminalView: () => void
}

export const useWorkbenchStore = create<WorkbenchState>((set, get) => ({
  sidebarVisible: true,
  sidebarWidth: LAYOUT.sidebar.defaultWidth,
  activeViewId: 'terminal',
  activeMainView: 'terminal',

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
      set({ sidebarVisible: false, activeMainView: 'terminal' })
    } else {
      set({ activeViewId: id, sidebarVisible: true, activeMainView: 'terminal' })
    }
  },

  openSettingsView: () => set({ activeMainView: 'settings' }),
  openTerminalView: () => set({ activeMainView: 'terminal' })
}))
```

```tsx
// src/renderer/components/workbench/TerminalWorkspace.tsx
import { TerminalTabs } from '../terminal/TerminalTabs'
import { TerminalPanel } from '../terminal/TerminalPanel'

interface TerminalWorkspaceProps {
  visible: boolean
}

export function TerminalWorkspace({ visible }: TerminalWorkspaceProps) {
  return (
    <div className={`main-area__view ${visible ? '' : 'main-area__view--hidden'}`}>
      <TerminalTabs />
      <TerminalPanel workspaceVisible={visible} />
    </div>
  )
}
```

```tsx
// src/renderer/components/workbench/MainArea.tsx
import { TerminalWorkspace } from './TerminalWorkspace'
import { SettingsView } from '../settings/SettingsView'
import { useWorkbenchStore } from '../../stores/workbench.store'

export function MainArea() {
  const activeMainView = useWorkbenchStore((state) => state.activeMainView)

  return (
    <div className="main-area">
      <TerminalWorkspace visible={activeMainView === 'terminal'} />
      <SettingsView visible={activeMainView === 'settings'} />
    </div>
  )
}
```

```tsx
// src/renderer/components/workbench/ActivityBar.tsx
import { useWorkbenchStore } from '../../stores/workbench.store'

export function ActivityBar() {
  const { activeViewId, sidebarVisible, activeMainView, setActiveView, openSettingsView } =
    useWorkbenchStore()

  const items = [
    { id: 'terminal', icon: 'codicon-terminal', title: 'Terminal' },
    { id: 'connections', icon: 'codicon-remote-explorer', title: 'Remote Connections' }
  ]

  return (
    <div className="activitybar">
      <div className="activitybar__top">
        {items.map((item) => (
          <div
            key={item.id}
            className={`activitybar__item ${item.id === activeViewId && sidebarVisible ? 'activitybar__item--active' : ''}`}
            title={item.title}
            onClick={() => setActiveView(item.id)}
          >
            <i className={`codicon ${item.icon}`} />
          </div>
        ))}
      </div>
      <div className="activitybar__bottom">
        <div
          className={`activitybar__item ${activeMainView === 'settings' ? 'activitybar__item--active' : ''}`}
          title="Settings"
          onClick={openSettingsView}
        >
          <i className="codicon codicon-settings-gear" />
        </div>
      </div>
    </div>
  )
}
```

```tsx
// src/renderer/components/terminal/TerminalPanel.tsx
import { useCallback, useEffect, useRef } from 'react'
import { useTerminalStore } from '../../stores/terminal.store'
import { TerminalPaneTree } from './TerminalPaneTree'

interface TerminalPanelProps {
  workspaceVisible: boolean
}

export function TerminalPanel({ workspaceVisible }: TerminalPanelProps) {
  const tabs = useTerminalStore((state) => state.tabs)
  const activeTabId = useTerminalStore((state) => state.activeTabId)
  const addTab = useTerminalStore((state) => state.addTab)
  const initializedRef = useRef(false)

  const createTerminal = useCallback(() => {
    const tempId = -Date.now()
    addTab(tempId)
    return tempId
  }, [addTab])

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true
      if (useTerminalStore.getState().tabs.length === 0) {
        createTerminal()
      }
    }
  }, [createTerminal])

  useEffect(() => {
    const handler = () => createTerminal()
    window.addEventListener('zterm:new-terminal', handler)
    return () => window.removeEventListener('zterm:new-terminal', handler)
  }, [createTerminal])

  return (
    <div className="terminal-panel">
      {tabs.map((tab) => (
        <div
          className={`terminal-panel__tab-content ${tab.id === activeTabId ? '' : 'terminal-panel__tab-content--hidden'}`}
          key={tab.id}
        >
          <TerminalPaneTree
            activePaneId={tab.activePaneId}
            rootPaneId={tab.rootPaneId}
            tabId={tab.id}
            visible={workspaceVisible && tab.id === activeTabId}
          />
        </div>
      ))}
    </div>
  )
}
```

```css
/* src/renderer/styles/workbench.css - add after .main-area */
.main-area__view {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.main-area__view--hidden {
  display: none;
}
```

- [ ] **Step 4: Run the workbench store test to verify it passes**

Run: `npx vitest run src/renderer/stores/workbench.store.test.ts`
Expected: PASS with `2 passed`.

- [ ] **Step 5: Run type-checking on the workbench changes**

Run: `npx tsc --noEmit`
Expected: PASS with no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/stores/workbench.store.ts src/renderer/stores/workbench.store.test.ts src/renderer/components/workbench/MainArea.tsx src/renderer/components/workbench/ActivityBar.tsx src/renderer/components/workbench/TerminalWorkspace.tsx src/renderer/components/terminal/TerminalPanel.tsx src/renderer/styles/workbench.css
git commit -m "feat: add settings main-area routing"
```

### Task 4: Build the Settings View UI

**Files:**
- Create: `src/renderer/components/settings/SettingsView.tsx`
- Create: `src/renderer/components/settings/SettingsView.test.tsx`
- Create: `src/renderer/styles/settings.css`

- [ ] **Step 1: Write the failing Settings View interaction test**

```tsx
// src/renderer/components/settings/SettingsView.test.tsx
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DEFAULT_SETTINGS } from '@shared/types/store'
import { useSettingsStore } from '../../stores/settings.store'
import { useWorkbenchStore } from '../../stores/workbench.store'
import { SettingsView } from './SettingsView'

describe('SettingsView', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      settings: DEFAULT_SETTINGS,
      initialized: true,
      init: vi.fn(),
      updateSettings: vi.fn()
    })

    useWorkbenchStore.setState({
      ...useWorkbenchStore.getState(),
      openTerminalView: vi.fn()
    })
  })

  it('updates theme and login shell settings and supports returning to terminal', async () => {
    const user = userEvent.setup()
    render(<SettingsView visible />)

    await user.selectOptions(screen.getByLabelText('Theme'), 'light-plus')
    expect(useSettingsStore.getState().updateSettings).toHaveBeenCalledWith({ theme: 'light-plus' })

    await user.click(screen.getByLabelText('Login Shell'))
    expect(useSettingsStore.getState().updateSettings).toHaveBeenCalledWith({ loginShell: false })

    await user.click(screen.getByRole('button', { name: 'Back to Terminal' }))
    expect(useWorkbenchStore.getState().openTerminalView).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the Settings View test to verify it fails**

Run: `npx vitest run src/renderer/components/settings/SettingsView.test.tsx`
Expected: FAIL with `Cannot find module './SettingsView'`.

- [ ] **Step 3: Implement the Settings View and styles**

```tsx
// src/renderer/components/settings/SettingsView.tsx
import { themeOptions } from '@shared/config/theme.config'
import { useSettingsStore } from '../../stores/settings.store'
import { useWorkbenchStore } from '../../stores/workbench.store'
import '../../styles/settings.css'

interface SettingsViewProps {
  visible: boolean
}

export function SettingsView({ visible }: SettingsViewProps) {
  const settings = useSettingsStore((state) => state.settings)
  const updateSettings = useSettingsStore((state) => state.updateSettings)
  const openTerminalView = useWorkbenchStore((state) => state.openTerminalView)

  return (
    <div className={`main-area__view settings-view ${visible ? '' : 'main-area__view--hidden'}`}>
      <div className="settings-view__header">
        <button className="settings-view__back" onClick={openTerminalView} type="button">
          Back to Terminal
        </button>
        <div>
          <h1 className="settings-view__title">Settings</h1>
          <p className="settings-view__subtitle">Configure terminal behavior and appearance.</p>
        </div>
      </div>

      <div className="settings-view__content">
        <section className="settings-section">
          <h2 className="settings-section__title">Terminal</h2>

          <label className="settings-field">
            <span className="settings-field__label">Font Family</span>
            <input
              aria-label="Font Family"
              className="settings-field__control"
              onChange={(event) => updateSettings({ fontFamily: event.target.value })}
              type="text"
              value={settings.fontFamily}
            />
          </label>

          <label className="settings-field">
            <span className="settings-field__label">Font Size</span>
            <input
              aria-label="Font Size"
              className="settings-field__control"
              min={6}
              onChange={(event) => {
                const next = Number(event.target.value)
                if (Number.isFinite(next) && next >= 6) {
                  updateSettings({ fontSize: next })
                }
              }}
              type="number"
              value={settings.fontSize}
            />
          </label>

          <label className="settings-field">
            <span className="settings-field__label">Shell Path</span>
            <input
              aria-label="Shell Path"
              className="settings-field__control"
              onChange={(event) => updateSettings({ shellPath: event.target.value })}
              placeholder="Use system default shell"
              type="text"
              value={settings.shellPath}
            />
          </label>

          <label className="settings-field settings-field--checkbox">
            <span className="settings-field__label">Login Shell</span>
            <input
              aria-label="Login Shell"
              checked={settings.loginShell}
              onChange={(event) => updateSettings({ loginShell: event.target.checked })}
              type="checkbox"
            />
          </label>

          <p className="settings-field__hint">Shell path and login shell only affect newly created terminals.</p>
        </section>

        <section className="settings-section">
          <h2 className="settings-section__title">Appearance</h2>

          <label className="settings-field">
            <span className="settings-field__label">Theme</span>
            <select
              aria-label="Theme"
              className="settings-field__control"
              onChange={(event) => updateSettings({ theme: event.target.value as 'dark-plus' | 'light-plus' })}
              value={settings.theme}
            >
              {themeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </section>
      </div>
    </div>
  )
}
```

```css
/* src/renderer/styles/settings.css */
.settings-view {
  background: var(--bg-editor);
  color: var(--fg-editor);
  overflow-y: auto;
}

.settings-view__header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 24px 32px 16px;
  border-bottom: 1px solid var(--border-color);
}

.settings-view__back {
  appearance: none;
  border: 1px solid var(--border-color);
  background: var(--bg-tabs-container);
  color: var(--fg-editor);
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
}

.settings-view__back:hover {
  background: var(--bg-hover);
}

.settings-view__title {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
}

.settings-view__subtitle {
  margin: 8px 0 0;
  color: var(--fg-sidebar-title);
  font-size: 13px;
}

.settings-view__content {
  padding: 24px 32px 40px;
  display: grid;
  gap: 24px;
  max-width: 760px;
}

.settings-section {
  display: grid;
  gap: 16px;
  padding: 20px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: color-mix(in srgb, var(--bg-editor) 92%, var(--bg-sidebar));
}

.settings-section__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.settings-field {
  display: grid;
  gap: 8px;
}

.settings-field--checkbox {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.settings-field__label {
  font-size: 13px;
  font-weight: 500;
}

.settings-field__control {
  width: 100%;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-editor);
  color: var(--fg-editor);
  padding: 8px 10px;
  font: inherit;
}

.settings-field__control:focus {
  outline: 1px solid var(--focus-border);
  border-color: var(--focus-border);
}

.settings-field__hint {
  margin: 0;
  font-size: 12px;
  color: var(--fg-sidebar-title);
}
```

- [ ] **Step 4: Run the Settings View test to verify it passes**

Run: `npx vitest run src/renderer/components/settings/SettingsView.test.tsx`
Expected: PASS with `1 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/settings/SettingsView.tsx src/renderer/components/settings/SettingsView.test.tsx src/renderer/styles/settings.css
git commit -m "feat: add basic settings view"
```

### Task 5: Wire terminal settings into PTY creation and live xterm updates

**Files:**
- Create: `src/main/services/shell-launch.ts`
- Create: `src/main/services/shell-launch.test.ts`
- Modify: `src/shared/types/terminal.ts:1-17`
- Modify: `src/renderer/components/terminal/TerminalInstance.tsx:1-223`
- Modify: `src/main/services/pty.service.ts:1-65`
- Modify: `src/main/ipc/terminal.ipc.ts:1-42`

- [ ] **Step 1: Write the failing shell-launch helper test**

```ts
// src/main/services/shell-launch.test.ts
import { describe, expect, it } from 'vitest'
import { resolveShellLaunch } from './shell-launch'

describe('resolveShellLaunch', () => {
  it('uses the requested shell path when provided', () => {
    expect(resolveShellLaunch({ cols: 80, rows: 24, shell: ' /bin/bash ', loginShell: false }, '/bin/zsh')).toEqual({
      shell: '/bin/bash',
      args: []
    })
  })

  it('falls back to the default shell and enables login shell by default', () => {
    expect(resolveShellLaunch({ cols: 80, rows: 24 }, '/bin/zsh')).toEqual({
      shell: '/bin/zsh',
      args: ['-l']
    })
  })
})
```

- [ ] **Step 2: Run the shell-launch test to verify it fails**

Run: `npx vitest run src/main/services/shell-launch.test.ts`
Expected: FAIL with `Cannot find module './shell-launch'`.

- [ ] **Step 3: Implement shell launch resolution and runtime terminal settings**

```ts
// src/shared/types/terminal.ts
export interface IShellOptions {
  cols: number
  rows: number
  cwd?: string
  shell?: string
  loginShell?: boolean
  env?: Record<string, string>
}

export interface ITerminalData {
  id: number
  data: string
}

export interface ITerminalExit {
  id: number
  code: number | undefined
}
```

```ts
// src/main/services/shell-launch.ts
import { SHELL_DEFAULTS } from '@shared/config/shell.config'
import type { IShellOptions } from '@shared/types/terminal'

export function resolveShellLaunch(options: IShellOptions, fallbackShell: string) {
  const requestedShell = options.shell?.trim()

  return {
    shell: requestedShell && requestedShell.length > 0 ? requestedShell : fallbackShell,
    args: (options.loginShell ?? SHELL_DEFAULTS.loginShell) ? ['-l'] : []
  }
}
```

```ts
// src/main/services/pty.service.ts
import * as pty from 'node-pty'
import { IShellOptions } from '@shared/types/terminal'
import { ITerminalService } from '@shared/types/services'
import os from 'os'
import { resolveShellLaunch } from './shell-launch'

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
    const { shell, args } = resolveShellLaunch(options, this.getDefaultShell())
    const cwd = options.cwd || os.homedir()

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

```ts
// src/main/ipc/terminal.ipc.ts
import { ipcMain, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { IShellOptions } from '@shared/types/terminal'
import { ITerminalService } from '@shared/types/services'

export function registerTerminalIpc(
  terminalService: ITerminalService,
  getWindow: () => BrowserWindow | null
) {
  ipcMain.handle(IPC_CHANNELS.TERMINAL_CREATE, (_event, options: IShellOptions) => {
    try {
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
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to create terminal')
    }
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

```tsx
// src/renderer/components/terminal/TerminalInstance.tsx
import { useCallback, useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'
import { getThemeById } from '@shared/config/theme.config'
import { useSettingsStore } from '../../stores/settings.store'
import '@xterm/xterm/css/xterm.css'

const SPLIT_RESIZE_START_EVENT = 'zterm:split-resize-start'
const SPLIT_RESIZE_END_EVENT = 'zterm:split-resize-end'

interface TerminalInstanceProps {
  sessionId: string
  active: boolean
  visible: boolean
}

export function TerminalInstance({ sessionId, active, visible }: TerminalInstanceProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const ptyIdRef = useRef<number | null>(null)
  const visibleRef = useRef(visible)
  const splitDraggingRef = useRef(document.body.dataset.ztermSplitDragging === 'true')
  const fitFrameRef = useRef<number | null>(null)
  const fitDebounceRef = useRef<number | null>(null)
  const lastFitSizeRef = useRef<{ width: number; height: number } | null>(null)
  const fontFamily = useSettingsStore((state) => state.settings.fontFamily)
  const fontSize = useSettingsStore((state) => state.settings.fontSize)
  const themeId = useSettingsStore((state) => state.settings.theme)

  const clearScheduledFit = useCallback(() => {
    if (fitDebounceRef.current !== null) {
      window.clearTimeout(fitDebounceRef.current)
      fitDebounceRef.current = null
    }

    if (fitFrameRef.current !== null) {
      window.cancelAnimationFrame(fitFrameRef.current)
      fitFrameRef.current = null
    }
  }, [])

  const performFit = useCallback((force = false) => {
    const fitAddon = fitAddonRef.current
    const container = containerRef.current
    if (!fitAddon || !container) {
      return
    }

    const rect = container.getBoundingClientRect()
    const nextSize = {
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    }

    if (nextSize.width <= 0 || nextSize.height <= 0) {
      return
    }

    if (
      !force &&
      lastFitSizeRef.current &&
      lastFitSizeRef.current.width === nextSize.width &&
      lastFitSizeRef.current.height === nextSize.height
    ) {
      return
    }

    lastFitSizeRef.current = nextSize
    fitAddon.fit()
  }, [])

  const scheduleFit = useCallback(
    (immediate = false) => {
      if (immediate) {
        clearScheduledFit()
        fitFrameRef.current = window.requestAnimationFrame(() => {
          fitFrameRef.current = null
          performFit(true)
        })
        return
      }

      if (fitDebounceRef.current !== null || fitFrameRef.current !== null) {
        return
      }

      fitDebounceRef.current = window.setTimeout(() => {
        fitDebounceRef.current = null
        fitFrameRef.current = window.requestAnimationFrame(() => {
          fitFrameRef.current = null
          performFit()
        })
      }, 32)
    },
    [clearScheduledFit, performFit]
  )

  useEffect(() => {
    visibleRef.current = visible
  }, [visible])

  useEffect(() => {
    const handleSplitResizeStart = () => {
      splitDraggingRef.current = true
      clearScheduledFit()
    }

    const handleSplitResizeEnd = () => {
      splitDraggingRef.current = false
      if (visibleRef.current) {
        scheduleFit(true)
      }
    }

    window.addEventListener(SPLIT_RESIZE_START_EVENT, handleSplitResizeStart)
    window.addEventListener(SPLIT_RESIZE_END_EVENT, handleSplitResizeEnd)

    return () => {
      window.removeEventListener(SPLIT_RESIZE_START_EVENT, handleSplitResizeStart)
      window.removeEventListener(SPLIT_RESIZE_END_EVENT, handleSplitResizeEnd)
    }
  }, [clearScheduledFit, scheduleFit])

  useEffect(() => {
    if (!containerRef.current) return

    const initialTheme = getThemeById(themeId)
    const term = new Terminal({
      fontSize,
      fontFamily,
      theme: {
        background: initialTheme.terminalBackground,
        foreground: initialTheme.terminalForeground,
        cursor: initialTheme.terminalCursor,
        selectionBackground: initialTheme.terminalSelectionBackground
      },
      cursorBlink: true
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(containerRef.current)

    fitAddonRef.current = fitAddon
    termRef.current = term
    performFit(true)

    try {
      const webglAddon = new WebglAddon()
      webglAddon.onContextLoss(() => {
        webglAddon.dispose()
      })
      term.loadAddon(webglAddon)
    } catch {
      // WebGL not available — canvas renderer is used automatically
    }

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

    const { shellPath, loginShell } = useSettingsStore.getState().settings

    window.terminalApi
      .create({
        cols: term.cols,
        rows: term.rows,
        shell: shellPath.trim() || undefined,
        loginShell
      })
      .then((ptyId: number) => {
        ptyIdRef.current = ptyId

        term.onData((data) => {
          window.terminalApi.write(ptyId, data)
        })

        term.onResize(({ cols, rows }) => {
          window.terminalApi.resize(ptyId, cols, rows)
        })
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error)
        term.write(`\r\n[Failed to start shell: ${message}]`)
      })

    const resizeObserver = new ResizeObserver(() => {
      if (!visibleRef.current || splitDraggingRef.current) {
        return
      }

      scheduleFit()
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      clearScheduledFit()
      lastFitSizeRef.current = null
      removeDataListener()
      removeExitListener()
      resizeObserver.disconnect()
      if (ptyIdRef.current !== null) {
        window.terminalApi.kill(ptyIdRef.current)
      }
      term.dispose()
    }
  }, [clearScheduledFit, fontFamily, fontSize, performFit, scheduleFit, sessionId, themeId])

  useEffect(() => {
    const term = termRef.current
    if (!term) {
      return
    }

    const theme = getThemeById(themeId)
    term.options.fontFamily = fontFamily
    term.options.fontSize = fontSize
    term.options.theme = {
      background: theme.terminalBackground,
      foreground: theme.terminalForeground,
      cursor: theme.terminalCursor,
      selectionBackground: theme.terminalSelectionBackground
    }

    if (visibleRef.current) {
      scheduleFit(true)
    }
  }, [fontFamily, fontSize, scheduleFit, themeId])

  useEffect(() => {
    if (visible && fitAddonRef.current) {
      setTimeout(() => {
        scheduleFit(true)
        if (active) {
          termRef.current?.focus()
        }
      }, 0)
    }
  }, [active, scheduleFit, visible])

  return <div ref={containerRef} className="terminal-panel__instance" />
}
```

- [ ] **Step 4: Fix the mount effect dependency so changing font/theme does not recreate the PTY**

Replace the `TerminalInstance` mount effect dependencies and initial theme usage with this exact adjustment:

```tsx
const initialThemeRef = useRef(getThemeById(themeId))

useEffect(() => {
  if (!containerRef.current) return

  const initialTheme = initialThemeRef.current
  const term = new Terminal({
    fontSize,
    fontFamily,
    theme: {
      background: initialTheme.terminalBackground,
      foreground: initialTheme.terminalForeground,
      cursor: initialTheme.terminalCursor,
      selectionBackground: initialTheme.terminalSelectionBackground
    },
    cursorBlink: true
  })

  // ... keep the rest of the mount effect body unchanged ...
}, [clearScheduledFit, performFit, scheduleFit, sessionId])
```

This preserves live appearance updates via the second effect while ensuring PTY creation still happens only once per session.

- [ ] **Step 5: Run the shell-launch test to verify it passes**

Run: `npx vitest run src/main/services/shell-launch.test.ts`
Expected: PASS with `2 passed`.

- [ ] **Step 6: Run type-checking across the terminal stack**

Run: `npx tsc --noEmit`
Expected: PASS with no errors from `TerminalInstance`, `IShellOptions`, or `PtyService`.

- [ ] **Step 7: Commit**

```bash
git add src/shared/types/terminal.ts src/main/services/shell-launch.ts src/main/services/shell-launch.test.ts src/main/services/pty.service.ts src/main/ipc/terminal.ipc.ts src/renderer/components/terminal/TerminalInstance.tsx
git commit -m "feat: apply terminal settings at runtime"
```

### Task 6: Run full verification and manual GUI checks

**Files:**
- Verify only: previous task outputs

- [ ] **Step 1: Run the full automated test suite**

Run: `npm test`
Expected: PASS with all Vitest suites green.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: PASS with no ESLint errors.

- [ ] **Step 3: Run type-checking**

Run: `npx tsc --noEmit`
Expected: PASS with no TypeScript errors.

- [ ] **Step 4: Launch the app for manual verification**

Run: `npm run dev`
Expected: Electron app opens for manual validation.

- [ ] **Step 5: Perform the GUI verification checklist**

Check these exact behaviors:
- click the Activity Bar gear and confirm the settings page opens in the main area
- return to terminal and confirm existing terminal output/session survives the round-trip
- switch theme to `Light+` and confirm workbench, menus, and terminal colors change immediately
- change font family and font size and confirm the active terminal rerenders without opening a new tab
- change `Login Shell`, open a new terminal, and confirm the new terminal respects the setting while the existing one keeps running
- set a valid shell path, open a new terminal, and confirm it launches the requested shell
- set an invalid shell path, open a new terminal, and confirm the terminal shows `[Failed to start shell: ...]`
- restart the app and confirm the last saved settings are restored on launch

- [ ] **Step 6: Commit the verified feature branch state**

```bash
git add package.json vitest.config.ts src/test/setup.ts src/shared/config/theme.config.ts src/shared/config/theme.config.test.ts src/shared/types/store.ts src/shared/types/terminal.ts src/renderer/main.tsx src/renderer/App.tsx src/renderer/stores/settings.store.ts src/renderer/stores/settings.store.test.ts src/renderer/stores/workbench.store.ts src/renderer/stores/workbench.store.test.ts src/renderer/components/workbench/MainArea.tsx src/renderer/components/workbench/ActivityBar.tsx src/renderer/components/workbench/TerminalWorkspace.tsx src/renderer/components/settings/SettingsView.tsx src/renderer/components/settings/SettingsView.test.tsx src/renderer/components/terminal/TerminalPanel.tsx src/renderer/components/terminal/TerminalInstance.tsx src/renderer/styles/workbench.css src/renderer/styles/settings.css src/main/services/shell-launch.ts src/main/services/shell-launch.test.ts src/main/services/pty.service.ts src/main/ipc/terminal.ipc.ts
git commit -m "feat: add basic settings view"
```

---

## Self-Review

### Spec coverage
- main-area settings view: covered by Task 3 + Task 4
- keep terminal workspace mounted: covered by Task 3 (`TerminalWorkspace`, `workspaceVisible`)
- two themes and fallback: covered by Task 1
- startup theme restore before render: covered by Task 2
- renderer-side settings store: covered by Task 2
- live font/theme updates: covered by Task 5
- shell path/login shell only for new terminals: covered by Task 5
- invalid shell path feedback: covered by Task 5 + Task 6 manual validation

### Placeholder scan
- no `TBD`, `TODO`, or “similar to Task N” placeholders remain
- every code-writing step includes concrete code blocks
- every verification step includes exact commands and expected outcomes

### Type consistency
- `ThemeId` is introduced once in `theme.config.ts` and reused from `store.ts`
- `IShellOptions.loginShell` is added once in `terminal.ts` and consumed consistently in renderer/main
- `activeMainView` only uses `'terminal' | 'settings'` across store and components
