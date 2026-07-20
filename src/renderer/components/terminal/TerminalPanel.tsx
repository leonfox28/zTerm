import { useCallback, useEffect, useRef, useState } from 'react'
import {
  splitActiveTerminalHorizontallyCommand,
  splitActiveTerminalVerticallyCommand
} from '../../commands/workbench.commands'
import { useTerminalStore } from '../../stores/terminal.store'
import { useWorkbenchStore } from '../../stores/workbench.store'
import { TabExplorer } from '../workbench/TabExplorer'
import { TerminalPaneTree } from './TerminalPaneTree'

export interface CreateTerminalRequest {
  title?: string
  kind?: 'local' | 'ssh'
  connectionId?: string
}

interface TerminalPanelProps {
  workspaceVisible: boolean
}

function TabExplorerSash() {
  const setTabExplorerWidth = useWorkbenchStore((state) => state.setTabExplorerWidth)
  const draggingRef = useRef(false)
  const [active, setActive] = useState(false)

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      draggingRef.current = true
      setActive(true)

      const startX = event.clientX
      const startWidth = useWorkbenchStore.getState().tabExplorerWidth

      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!draggingRef.current) {
          return
        }

        setTabExplorerWidth(startWidth - (moveEvent.clientX - startX))
      }

      const handleMouseUp = () => {
        draggingRef.current = false
        setActive(false)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [setTabExplorerWidth]
  )

  return (
    <div
      className={`terminal-tab-layout__sash ${active ? 'terminal-tab-layout__sash--active' : ''}`}
      onMouseDown={handleMouseDown}
    />
  )
}

function TerminalTabToolbar({ tabId }: { tabId: number }) {
  const setActiveTab = useTerminalStore((state) => state.setActiveTab)
  const tabExplorerVisible = useWorkbenchStore((state) => state.tabExplorerVisible)
  const toggleTabExplorer = useWorkbenchStore((state) => state.toggleTabExplorer)

  const runForTab = (action: () => void) => {
    setActiveTab(tabId)
    action()
  }

  return (
    <div className="terminal-tab-toolbar">
      <div className="terminal-tab-toolbar__left">
        <button
          className="terminal-tab-toolbar__button"
          onClick={() => runForTab(() => splitActiveTerminalVerticallyCommand())}
          title="Split Left/Right"
          type="button"
        >
          <i className="codicon codicon-split-horizontal" />
        </button>
        <button
          className="terminal-tab-toolbar__button"
          onClick={() => runForTab(() => splitActiveTerminalHorizontallyCommand())}
          title="Split Up/Down"
          type="button"
        >
          <i className="codicon codicon-split-vertical" />
        </button>
      </div>
      <div className="terminal-tab-toolbar__right">
        <button
          className="terminal-tab-toolbar__button"
          onClick={toggleTabExplorer}
          title={tabExplorerVisible ? 'Hide Explorer' : 'Show Explorer'}
          type="button"
        >
          <i className={`codicon ${tabExplorerVisible ? 'codicon-right-panel-hide' : 'codicon-right-panel-show'}`} />
        </button>
      </div>
    </div>
  )
}

export function TerminalPanel({ workspaceVisible }: TerminalPanelProps) {
  const tabs = useTerminalStore((state) => state.tabs)
  const activeTabId = useTerminalStore((state) => state.activeTabId)
  const addTab = useTerminalStore((state) => state.addTab)
  const tabExplorerVisible = useWorkbenchStore((state) => state.tabExplorerVisible)
  const tabExplorerWidth = useWorkbenchStore((state) => state.tabExplorerWidth)
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

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true
      if (useTerminalStore.getState().tabs.length === 0) {
        createTerminal()
      }
    }
  }, [createTerminal])

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
      {tabs.map((tab) => {
        const isActiveTab = tab.id === activeTabId
        const showExplorer = tabExplorerVisible

        return (
          <div
            className={`terminal-panel__tab-content ${isActiveTab ? '' : 'terminal-panel__tab-content--hidden'}`}
            key={tab.id}
          >
            <TerminalTabToolbar tabId={tab.id} />
            <div className="terminal-tab-layout">
              <div className="terminal-tab-layout__terminal">
                <TerminalPaneTree
                  activePaneId={tab.activePaneId}
                  rootPaneId={tab.rootPaneId}
                  tabId={tab.id}
                  visible={workspaceVisible && isActiveTab}
                />
              </div>
              {showExplorer ? (
                <>
                  <TabExplorerSash />
                  <div className="terminal-tab-layout__explorer" style={{ width: tabExplorerWidth }}>
                    <TabExplorer tabId={tab.id} visible={workspaceVisible && isActiveTab} />
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
