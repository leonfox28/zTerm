type TerminalDataHandler = (data: string) => void
type TerminalExitHandler = (code: number | undefined) => void

const dataHandlers = new Map<number, Set<TerminalDataHandler>>()
const exitHandlers = new Map<number, Set<TerminalExitHandler>>()

let started = false

function ensureTerminalEventBridge(): void {
  if (started) {
    return
  }

  started = true
  window.terminalApi.onData(({ id, data }: { id: number; data: string }) => {
    const handlers = dataHandlers.get(id)
    if (!handlers) {
      return
    }

    for (const handler of handlers) {
      handler(data)
    }
  })

  window.terminalApi.onExit(({ id, code }: { id: number; code: number | undefined }) => {
    const handlers = exitHandlers.get(id)
    if (!handlers) {
      return
    }

    for (const handler of handlers) {
      handler(code)
    }
  })
}

function removeHandler<T>(map: Map<number, Set<T>>, ptyId: number, handler: T): void {
  const handlers = map.get(ptyId)
  if (!handlers) {
    return
  }

  handlers.delete(handler)
  if (handlers.size === 0) {
    map.delete(ptyId)
  }
}

export function subscribeTerminalData(ptyId: number, handler: TerminalDataHandler): () => void {
  ensureTerminalEventBridge()

  let handlers = dataHandlers.get(ptyId)
  if (!handlers) {
    handlers = new Set()
    dataHandlers.set(ptyId, handlers)
  }

  handlers.add(handler)
  return () => removeHandler(dataHandlers, ptyId, handler)
}

export function subscribeTerminalExit(ptyId: number, handler: TerminalExitHandler): () => void {
  ensureTerminalEventBridge()

  let handlers = exitHandlers.get(ptyId)
  if (!handlers) {
    handlers = new Set()
    exitHandlers.set(ptyId, handlers)
  }

  handlers.add(handler)
  return () => removeHandler(exitHandlers, ptyId, handler)
}
