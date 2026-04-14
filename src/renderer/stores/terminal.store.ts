import { create } from 'zustand'

export type SplitDirection = 'horizontal' | 'vertical'
export type TerminalSessionKind = 'local' | 'ssh'

export interface TerminalTab {
  id: number
  title: string
  rootPaneId: string
  activePaneId: string
}

export interface TerminalSession {
  id: string
  title: string
  kind: TerminalSessionKind
  connectionId?: string
}

export interface TerminalLeafPane {
  id: string
  type: 'leaf'
  sessionId: string
}

export interface TerminalSplitPane {
  id: string
  type: 'split'
  direction: SplitDirection
  children: [string, string]
  ratios: [number, number]
}

export type TerminalPaneNode = TerminalLeafPane | TerminalSplitPane

interface TerminalState {
  tabs: TerminalTab[]
  activeTabId: number | null
  panes: Record<string, TerminalPaneNode>
  sessions: Record<string, TerminalSession>
  addTab: (id: number, title?: string, sessionOptions?: { kind?: TerminalSessionKind; connectionId?: string }) => void
  removeTab: (id: number) => void
  setActiveTab: (id: number) => void
  renameTab: (id: number, title: string) => void
  setActivePane: (tabId: number, paneId: string) => void
  splitPane: (tabId: number, paneId: string, direction: SplitDirection) => void
  splitActivePane: (tabId: number, direction: SplitDirection) => void
  closePane: (tabId: number, paneId: string) => void
  resizeSplit: (splitId: string, ratios: [number, number]) => void
}

const DEFAULT_SPLIT_RATIOS: [number, number] = [0.5, 0.5]
const MIN_SPLIT_RATIO = 0.1

let nextPaneId = 1
let nextSessionId = 1

function createPaneId(): string {
  return `pane-${nextPaneId++}`
}

function createSessionId(): string {
  return `session-${nextSessionId++}`
}

function normalizeRatios(ratios: [number, number]): [number, number] {
  const total = ratios[0] + ratios[1]
  if (total <= 0) {
    return DEFAULT_SPLIT_RATIOS
  }

  const first = Math.min(Math.max(ratios[0] / total, MIN_SPLIT_RATIO), 1 - MIN_SPLIT_RATIO)
  return [first, 1 - first]
}

function collectPaneTree(
  panes: Record<string, TerminalPaneNode>,
  rootPaneId: string,
  collectedPaneIds: string[],
  collectedSessionIds: string[]
): void {
  const node = panes[rootPaneId]
  if (!node) return

  collectedPaneIds.push(rootPaneId)

  if (node.type === 'leaf') {
    collectedSessionIds.push(node.sessionId)
    return
  }

  for (const childId of node.children) {
    collectPaneTree(panes, childId, collectedPaneIds, collectedSessionIds)
  }
}

function findParentSplitId(
  panes: Record<string, TerminalPaneNode>,
  currentPaneId: string,
  targetPaneId: string
): string | null {
  const node = panes[currentPaneId]
  if (!node || node.type === 'leaf') {
    return null
  }

  if (node.children.includes(targetPaneId)) {
    return node.id
  }

  for (const childId of node.children) {
    const parentId = findParentSplitId(panes, childId, targetPaneId)
    if (parentId) {
      return parentId
    }
  }

  return null
}

function findFirstLeafPaneId(
  panes: Record<string, TerminalPaneNode>,
  paneId: string
): string | null {
  const node = panes[paneId]
  if (!node) {
    return null
  }

  if (node.type === 'leaf') {
    return node.id
  }

  return findFirstLeafPaneId(panes, node.children[0]) ?? findFirstLeafPaneId(panes, node.children[1])
}

