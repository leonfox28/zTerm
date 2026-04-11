import { useEffect, useRef } from 'react'
import { useTerminalStore } from '../../stores/terminal.store'
import '../../styles/terminal.css'

export function TerminalTabs() {
  const { tabs, activeTabId, setActiveTab, removeTab } = useTerminalStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeTabRef = useRef<HTMLDivElement>(null)

  const handleNewTab = () => {
    window.dispatchEvent(new CustomEvent('zterm:new-terminal'))
  }

  // 当 activeTabId 变化时，将激活的 tab 滚动进可见区域（完整显示）
  useEffect(() => {
    const scroll = scrollRef.current
    const activeEl = activeTabRef.current
    if (!scroll || !activeEl) return

    const scrollRect = scroll.getBoundingClientRect()
    const tabRect = activeEl.getBoundingClientRect()

    // tab 相对于可滚动容器左边缘的偏移（已计入当前滚动位置）
    const tabRelLeft = tabRect.left - scrollRect.left
    const tabRelRight = tabRect.right - scrollRect.left
    const containerWidth = scroll.clientWidth

    if (tabRelLeft < 0) {
      // tab 左侧超出可见区域，向左滚动刚好对齐
      scroll.scrollLeft += tabRelLeft
    } else if (tabRelRight > containerWidth) {
      // tab 右侧超出可见区域，向右滚动刚好对齐
      scroll.scrollLeft += tabRelRight - containerWidth
    }
  }, [activeTabId])

  // 鼠标滚轮横向滚动
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
        <div className="terminal-tabs__action" onClick={handleNewTab} title="New Terminal">
          <i className="codicon codicon-plus" />
        </div>
      </div>
    </div>
  )
}
