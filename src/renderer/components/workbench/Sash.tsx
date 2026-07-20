import { useCallback, useRef, useState } from 'react'
import { useWorkbenchStore } from '../../stores/workbench.store'

export function Sash() {
  const setSidebarWidth = useWorkbenchStore((state) => state.setSidebarWidth)
  const draggingRef = useRef(false)
  const [active, setActive] = useState(false)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      draggingRef.current = true
      setActive(true)

      const startX = e.clientX
      const startWidth = useWorkbenchStore.getState().sidebarWidth

      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      const handleMouseMove = (ev: MouseEvent) => {
        if (!draggingRef.current) return
        setSidebarWidth(startWidth + (ev.clientX - startX))
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
    [setSidebarWidth]
  )

  return (
    <div
      className={`sash sash--vertical sash--left ${active ? 'sash--active' : ''}`}
      onMouseDown={handleMouseDown}
    />
  )
}