function createTabRemovalState(
  state: TerminalState,
  id: number
): TerminalState | Pick<TerminalState, 'tabs' | 'activeTabId' | 'panes' | 'sessions'> {
  const tab = state.tabs.find((item) => item.id === id)
  if (!tab) {
    return state
  }

  const paneIds: string[] = []
  const sessionIds: string[] = []
  collectPaneTree(state.panes, tab.rootPaneId, paneIds, sessionIds)

  const panes = { ...state.panes }
  const sessions = { ...state.sessions }

  for (const paneId of paneIds) {
    delete panes[paneId]
  }

  for (const sessionId of sessionIds) {
    delete sessions[sessionId]
  }

  const tabs = state.tabs.filter((item) => item.id !== id)
  const activeTabId =
    state.activeTabId === id ? (tabs.length > 0 ? tabs[tabs.length - 1].id : null) : state.activeTabId

  return {
    tabs,
    activeTabId,
    panes,
    sessions
  }
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  panes: {},
  sessions: {},

  addTab: (id, title, sessionOptions) =>
    set((state) => {
      const tabTitle = title ?? `Terminal ${id}`
      const sessionId = createSessionId()
      const paneId = createPaneId()

      return {
        tabs: [
          ...state.tabs,
          {
            id,
            title: tabTitle,
            rootPaneId: paneId,
            activePaneId: paneId
          }
        ],
        activeTabId: id,
        panes: {
          ...state.panes,
          [paneId]: {
            id: paneId,
            type: 'leaf',
            sessionId
          }
        },
        sessions: {
          ...state.sessions,
          [sessionId]: {
            id: sessionId,
            title: tabTitle,
            kind: sessionOptions?.kind ?? 'local',
            connectionId: sessionOptions?.connectionId
          }
        }
      }
    }),

  removeTab: (id) =>
    set((state) => createTabRemovalState(state, id)),

  setActiveTab: (id) => set({ activeTabId: id }),

  renameTab: (id, title) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, title } : tab))
    })),

  setActivePane: (tabId, paneId) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId && state.panes[paneId] ? { ...tab, activePaneId: paneId } : tab
      )
    })),

  splitPane: (tabId, paneId, direction) =>
    set((state) => {
      const tab = state.tabs.find((item) => item.id === tabId)
      const targetPane = state.panes[paneId]

      if (!tab || !targetPane || targetPane.type !== 'leaf') {
        return state
      }

      const sourceSession = state.sessions[targetPane.sessionId]
      const newSessionId = createSessionId()
      const newPaneId = createPaneId()
      const newSplitId = createPaneId()
      const parentSplitId = findParentSplitId(state.panes, tab.rootPaneId, paneId)

      const panes: Record<string, TerminalPaneNode> = {
        ...state.panes,
        [newPaneId]: {
          id: newPaneId,
          type: 'leaf',
          sessionId: newSessionId
        },
        [newSplitId]: {
          id: newSplitId,
          type: 'split',
          direction,
          children: [paneId, newPaneId],
          ratios: DEFAULT_SPLIT_RATIOS
        }
      }

      if (parentSplitId) {
        const parent = state.panes[parentSplitId]
        if (parent?.type === 'split') {
          panes[parentSplitId] = {
            ...parent,
            children: parent.children.map((childId) =>
              childId === paneId ? newSplitId : childId
            ) as [string, string]
          }
        }
      }

      return {
        tabs: state.tabs.map((item) => {
          if (item.id !== tabId) {
            return item
          }

          return {
            ...item,
            rootPaneId: item.rootPaneId === paneId ? newSplitId : item.rootPaneId,
            activePaneId: newPaneId
          }
        }),
        panes,
        sessions: {
          ...state.sessions,
          [newSessionId]: {
            id: newSessionId,
            title: sourceSession?.title ?? tab.title,
            kind: sourceSession?.kind ?? 'local',
            connectionId: sourceSession?.connectionId
          }
        }
      }
    }),

  splitActivePane: (tabId, direction) => {
    const tab = get().tabs.find((item) => item.id === tabId)
    if (!tab) {
      return
    }

    get().splitPane(tabId, tab.activePaneId, direction)
  },

  closePane: (tabId, paneId) =>
    set((state) => {
      const tab = state.tabs.find((item) => item.id === tabId)
      const targetPane = state.panes[paneId]

      if (!tab || !targetPane || targetPane.type !== 'leaf') {
        return state
      }

      if (tab.rootPaneId === paneId) {
        return createTabRemovalState(state, tabId)
      }

      const parentSplitId = findParentSplitId(state.panes, tab.rootPaneId, paneId)
      if (!parentSplitId) {
        return state
      }

      const parentSplit = state.panes[parentSplitId]
      if (!parentSplit || parentSplit.type !== 'split') {
        return state
      }

      const siblingId = parentSplit.children[0] === paneId ? parentSplit.children[1] : parentSplit.children[0]
      const siblingPane = state.panes[siblingId]
      if (!siblingPane) {
        return state
      }

      const fallbackActivePaneId = findFirstLeafPaneId(state.panes, siblingId)
      if (!fallbackActivePaneId) {
        return state
      }

      const parentOfParentSplitId = findParentSplitId(state.panes, tab.rootPaneId, parentSplitId)
      const panes = { ...state.panes }
      const sessions = { ...state.sessions }

      delete panes[paneId]
      delete panes[parentSplitId]
      delete sessions[targetPane.sessionId]

      if (parentOfParentSplitId) {
        const parentOfParentSplit = panes[parentOfParentSplitId]
        if (!parentOfParentSplit || parentOfParentSplit.type !== 'split') {
          return state
        }

        panes[parentOfParentSplitId] = {
          ...parentOfParentSplit,
          children: parentOfParentSplit.children.map((childId) =>
            childId === parentSplitId ? siblingId : childId
          ) as [string, string]
        }
      }

      return {
        panes,
        sessions,
        tabs: state.tabs.map((item) => {
          if (item.id !== tabId) {
            return item
          }

          const nextActivePaneId =
            item.activePaneId === paneId || !panes[item.activePaneId] ? fallbackActivePaneId : item.activePaneId

          return {
            ...item,
            rootPaneId: item.rootPaneId === parentSplitId ? siblingId : item.rootPaneId,
            activePaneId: nextActivePaneId
          }
        })
      }
    }),

  resizeSplit: (splitId, ratios) =>
    set((state) => {
      const split = state.panes[splitId]
      if (!split || split.type !== 'split') {
        return state
      }

      return {
        panes: {
          ...state.panes,
          [splitId]: {
            ...split,
            ratios: normalizeRatios(ratios)
          }
        }
      }
    })
}))
