import { create } from 'zustand'

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
  sidebarWidth: 240,
  activeViewId: 'terminal',

  toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),

  setSidebarWidth: (width) => {
    if (width < 120) {
      set({ sidebarVisible: false })
    } else {
      const clamped = Math.max(170, Math.min(500, width))
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
