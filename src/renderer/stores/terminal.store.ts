import { create } from 'zustand'

export interface TerminalTab {
  id: number
  title: string
}

interface TerminalState {
  tabs: TerminalTab[]
  activeTabId: number | null
  addTab: (id: number, title?: string) => void
  removeTab: (id: number) => void
  setActiveTab: (id: number) => void
  renameTab: (id: number, title: string) => void
}

export const useTerminalStore = create<TerminalState>((set) => ({
  tabs: [],
  activeTabId: null,

  addTab: (id, title) =>
    set((state) => ({
      tabs: [...state.tabs, { id, title: title || `Terminal ${id}` }],
      activeTabId: id
    })),

  removeTab: (id) =>
    set((state) => {
      const tabs = state.tabs.filter((t) => t.id !== id)
      const activeTabId =
        state.activeTabId === id ? (tabs.length > 0 ? tabs[tabs.length - 1].id : null) : state.activeTabId
      return { tabs, activeTabId }
    }),

  setActiveTab: (id) => set({ activeTabId: id }),

  renameTab: (id, title) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, title } : t))
    }))
}))
