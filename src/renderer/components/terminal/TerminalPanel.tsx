import { useCallback, useEffect, useRef } from 'react'
import { useTerminalStore } from '../../stores/terminal.store'
import { TerminalPaneTree } from './TerminalPaneTree'

export interface CreateTerminalRequest {
  title?: string
  kind?: 'local' | 'ssh'
  connectionId?: string
}

interface TerminalPanelProps {
  workspaceVisible: boolean
}

export function TerminalPanel({ workspaceVisible }: TerminalPanelProps) {
  const tabs = useTerminalStore((state) => state.tabs)
  const activeTabId = useTerminalStore((state) => state.activeTabId)
  const addTab = useTerminalStore((state) => state.addTab)
  const initializedRef = useRef(false)

  const createTerminal = useCallback(
    (request?: CreateTerminalRequest) => {
      const tempId = -Date.now()
      addTab(tempId, request?.title, {
        kind: request?.kind,
        connectionId: request?.connectionId
      })
      return tempId
    },
    [addTab]
  )

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
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<CreateTerminalRequest | undefined>
      createTerminal(customEvent.detail)
    }
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
