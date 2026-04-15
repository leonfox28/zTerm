import { useTerminalStore } from '../stores/terminal.store'

export interface TerminalClipboardRuntime {
  hasSelection: () => boolean
  copySelection: () => Promise<boolean>
  pasteClipboard: () => Promise<boolean>
}

const terminalClipboardRuntimes = new Map<string, TerminalClipboardRuntime>()

export function registerTerminalClipboardRuntime(sessionId: string, runtime: TerminalClipboardRuntime): () => void {
  terminalClipboardRuntimes.set(sessionId, runtime)

  return () => {
    const currentRuntime = terminalClipboardRuntimes.get(sessionId)
    if (currentRuntime === runtime) {
      terminalClipboardRuntimes.delete(sessionId)
    }
  }
}

export function getTerminalClipboardRuntime(sessionId: string): TerminalClipboardRuntime | null {
  return terminalClipboardRuntimes.get(sessionId) ?? null
}

export function getActiveTerminalClipboardRuntime(): TerminalClipboardRuntime | null {
  const { activeTabId, tabs, panes } = useTerminalStore.getState()
  if (activeTabId === null) {
    return null
  }

  const activeTab = tabs.find((tab) => tab.id === activeTabId)
  if (!activeTab) {
    return null
  }

  const activePane = panes[activeTab.activePaneId]
  if (!activePane || activePane.type !== 'leaf') {
    return null
  }

  return getTerminalClipboardRuntime(activePane.sessionId)
}
