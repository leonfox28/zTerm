import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  type ContextMenuActionItem,
  type ContextMenuAnchor,
  useContextMenuStore
} from '../../stores/context-menu.store'
import '../../styles/context-menu.css'

const MENU_MARGIN = 8

function clampMenuPosition(anchor: ContextMenuAnchor, width: number, height: number): ContextMenuAnchor {
  const maxX = Math.max(MENU_MARGIN, window.innerWidth - width - MENU_MARGIN)
  const maxY = Math.max(MENU_MARGIN, window.innerHeight - height - MENU_MARGIN)

  return {
    x: Math.min(Math.max(anchor.x, MENU_MARGIN), maxX),
    y: Math.min(Math.max(anchor.y, MENU_MARGIN), maxY)
  }
}

export function ContextMenuHost() {
  const menu = useContextMenuStore((state) => state.menu)
  const closeContextMenu = useContextMenuStore((state) => state.closeContextMenu)
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<ContextMenuAnchor | null>(null)

  useLayoutEffect(() => {
    if (!menu) {
      setPosition(null)
      return
    }

    const updatePosition = () => {
      const menuElement = menuRef.current
      if (!menuElement) {
        setPosition(menu.anchor)
        return
      }

      setPosition(clampMenuPosition(menu.anchor, menuElement.offsetWidth, menuElement.offsetHeight))
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('resize', updatePosition)
    }
  }, [menu])

  useEffect(() => {
    if (!menu) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (target instanceof Node && menuRef.current?.contains(target)) {
        return
      }

      closeContextMenu()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeContextMenu()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeContextMenu, menu])

  if (!menu || !position) {
    return null
  }

  const handleActionClick = async (item: ContextMenuActionItem) => {
    if (item.disabled) {
      return
    }

    try {
      await item.onSelect()
    } catch {
      // Action handlers surface their own UI errors when needed.
    } finally {
      closeContextMenu()
    }
  }

  return (
    <div
      className="context-menu"
      onContextMenu={(event) => event.preventDefault()}
      ref={menuRef}
      role="menu"
      style={{ left: position.x, top: position.y }}
    >
      {menu.items.map((item) => {
        if (item.type === 'separator') {
          return <div className="context-menu__separator" key={item.id} role="separator" />
        }

        return (
          <button
            className="context-menu__item"
            disabled={item.disabled}
            key={item.id}
            onClick={() => handleActionClick(item)}
            role="menuitem"
            type="button"
          >
            <span className="context-menu__item-label">{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
