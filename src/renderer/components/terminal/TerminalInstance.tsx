import { useCallback, useEffect, useRef } from 'react'
import { Terminal, type IDisposable } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'
import { getThemeById } from '@shared/config/theme.config'
import {
  registerTerminalClipboardRuntime,
  type TerminalClipboardRuntime
} from '../../commands/terminal-clipboard.commands'
import { useSettingsStore } from '../../stores/settings.store'
import { resolveShareWithPtyId, useTerminalStore } from '../../stores/terminal.store'
import { subscribeTerminalData, subscribeTerminalExit } from '../../utils/terminal-events'
import '@xterm/xterm/css/xterm.css'

const SPLIT_RESIZE_START_EVENT = 'zterm:split-resize-start'

function decodeOscValue(value: string): string {
  return value.replace(/\\x([0-9a-fA-F]{2})|\\\\/g, (match, hex: string | undefined) => {
    if (hex) {
      return String.fromCharCode(Number.parseInt(hex, 16))
    }
    return match === '\\\\' ? '\\' : match
  })
}

function parseOsc7Cwd(data: string): string | null {
  const value = data.trim()
  if (!value.startsWith('file://')) {
    return null
  }

  try {
    const url = new URL(value)
    if (url.protocol !== 'file:') {
      return null
    }

    const cwd = decodeURIComponent(url.pathname)
    return cwd.startsWith('/') ? cwd : null
  } catch {
    return null
  }
}

function parseOsc633Cwd(data: string): string | null {
  const segments = data.trim().split(';')
  if (segments[0] !== 'P') {
    return null
  }

  const cwdEntry = segments.find((segment) => segment.startsWith('Cwd='))
  if (!cwdEntry) {
    return null
  }

  const cwd = decodeOscValue(cwdEntry.slice(4))
  return cwd.startsWith('/') ? cwd : null
}

function matchesTerminalClipboardShortcut(event: KeyboardEvent, key: 'c' | 'v'): boolean {
  return event.metaKey && !event.ctrlKey && !event.altKey && event.key.toLowerCase() === key
}

const SPLIT_RESIZE_END_EVENT = 'zterm:split-resize-end'

interface TerminalInstanceProps {
  sessionId: string
  active: boolean
  visible: boolean
}

