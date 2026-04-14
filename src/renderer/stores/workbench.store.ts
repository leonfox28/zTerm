import { create } from 'zustand'
import { LAYOUT } from '@shared/config/layout.config'

export type MainViewId = 'terminal' | 'settings'

interface WorkbenchState {
  sidebarVisible: boolean
  sidebarWidth: number
  activeViewId: string
  activeMainView: MainViewId
  connectionDialogOpen: boolean
  editingConnectionId: string | null
  toggleSidebar: () => void
  setSidebarWidth: (width: number) => void
  setActiveView: (id: string) => void
  openSettingsView: () => void
  openTerminalView: () => void
  openConnectionDialog: (connectionId?: string) => void
  closeConnectionDialog: () => void
}

export const useWorkbenchStore = create<WorkbenchState>((set, get) => ({
  sidebarVisible: true,
  sidebarWidth: LAYOUT.sidebar.defaultWidth,
  activeViewId: 'terminal',
  activeMainView: 'terminal',
  connectionDialogOpen: false,
  editingConnectionId: null,

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
    if (id === state.activeViewId && state.sidebarVisible && state.activeMainView === 'terminal') {
      set({ sidebarVisible: false, connectionDialogOpen: false, editingConnectionId: null })
    } else {
      set({
        activeViewId: id,
        sidebarVisible: true,
        activeMainView: 'terminal',
        connectionDialogOpen: false,
        editingConnectionId: null
      })
    }
  },

  openSettingsView: () =>
    set({
      activeMainView: 'settings',
      connectionDialogOpen: false,
      editingConnectionId: null
    }),

  openTerminalView: () =>
    set({
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
    })
}))
