import { useCallback, useRef, useState } from 'react'
import { useWorkbenchStore } from '../../stores/workbench.store'

interface SashProps {
  side?: 'left' | 'right'
}

export function Sash({ side = 'left' }: SashProps) {
  const { sidebarWidth, auxiliarySidebarWidth, setSidebarWidth, setAuxiliarySidebarWidth } = useWorkbenchStore()
  const draggingRef = useRef(false)
  const [active, setActive] = useState(false)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      draggingRef.current = true
      setActive(true)

      const startX = e.clientX
      const startWidth = side === 'left' ? sidebarWidth : auxiliarySidebarWidth

      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      const handleMouseMove = (ev: MouseEvent) => {
        if (!draggingRef.current) return
        const delta = ev.clientX - startX
        if (side === 'left') {
          setSidebarWidth(startWidth + delta)
          return
        }

        setAuxiliarySidebarWidth(startWidth - delta)
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
    [auxiliarySidebarWidth, setAuxiliarySidebarWidth, setSidebarWidth, side, sidebarWidth]
  )

  return (
    <div
      className={`sash sash--vertical sash--${side} ${active ? 'sash--active' : ''}`}
      onMouseDown={handleMouseDown}
    />
  )
}