export function TerminalInstance({ sessionId, active, visible }: TerminalInstanceProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const session = useTerminalStore((state) => state.sessions[sessionId])
  const sessionKind = session?.kind
  const sessionConnectionId = session?.connectionId
  const shareWithSessionId = session?.shareWithSessionId
  const hasSession = Boolean(session)
  const setSessionPtyId = useTerminalStore((state) => state.setSessionPtyId)
  const setSessionCwd = useTerminalStore((state) => state.setSessionCwd)
  const clearSessionRuntime = useTerminalStore((state) => state.clearSessionRuntime)
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const ptyIdRef = useRef<number | null>(null)
  const visibleRef = useRef(visible)
  const splitDraggingRef = useRef(document.body.dataset.ztermSplitDragging === 'true')
  const fitFrameRef = useRef<number | null>(null)
  const fitDebounceRef = useRef<number | null>(null)
  const lastFitSizeRef = useRef<{ width: number; height: number } | null>(null)
  const fontFamily = useSettingsStore((state) => state.settings.fontFamily)
  const fontSize = useSettingsStore((state) => state.settings.fontSize)
  const theme = useSettingsStore((state) => state.settings.theme)

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

  const copySelection = useCallback(async () => {
    const term = termRef.current
    if (!term || !term.hasSelection()) {
      return false
    }

    const selection = term.getSelection()
    if (!selection) {
      return false
    }

    await window.clipboardApi.writeText(selection)
    return true
  }, [])

  const pasteClipboard = useCallback(async () => {
    const term = termRef.current
    if (!term) {
      return false
    }

    const clipboardText = await window.clipboardApi.readText()
    term.paste(clipboardText)
    requestAnimationFrame(() => {
      term.focus()
    })
    return true
  }, [])

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
    if (!containerRef.current || !hasSession) {
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
    term.attachCustomKeyEventHandler((event) => {
      if (matchesTerminalClipboardShortcut(event, 'c')) {
        if (!term.hasSelection()) {
          return true
        }

        event.preventDefault()
        void copySelection()
        return false
      }

      if (matchesTerminalClipboardShortcut(event, 'v')) {
        event.preventDefault()
        void pasteClipboard()
        return false
      }

      return true
    })
    term.open(containerRef.current)

    const oscHandlers: IDisposable[] = []
    oscHandlers.push(
      term.parser.registerOscHandler(7, (data) => {
        const cwd = parseOsc7Cwd(data)
        if (cwd) {
          setSessionCwd(sessionId, cwd)
        }
        return true
      })
    )
    oscHandlers.push(
      term.parser.registerOscHandler(633, (data) => {
        const cwd = parseOsc633Cwd(data)
        if (cwd) {
          setSessionCwd(sessionId, cwd)
        }
        return true
      })
    )

    fitAddonRef.current = fitAddon
    termRef.current = term

    const clipboardRuntime: TerminalClipboardRuntime = {
      hasSelection: () => term.hasSelection(),
      copySelection,
      pasteClipboard
    }
    const unregisterClipboardRuntime = registerTerminalClipboardRuntime(sessionId, clipboardRuntime)

    const selectionChangeDisposable = term.onSelectionChange(() => {
      if (!useSettingsStore.getState().settings.copyOnSelect || !term.hasSelection()) {
        return
      }

      const selection = term.getSelection()
      if (!selection) {
        return
      }

      void window.clipboardApi.writeText(selection)
    })

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

    const createOptionsBase =
      sessionKind === 'ssh'
        ? {
            cols: term.cols,
            rows: term.rows
          }
        : {
            cols: term.cols,
            rows: term.rows,
            shell: initialSettings.shellPath.trim() || undefined,
            loginShell: initialSettings.loginShell
          }

    let disposed = false
    let createTimer: number | null = null
    let unsubscribeData: (() => void) | null = null
    let unsubscribeExit: (() => void) | null = null
    const shareWaitStartedAt = Date.now()

    const startTerminal = () => {
      if (disposed) {
        return
      }

      if (sessionKind === 'ssh') {
        if (!sessionConnectionId) {
          term.writeln('\r\n[Failed to start terminal: missing SSH connection id]')
          return
        }

        const currentSession = useTerminalStore.getState().sessions[sessionId]
        const shareWithPtyId =
          currentSession && shareWithSessionId
            ? resolveShareWithPtyId(useTerminalStore.getState(), currentSession)
            : undefined

        if (shareWithSessionId && shareWithPtyId == null) {
          if (Date.now() - shareWaitStartedAt > 15000) {
            term.writeln('\r\n[Failed to start terminal: source SSH connection is not available]')
            return
          }

          createTimer = window.setTimeout(startTerminal, 50)
          return
        }

        window.terminalApi
          .create({
            cols: term.cols,
            rows: term.rows,
            ssh: {
              connectionId: sessionConnectionId,
              shareWithPtyId
            }
          })
          .then((ptyId: number) => {
            if (disposed) {
              window.terminalApi.kill(ptyId)
              return
            }

            ptyIdRef.current = ptyId
            setSessionPtyId(sessionId, ptyId)
            unsubscribeData = subscribeTerminalData(ptyId, (data) => {
              term.write(data)
            })
            unsubscribeExit = subscribeTerminalExit(ptyId, () => {
              term.write('\r\n[Process exited]')
              if (ptyIdRef.current === ptyId) {
                ptyIdRef.current = null
              }
              clearSessionRuntime(sessionId)
              unsubscribeData?.()
              unsubscribeData = null
            })

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
        return
      }

      window.terminalApi
        .create(createOptionsBase)
        .then((ptyId: number) => {
          if (disposed) {
            window.terminalApi.kill(ptyId)
            return
          }

          ptyIdRef.current = ptyId
          setSessionPtyId(sessionId, ptyId)
          unsubscribeData = subscribeTerminalData(ptyId, (data) => {
            term.write(data)
          })
          unsubscribeExit = subscribeTerminalExit(ptyId, () => {
            term.write('\r\n[Process exited]')
            if (ptyIdRef.current === ptyId) {
              ptyIdRef.current = null
            }
            clearSessionRuntime(sessionId)
            unsubscribeData?.()
            unsubscribeData = null
          })

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
      unsubscribeData?.()
      unsubscribeExit?.()
      selectionChangeDisposable.dispose()
      unregisterClipboardRuntime()
      for (const handler of oscHandlers) {
        handler.dispose()
      }
      resizeObserver.disconnect()
      if (ptyIdRef.current !== null) {
        window.terminalApi.kill(ptyIdRef.current)
      }
      clearSessionRuntime(sessionId)
      term.dispose()
      termRef.current = null
      fitAddonRef.current = null
      ptyIdRef.current = null
    }
  }, [
    clearScheduledFit,
    clearSessionRuntime,
    copySelection,
    pasteClipboard,
    performFit,
    scheduleFit,
    hasSession,
    sessionConnectionId,
    sessionKind,
    sessionId,
    setSessionCwd,
    setSessionPtyId,
    shareWithSessionId
  ])

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
