import { useCallback, useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'
import { darkPlusTheme } from '@shared/config/theme.config'
import '@xterm/xterm/css/xterm.css'

const SPLIT_RESIZE_START_EVENT = 'zterm:split-resize-start'
const SPLIT_RESIZE_END_EVENT = 'zterm:split-resize-end'

interface TerminalInstanceProps {
  sessionId: string
  active: boolean
  visible: boolean
}

export function TerminalInstance({ sessionId, active, visible }: TerminalInstanceProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const ptyIdRef = useRef<number | null>(null)
  const visibleRef = useRef(visible)
  const splitDraggingRef = useRef(document.body.dataset.ztermSplitDragging === 'true')
  const fitFrameRef = useRef<number | null>(null)
  const fitDebounceRef = useRef<number | null>(null)
  const lastFitSizeRef = useRef<{ width: number; height: number } | null>(null)

  const clearScheduledFit = useCallback(() => {
    if (fitDebounceRef.current !== null) {
      window.clearTimeout(fitDebounceRef.current)
      fitDebounceRef.current = null
    }

    if (fitFrameRef.current !== null) {
      window.cancelAnimationFrame(fitFrameRef.current)
      fitFrameRef.current = null
    }
  }, [])

  const performFit = useCallback((force = false) => {
    const fitAddon = fitAddonRef.current
    const container = containerRef.current
    if (!fitAddon || !container) {
      return
    }

    const rect = container.getBoundingClientRect()
    const nextSize = {
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    }

    if (nextSize.width <= 0 || nextSize.height <= 0) {
      return
    }

    if (
      !force &&
      lastFitSizeRef.current &&
      lastFitSizeRef.current.width === nextSize.width &&
      lastFitSizeRef.current.height === nextSize.height
    ) {
      return
    }

    lastFitSizeRef.current = nextSize
    fitAddon.fit()
  }, [])

  const scheduleFit = useCallback(
    (immediate = false) => {
      if (immediate) {
        clearScheduledFit()
        fitFrameRef.current = window.requestAnimationFrame(() => {
          fitFrameRef.current = null
          performFit(true)
        })
        return
      }

      if (fitDebounceRef.current !== null || fitFrameRef.current !== null) {
        return
      }

      fitDebounceRef.current = window.setTimeout(() => {
        fitDebounceRef.current = null
        fitFrameRef.current = window.requestAnimationFrame(() => {
          fitFrameRef.current = null
          performFit()
        })
      }, 32)
    },
    [clearScheduledFit, performFit]
  )

  useEffect(() => {
    visibleRef.current = visible
  }, [visible])

  useEffect(() => {
    const handleSplitResizeStart = () => {
      splitDraggingRef.current = true
      clearScheduledFit()
    }

    const handleSplitResizeEnd = () => {
      splitDraggingRef.current = false
      if (visibleRef.current) {
        scheduleFit(true)
      }
    }

    window.addEventListener(SPLIT_RESIZE_START_EVENT, handleSplitResizeStart)
    window.addEventListener(SPLIT_RESIZE_END_EVENT, handleSplitResizeEnd)

    return () => {
      window.removeEventListener(SPLIT_RESIZE_START_EVENT, handleSplitResizeStart)
      window.removeEventListener(SPLIT_RESIZE_END_EVENT, handleSplitResizeEnd)
    }
  }, [clearScheduledFit, scheduleFit])

  useEffect(() => {
    if (!containerRef.current) return

    const term = new Terminal({
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
      theme: {
        background: darkPlusTheme.terminalBackground,
        foreground: darkPlusTheme.terminalForeground,
        cursor: darkPlusTheme.terminalCursor,
        selectionBackground: darkPlusTheme.terminalSelectionBackground
      },
      cursorBlink: true
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(containerRef.current)

    fitAddonRef.current = fitAddon
    termRef.current = term
    performFit(true)

    // Enable WebGL rendering with canvas fallback
    try {
      const webglAddon = new WebglAddon()
      webglAddon.onContextLoss(() => {
        webglAddon.dispose()
      })
      term.loadAddon(webglAddon)
    } catch {
      // WebGL not available — canvas renderer is used automatically
    }

    // Register data listener BEFORE creating PTY so we don't miss initial output
    const removeDataListener = window.terminalApi.onData(
      ({ id: termId, data }: { id: number; data: string }) => {
        if (termId === ptyIdRef.current) {
          term.write(data)
        }
      }
    )

    const removeExitListener = window.terminalApi.onExit(
      ({ id: termId }: { id: number; code: number | undefined }) => {
        if (termId === ptyIdRef.current) {
          term.write('\r\n[Process exited]')
        }
      }
    )

    // Now create the PTY
    window.terminalApi.create({ cols: term.cols, rows: term.rows }).then((ptyId: number) => {
      ptyIdRef.current = ptyId

      // Send input to PTY
      term.onData((data) => {
        window.terminalApi.write(ptyId, data)
      })

      term.onResize(({ cols, rows }) => {
        window.terminalApi.resize(ptyId, cols, rows)
      })
    })

    // Observe container resize
    const resizeObserver = new ResizeObserver(() => {
      if (!visibleRef.current || splitDraggingRef.current) {
        return
      }

      scheduleFit()
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      clearScheduledFit()
      lastFitSizeRef.current = null
      removeDataListener()
      removeExitListener()
      resizeObserver.disconnect()
      if (ptyIdRef.current !== null) {
        window.terminalApi.kill(ptyIdRef.current)
      }
      term.dispose()
    }
  }, [clearScheduledFit, performFit, scheduleFit, sessionId])

  // Re-fit when layout visibility changes and focus the active pane when possible.
  useEffect(() => {
    if (visible && fitAddonRef.current) {
      setTimeout(() => {
        scheduleFit(true)
        if (active) {
          termRef.current?.focus()
        }
      }, 0)
    }
  }, [active, scheduleFit, visible])

  return <div ref={containerRef} className="terminal-panel__instance" />
}
