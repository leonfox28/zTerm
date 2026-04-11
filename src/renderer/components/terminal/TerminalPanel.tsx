import { useEffect, useRef, useCallback } from 'react'
import { useTerminalStore } from '../../stores/terminal.store'
import { TerminalInstance } from './TerminalInstance'

export function TerminalPanel() {
  const { tabs, activeTabId, addTab } = useTerminalStore()
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
      createTerminal()
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
        <TerminalInstance key={tab.id} tabId={tab.id} visible={tab.id === activeTabId} />
      ))}
    </div>
  )
}
