import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { type IConnectionSaveResult, type IConnectionSummary, type IConnectionUpsertInput, type IStoreSchema } from '@shared/types/store'
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

const storeApi = {
  get: <K extends keyof IStoreSchema>(key: K): Promise<IStoreSchema[K]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.STORE_GET, key)
  },
  set: <K extends keyof IStoreSchema>(key: K, value: IStoreSchema[K]): void => {
    ipcRenderer.send(IPC_CHANNELS.STORE_SET, { key, value })
  },
  getAll: (): Promise<IStoreSchema> => {
    return ipcRenderer.invoke(IPC_CHANNELS.STORE_GET_ALL)
  }
}

const connectionsApi = {
  list: (): Promise<IConnectionSummary[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CONNECTIONS_LIST)
  },
  save: (payload: IConnectionUpsertInput): Promise<IConnectionSaveResult> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CONNECTIONS_SAVE, payload)
  },
  delete: (id: string): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CONNECTIONS_DELETE, id)
  }
}

contextBridge.exposeInMainWorld('terminalApi', terminalApi)
contextBridge.exposeInMainWorld('storeApi', storeApi)
contextBridge.exposeInMainWorld('connectionsApi', connectionsApi)

export type TerminalApi = typeof terminalApi
export type StoreApi = typeof storeApi
export type ConnectionsApi = typeof connectionsApi
