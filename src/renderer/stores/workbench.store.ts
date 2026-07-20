import { create } from 'zustand'
import { LAYOUT } from '@shared/config/layout.config'

export type MainViewId = 'terminal' | 'settings'

interface WorkbenchState {
  sidebarVisible: boolean
  sidebarWidth: number
  tabExplorerVisible: boolean
  tabExplorerWidth: number
  activeViewId: MainViewId
  activeMainView: MainViewId
  connectionDialogOpen: boolean
  editingConnectionId: string | null
  statusMessage: string | null
  toggleSidebar: () => void
  setSidebarWidth: (width: number) => void
  toggleTabExplorer: () => void
  setTabExplorerWidth: (width: number) => void
  setActiveView: (id: MainViewId) => void
  openSettingsView: () => void
  openTerminalView: () => void
  openConnectionDialog: (connectionId?: string) => void
  closeConnectionDialog: () => void
  setStatusMessage: (message: string | null) => void
}

export const useWorkbenchStore = create<WorkbenchState>((set) => ({
  sidebarVisible: true,
  sidebarWidth: LAYOUT.sidebar.defaultWidth,
  tabExplorerVisible: true,
  tabExplorerWidth: LAYOUT.tabExplorer.defaultWidth,
  activeViewId: 'terminal',
  activeMainView: 'terminal',
  connectionDialogOpen: false,
  editingConnectionId: null,
  statusMessage: null,

  toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),

  setSidebarWidth: (width) => {
    if (width < LAYOUT.sidebar.autoHideThreshold) {
      set({ sidebarVisible: false })
    } else {
      const clamped = Math.max(LAYOUT.sidebar.minWidth, Math.min(LAYOUT.sidebar.maxWidth, width))
      set({ sidebarWidth: clamped, sidebarVisible: true })
    }
  },

  toggleTabExplorer: () => set((state) => ({ tabExplorerVisible: !state.tabExplorerVisible })),

  setTabExplorerWidth: (width) => {
    const clamped = Math.max(LAYOUT.tabExplorer.minWidth, Math.min(LAYOUT.tabExplorer.maxWidth, width))
    set({ tabExplorerWidth: clamped })
  },

  setActiveView: (id) =>
    set({
      activeViewId: id,
      activeMainView: id,
      connectionDialogOpen: false,
      editingConnectionId: null
    }),

  openSettingsView: () =>
    set({
      activeViewId: 'settings',
      activeMainView: 'settings',
      connectionDialogOpen: false,
      editingConnectionId: null
    }),

  openTerminalView: () =>
    set({
      activeViewId: 'terminal',
      activeMainView: 'terminal',
      connectionDialogOpen: false,
      editingConnectionId: null
    }),

  openConnectionDialog: (connectionId) =>
    set({
      activeViewId: 'terminal',
      sidebarVisible: true,
      activeMainView: 'terminal',
      connectionDialogOpen: true,
      editingConnectionId: connectionId ?? null
    }),

  closeConnectionDialog: () =>
    set({
      connectionDialogOpen: false,
      editingConnectionId: null
    }),

  setStatusMessage: (message) =>
    set({
      statusMessage: message
    })
}))
