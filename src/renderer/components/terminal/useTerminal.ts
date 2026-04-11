import { useEffect, useRef, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

interface UseTerminalOptions {
  terminalId: number | null
}

export function useTerminal({ terminalId }: UseTerminalOptions) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  const initTerminal = useCallback(async () => {
    if (!containerRef.current || terminalRef.current) return

    const term = new Terminal({
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#ffffff',
        selectionBackground: '#264f78'
      },
      cursorBlink: true,
      allowProposedApi: true
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(containerRef.current)
    fitAddon.fit()

    terminalRef.current = term
    fitAddonRef.current = fitAddon

    // Create PTY process
    const id = await window.terminalApi.create({
      cols: term.cols,
      rows: term.rows
    })

    // Send user input to PTY
    const dataDisposable = term.onData((data) => {
      window.terminalApi.write(id, data)
    })

    // Receive PTY output
    const removeDataListener = window.terminalApi.onData(({ id: termId, data }) => {
      if (termId === id) {
        term.write(data)
      }
    })

    // Handle resize
    const resizeDisposable = term.onResize(({ cols, rows }) => {
      window.terminalApi.resize(id, cols, rows)
    })

    // Observe container resize
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit()
    })
    resizeObserver.observe(containerRef.current)

    cleanupRef.current = () => {
      dataDisposable.dispose()
      resizeDisposable.dispose()
      removeDataListener()
      resizeObserver.disconnect()
      window.terminalApi.kill(id)
      term.dispose()
      terminalRef.current = null
      fitAddonRef.current = null
    }

    return id
  }, [])

  useEffect(() => {
    return () => {
      cleanupRef.current?.()
    }
  }, [])

  return { containerRef, initTerminal, terminalRef }
}
