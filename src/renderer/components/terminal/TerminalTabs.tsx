import { useEffect, useRef } from 'react'
import { createNewTerminalCommand } from '../../commands/workbench.commands'
import { useTerminalStore } from '../../stores/terminal.store'
import '../../styles/terminal.css'

export function TerminalTabs() {
  const tabs = useTerminalStore((state) => state.tabs)
  const activeTabId = useTerminalStore((state) => state.activeTabId)
  const setActiveTab = useTerminalStore((state) => state.setActiveTab)
  const removeTab = useTerminalStore((state) => state.removeTab)
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeTabRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scroll = scrollRef.current
    const activeEl = activeTabRef.current
    if (!scroll || !activeEl) return

    const scrollRect = scroll.getBoundingClientRect()
    const tabRect = activeEl.getBoundingClientRect()

    const tabRelLeft = tabRect.left - scrollRect.left
    const tabRelRight = tabRect.right - scrollRect.left
    const containerWidth = scroll.clientWidth

    if (tabRelLeft < 0) {
      scroll.scrollLeft += tabRelLeft
    } else if (tabRelRight > containerWidth) {
      scroll.scrollLeft += tabRelRight - containerWidth
    }
  }, [activeTabId])

  const handleWheel = (e: React.WheelEvent) => {
    if (!scrollRef.current) return
    e.preventDefault()
    scrollRef.current.scrollLeft += e.deltaY !== 0 ? e.deltaY : e.deltaX
  }

  return (
    <div className="terminal-tabs">
      <div className="terminal-tabs__scroll" ref={scrollRef} onWheel={handleWheel}>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            ref={tab.id === activeTabId ? activeTabRef : null}
            className={`terminal-tabs__tab ${tab.id === activeTabId ? 'terminal-tabs__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <i className="codicon codicon-terminal" />
            <span>{tab.title}</span>
            <span
              className="terminal-tabs__close"
              onClick={(e) => {
                e.stopPropagation()
                removeTab(tab.id)
              }}
            >
              <i className="codicon codicon-close" />
            </span>
          </div>
        ))}
      </div>
      <div className="terminal-tabs__actions">
        <div className="terminal-tabs__action" onClick={() => createNewTerminalCommand()} title="New Terminal">
          <i className="codicon codicon-plus" />
        </div>
      </div>
    </div>
  )
}
