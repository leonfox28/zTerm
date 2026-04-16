import { type CSSProperties } from 'react'
import {
  type SplitDirection,
  type TerminalPaneNode,
  useTerminalStore
} from '../../stores/terminal.store'
import { getTerminalClipboardRuntime } from '../../commands/terminal-clipboard.commands'
import { showNativeContextMenu, type NativeMenuActionItem } from '../../utils/context-menu'
import { TerminalInstance } from './TerminalInstance'
import { TerminalSplitSash } from './TerminalSplitSash'

interface PaneRect {
  x: number
  y: number
  width: number
  height: number
}

interface LayoutLeaf {
  paneId: string
  sessionId: string
  rect: PaneRect
}

interface LayoutSash {
  splitId: string
  direction: SplitDirection
  splitRect: PaneRect
  offset: number
  ratios: [number, number]
}

interface TerminalPaneTreeProps {
  tabId: number
  rootPaneId: string
  activePaneId: string
  visible: boolean
}

const ROOT_RECT: PaneRect = {
  x: 0,
  y: 0,
  width: 100,
  height: 100
}

function buildLayouts(
  panes: Record<string, TerminalPaneNode>,
  paneId: string,
  rect: PaneRect,
  leafLayouts: LayoutLeaf[],
  sashLayouts: LayoutSash[]
): void {
  const node = panes[paneId]
  if (!node) {
    return
  }

  if (node.type === 'leaf') {
    leafLayouts.push({
      paneId: node.id,
      sessionId: node.sessionId,
      rect
    })
    return
  }

  const [firstChildId, secondChildId] = node.children
  const [firstRatio] = node.ratios

  if (node.direction === 'vertical') {
    const firstWidth = rect.width * firstRatio
    const secondRect: PaneRect = {
      x: rect.x + firstWidth,
      y: rect.y,
      width: rect.width - firstWidth,
      height: rect.height
    }

    buildLayouts(
      panes,
      firstChildId,
      {
        x: rect.x,
        y: rect.y,
        width: firstWidth,
        height: rect.height
      },
      leafLayouts,
      sashLayouts
    )
    buildLayouts(panes, secondChildId, secondRect, leafLayouts, sashLayouts)
    sashLayouts.push({
      splitId: node.id,
      direction: node.direction,
      splitRect: rect,
      offset: rect.x + firstWidth,
      ratios: node.ratios
    })
    return
  }

  const firstHeight = rect.height * firstRatio
  const secondRect: PaneRect = {
    x: rect.x,
    y: rect.y + firstHeight,
    width: rect.width,
    height: rect.height - firstHeight
  }

  buildLayouts(
    panes,
    firstChildId,
    {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: firstHeight
    },
    leafLayouts,
    sashLayouts
  )
  buildLayouts(panes, secondChildId, secondRect, leafLayouts, sashLayouts)
  sashLayouts.push({
    splitId: node.id,
    direction: node.direction,
    splitRect: rect,
    offset: rect.y + firstHeight,
    ratios: node.ratios
  })
}

function getRectStyle(rect: PaneRect): CSSProperties {
  return {
    left: `${rect.x}%`,
    top: `${rect.y}%`,
    width: `${rect.width}%`,
    height: `${rect.height}%`
  }
}

export function TerminalPaneTree({ tabId, rootPaneId, activePaneId, visible }: TerminalPaneTreeProps) {
  const panes = useTerminalStore((state) => state.panes)
  const sessions = useTerminalStore((state) => state.sessions)
  const setActivePane = useTerminalStore((state) => state.setActivePane)
  const closePane = useTerminalStore((state) => state.closePane)
  const resizeSplit = useTerminalStore((state) => state.resizeSplit)

  const leafLayouts: LayoutLeaf[] = []
  const sashLayouts: LayoutSash[] = []

  buildLayouts(panes, rootPaneId, ROOT_RECT, leafLayouts, sashLayouts)

  return (
    <div className="terminal-pane-tree">
      <div className="terminal-pane-tree__layout">
        {leafLayouts.map((leaf) => {
          const session = sessions[leaf.sessionId]
          if (!session) {
            return null
          }

          const isActive = leaf.paneId === activePaneId

          return (
            <div
              key={leaf.paneId}
              className={`terminal-pane-tree__pane ${isActive ? 'terminal-pane-tree__pane--active' : ''}`}
              onContextMenu={(event) => {
                event.preventDefault()
                setActivePane(tabId, leaf.paneId)
                requestAnimationFrame(() => {
                  const terminalSurface = (event.currentTarget as HTMLDivElement).querySelector(
                    '[data-zterm-terminal-surface="true"]'
                  )
                  if (terminalSurface instanceof HTMLElement) {
                    terminalSurface.focus()
                  }
                })
                const clipboardRuntime = getTerminalClipboardRuntime(session.id)
                const items: NativeMenuActionItem[] = [
                  {
                    itemId: `terminal-pane-copy-${leaf.paneId}`,
                    type: 'normal',
                    label: 'Copy',
                    accelerator: 'CommandOrControl+C',
                    enabled: Boolean(clipboardRuntime?.hasSelection()),
                    onSelect: async () => {
                      await clipboardRuntime?.copySelection()
                    }
                  },
                  {
                    itemId: `terminal-pane-paste-${leaf.paneId}`,
                    type: 'normal',
                    label: 'Paste',
                    accelerator: 'CommandOrControl+V',
                    onSelect: async () => {
                      await clipboardRuntime?.pasteClipboard()
                    }
                  },
                  {
                    itemId: `terminal-pane-separator-${leaf.paneId}`,
                    type: 'separator'
                  },
                  {
                    itemId: `terminal-pane-close-${leaf.paneId}`,
                    type: 'normal',
                    label: 'Close Terminal',
                    accelerator: 'CommandOrControl+W',
                    onSelect: () => {
                      closePane(tabId, leaf.paneId)
                      requestAnimationFrame(() => {
                        window.dispatchEvent(new Event('zterm:split-resize-end'))
                      })
                    }
                  }
                ]

                void showNativeContextMenu({
                  anchor: {
                    x: event.clientX,
                    y: event.clientY
                  },
                  items
                })
              }}
              onMouseDown={(event) => {
                if (event.button !== 0) {
                  return
                }

                setActivePane(tabId, leaf.paneId)
              }}
              style={getRectStyle(leaf.rect)}
            >
              <TerminalInstance active={isActive} sessionId={session.id} visible={visible} />
            </div>
          )
        })}

        {sashLayouts.map((sash) => (
          <TerminalSplitSash
            direction={sash.direction}
            key={sash.splitId}
            offset={sash.offset}
            onResize={resizeSplit}
            ratios={sash.ratios}
            splitId={sash.splitId}
            splitRect={sash.splitRect}
          />
        ))}
      </div>
    </div>
  )
}
