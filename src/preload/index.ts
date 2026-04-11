import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { IShellOptions } from '@shared/types/terminal'

const terminalApi = {
  create: (options: IShellOptions): Promise<number> => {
    return ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_CREATE, options)
  },
  write: (id: number, data: string): void => {
    ipcRenderer.send(IPC_CHANNELS.TERMINAL_WRITE, { id, data })
  },
  resize: (id: number, cols: number, rows: number): void => {
    ipcRenderer.send(IPC_CHANNELS.TERMINAL_RESIZE, { id, cols, rows })
  },
  kill: (id: number): void => {
    ipcRenderer.send(IPC_CHANNELS.TERMINAL_KILL, { id })
  },
  onData: (callback: (data: { id: number; data: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: { id: number; data: string }) =>
      callback(data)
    ipcRenderer.on(IPC_CHANNELS.TERMINAL_DATA, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.TERMINAL_DATA, listener)
  },
  onExit: (callback: (data: { id: number; code: number | undefined }) => void) => {
    const listener =
      (_event: Electron.IpcRendererEvent, data: { id: number; code: number | undefined }) =>
        callback(data)
    ipcRenderer.on(IPC_CHANNELS.TERMINAL_EXIT, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.TERMINAL_EXIT, listener)
  }
}

contextBridge.exposeInMainWorld('terminalApi', terminalApi)

export type TerminalApi = typeof terminalApi
