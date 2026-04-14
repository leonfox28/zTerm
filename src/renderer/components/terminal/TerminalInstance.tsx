import { useCallback, useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'
import { getThemeById } from '@shared/config/theme.config'
import { useSettingsStore } from '../../stores/settings.store'
import { useTerminalStore } from '../../stores/terminal.store'
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
  const session = useTerminalStore((state) => state.sessions[sessionId])
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const ptyIdRef = useRef<number | null>(null)
  const visibleRef = useRef(visible)
  const splitDraggingRef = useRef(document.body.dataset.ztermSplitDragging === 'true')
  const fitFrameRef = useRef<number | null>(null)
  const fitDebounceRef = useRef<number | null>(null)
  const lastFitSizeRef = useRef<{ width: number; height: number } | null>(null)
  const { fontFamily, fontSize, theme } = useSettingsStore((state) => state.settings)

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
    if (!containerRef.current || !session) {
      return
    }

    const initialSettings = useSettingsStore.getState().settings
    const initialTheme = getThemeById(initialSettings.theme)

    const term = new Terminal({
      fontSize: initialSettings.fontSize,
      fontFamily: initialSettings.fontFamily,
      theme: {
        background: initialTheme.terminalBackground,
        foreground: initialTheme.terminalForeground,
        cursor: initialTheme.terminalCursor,
        selectionBackground: initialTheme.terminalSelectionBackground
      },
      cursorBlink: true
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(containerRef.current)

    fitAddonRef.current = fitAddon
    termRef.current = term
    performFit(true)

    try {
      const webglAddon = new WebglAddon()
      webglAddon.onContextLoss(() => {
        webglAddon.dispose()
      })
      term.loadAddon(webglAddon)
    } catch {
      // canvas fallback
    }

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

    const createOptions =
      session.kind === 'ssh'
        ? {
            cols: term.cols,
            rows: term.rows,
            ssh: session.connectionId ? { connectionId: session.connectionId } : undefined
          }
        : {
            cols: term.cols,
            rows: term.rows,
            shell: initialSettings.shellPath.trim() || undefined,
            loginShell: initialSettings.loginShell
          }

    let disposed = false
    let createTimer: number | null = null

    const startTerminal = () => {
      window.terminalApi
        .create(createOptions)
        .then((ptyId: number) => {
          if (disposed) {
            window.terminalApi.kill(ptyId)
            return
          }

          ptyIdRef.current = ptyId

          term.onData((data) => {
            if (ptyIdRef.current !== null) {
              window.terminalApi.write(ptyIdRef.current, data)
            }
          })

          term.onResize(({ cols, rows }) => {
            if (ptyIdRef.current !== null) {
              window.terminalApi.resize(ptyIdRef.current, cols, rows)
            }
          })
        })
        .catch((error: unknown) => {
          if (disposed) {
            return
          }

          const message = error instanceof Error ? error.message : 'Unknown error'
          term.writeln(`\r\n[Failed to start terminal: ${message}]`)
        })
    }

    createTimer = window.setTimeout(startTerminal, 0)

    const resizeObserver = new ResizeObserver(() => {
      if (!visibleRef.current || splitDraggingRef.current) {
        return
      }

      scheduleFit()
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      disposed = true
      if (createTimer !== null) {
        window.clearTimeout(createTimer)
      }
      clearScheduledFit()
      lastFitSizeRef.current = null
      removeDataListener()
      removeExitListener()
      resizeObserver.disconnect()
      if (ptyIdRef.current !== null) {
        window.terminalApi.kill(ptyIdRef.current)
      }
      term.dispose()
      termRef.current = null
      fitAddonRef.current = null
      ptyIdRef.current = null
    }
  }, [clearScheduledFit, performFit, scheduleFit, session, sessionId])

  useEffect(() => {
    const term = termRef.current
    if (!term) {
      return
    }

    const terminalTheme = getThemeById(theme)
    term.options.fontFamily = fontFamily
    term.options.fontSize = fontSize
    term.options.theme = {
      background: terminalTheme.terminalBackground,
      foreground: terminalTheme.terminalForeground,
      cursor: terminalTheme.terminalCursor,
      selectionBackground: terminalTheme.terminalSelectionBackground
    }

    if (visibleRef.current) {
      scheduleFit(true)
    }
  }, [fontFamily, fontSize, scheduleFit, theme])

  useEffect(() => {
    if (visible && fitAddonRef.current) {
      const timer = window.setTimeout(() => {
        scheduleFit(true)
        if (active) {
          termRef.current?.focus()
        }
      }, 0)

      return () => {
        window.clearTimeout(timer)
      }
    }
  }, [active, scheduleFit, visible])

  return <div ref={containerRef} className="terminal-panel__instance" data-zterm-terminal-surface="true" />
}
