import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

interface TerminalInstanceProps {
  tabId: number
  visible: boolean
}

export function TerminalInstance({ tabId, visible }: TerminalInstanceProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const ptyIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const term = new Terminal({
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#ffffff',
        selectionBackground: '#264f78'
      },
      cursorBlink: true
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(containerRef.current)
    fitAddon.fit()

    termRef.current = term
    fitAddonRef.current = fitAddon

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
      fitAddon.fit()
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      removeDataListener()
      removeExitListener()
      resizeObserver.disconnect()
      if (ptyIdRef.current !== null) {
        window.terminalApi.kill(ptyIdRef.current)
      }
      term.dispose()
    }
  }, [tabId])

  // Re-fit when visibility changes
  useEffect(() => {
    if (visible && fitAddonRef.current) {
      setTimeout(() => fitAddonRef.current?.fit(), 0)
    }
  }, [visible])

  return (
    <div
      ref={containerRef}
      className={`terminal-panel__instance ${!visible ? 'terminal-panel__instance--hidden' : ''}`}
    />
  )
}
