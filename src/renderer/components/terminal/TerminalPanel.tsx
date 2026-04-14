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
    // Use a temporary negative id as placeholder; TerminalInstance will get the real PTY id
    const tempId = -Date.now()
    addTab(tempId)
    return tempId
  }, [addTab])

  // Create first terminal on mount
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true
      if (useTerminalStore.getState().tabs.length === 0) {
        createTerminal()
      }
    }
  }, [createTerminal])

  // Listen for new terminal requests
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
