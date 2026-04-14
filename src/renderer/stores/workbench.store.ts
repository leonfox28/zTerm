import { create } from 'zustand'
import { LAYOUT } from '@shared/config/layout.config'

export type MainViewId = 'terminal' | 'settings'

interface WorkbenchState {
  sidebarVisible: boolean
  sidebarWidth: number
  activeViewId: string
  activeMainView: MainViewId
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
    if (id === state.activeViewId && state.sidebarVisible && state.activeMainView === 'terminal') {
      set({ sidebarVisible: false })
    } else {
      set({ activeViewId: id, sidebarVisible: true, activeMainView: 'terminal' })
    }
  },

  openSettingsView: () => set({ activeMainView: 'settings' }),
  openTerminalView: () => set({ activeMainView: 'terminal' })
}))
