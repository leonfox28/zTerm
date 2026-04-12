import { useCallback, useState } from 'react'
import { type SplitDirection } from '../../stores/terminal.store'

interface SplitRect {
  x: number
  y: number
  width: number
  height: number
}

interface TerminalSplitSashProps {
  splitId: string
  direction: SplitDirection
  splitRect: SplitRect
  offset: number
  ratios: [number, number]
  onResize: (splitId: string, ratios: [number, number]) => void
}

const MIN_SPLIT_RATIO = 0.1
const SPLIT_RESIZE_START_EVENT = 'zterm:split-resize-start'
const SPLIT_RESIZE_END_EVENT = 'zterm:split-resize-end'

export function TerminalSplitSash({
  splitId,
  direction,
  splitRect,
  offset,
  ratios,
  onResize
}: TerminalSplitSashProps) {
  const [active, setActive] = useState(false)

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault()

      const container = event.currentTarget.parentElement
      if (!container) {
        return
      }

      const containerRect = container.getBoundingClientRect()
      const splitSize =
        direction === 'vertical'
          ? (containerRect.width * splitRect.width) / 100
          : (containerRect.height * splitRect.height) / 100

      if (splitSize <= 0) {
        return
      }

      setActive(true)
      document.body.dataset.ztermSplitDragging = 'true'
      window.dispatchEvent(new CustomEvent(SPLIT_RESIZE_START_EVENT))
      document.body.style.cursor = direction === 'vertical' ? 'col-resize' : 'row-resize'
      document.body.style.userSelect = 'none'

      const startPoint = direction === 'vertical' ? event.clientX : event.clientY
      const startRatio = ratios[0]

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const nextPoint = direction === 'vertical' ? moveEvent.clientX : moveEvent.clientY
        const delta = nextPoint - startPoint
        const nextRatio = Math.min(Math.max(startRatio + delta / splitSize, MIN_SPLIT_RATIO), 1 - MIN_SPLIT_RATIO)
        onResize(splitId, [nextRatio, 1 - nextRatio])
      }

      const handleMouseUp = () => {
        setActive(false)
        delete document.body.dataset.ztermSplitDragging
        window.dispatchEvent(new CustomEvent(SPLIT_RESIZE_END_EVENT))
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [direction, onResize, ratios, splitId, splitRect.height, splitRect.width]
  )

  const style =
    direction === 'vertical'
      ? {
          left: `${offset}%`,
          top: `${splitRect.y}%`,
          height: `${splitRect.height}%`
        }
      : {
          left: `${splitRect.x}%`,
          top: `${offset}%`,
          width: `${splitRect.width}%`
        }

  return (
    <div
      className={`terminal-split-sash terminal-split-sash--${direction} ${active ? 'terminal-split-sash--active' : ''}`}
      onMouseDown={handleMouseDown}
      style={style}
    />
  )
}
