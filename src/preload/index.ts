import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { type IFileTreeDirectoryResult } from '@shared/types/file-tree'
import {
  type IRemoteDirectoryResult,
  type IRemoteEntryDetails,
  type ISftpDownloadResult,
  type ISftpUploadResult,
  type RemoteFileKind
} from '@shared/types/sftp'
import { type IConnectionSaveResult, type IConnectionSummary, type IConnectionUpsertInput, type IStoreSchema } from '@shared/types/store'
import { type ContextMenuClosed, type ContextMenuRequest, type ContextMenuSelection } from '@shared/types/context-menu'
import { IShellOptions } from '@shared/types/terminal'
import { type IUpdateState } from '@shared/types/update'

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

const sftpApi = {
  getInitialDirectory: (connectionId: string): Promise<IRemoteDirectoryResult> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SFTP_GET_INITIAL_DIRECTORY, connectionId)
  },
  listDirectory: (connectionId: string, path: string): Promise<IRemoteDirectoryResult> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SFTP_LIST_DIRECTORY, { connectionId, path })
  },
  uploadFile: (connectionId: string, destinationPath: string): Promise<ISftpUploadResult> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SFTP_UPLOAD_FILE, { connectionId, destinationPath })
  },
  downloadEntry: (connectionId: string, entryPath: string, kind: RemoteFileKind): Promise<ISftpDownloadResult> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SFTP_DOWNLOAD_ENTRY, { connectionId, entryPath, kind })
  },
  getEntryDetails: (connectionId: string, entryPath: string): Promise<IRemoteEntryDetails> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SFTP_GET_ENTRY_DETAILS, { connectionId, entryPath })
  }
}

const localFileTreeApi = {
  getInitialDirectory: (path?: string): Promise<IFileTreeDirectoryResult> => {
    return ipcRenderer.invoke(IPC_CHANNELS.LOCAL_FILE_TREE_GET_INITIAL_DIRECTORY, { path })
  },
  listDirectory: (path: string): Promise<IFileTreeDirectoryResult> => {
    return ipcRenderer.invoke(IPC_CHANNELS.LOCAL_FILE_TREE_LIST_DIRECTORY, { path })
  }
}

const clipboardApi = {
  readText: (): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CLIPBOARD_READ_TEXT)
  },
  writeText: (text: string): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CLIPBOARD_WRITE_TEXT, text)
  }
}

const contextMenuApi = {
  show: (request: ContextMenuRequest): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CONTEXT_MENU_SHOW, request)
  },
  onItemSelected: (callback: (selection: ContextMenuSelection) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, selection: ContextMenuSelection) =>
      callback(selection)
    ipcRenderer.on(IPC_CHANNELS.CONTEXT_MENU_ITEM_SELECTED, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.CONTEXT_MENU_ITEM_SELECTED, listener)
  },
  onMenuClosed: (callback: (payload: ContextMenuClosed) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: ContextMenuClosed) => callback(payload)
    ipcRenderer.on(IPC_CHANNELS.CONTEXT_MENU_CLOSED, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.CONTEXT_MENU_CLOSED, listener)
  }
}

const updateApi = {
  checkForUpdates: (): Promise<IUpdateState> => {
    return ipcRenderer.invoke(IPC_CHANNELS.UPDATE_CHECK_FOR_UPDATES)
  },
  getState: (): Promise<IUpdateState> => {
    return ipcRenderer.invoke(IPC_CHANNELS.UPDATE_GET_STATE)
  },
  installDownloadedUpdate: (): Promise<IUpdateState> => {
    return ipcRenderer.invoke(IPC_CHANNELS.UPDATE_INSTALL_DOWNLOADED)
  },
  onStateChanged: (callback: (state: IUpdateState) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: IUpdateState) => callback(state)
    ipcRenderer.on(IPC_CHANNELS.UPDATE_STATE_CHANGED, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATE_STATE_CHANGED, listener)
  }
}

contextBridge.exposeInMainWorld('terminalApi', terminalApi)
contextBridge.exposeInMainWorld('storeApi', storeApi)
contextBridge.exposeInMainWorld('connectionsApi', connectionsApi)
contextBridge.exposeInMainWorld('sftpApi', sftpApi)
contextBridge.exposeInMainWorld('localFileTreeApi', localFileTreeApi)
contextBridge.exposeInMainWorld('clipboardApi', clipboardApi)
contextBridge.exposeInMainWorld('contextMenuApi', contextMenuApi)
contextBridge.exposeInMainWorld('updateApi', updateApi)

export type TerminalApi = typeof terminalApi
export type StoreApi = typeof storeApi
export type ConnectionsApi = typeof connectionsApi
export type SftpApi = typeof sftpApi
export type LocalFileTreeApi = typeof localFileTreeApi
export type ClipboardApi = typeof clipboardApi
export type ContextMenuApi = typeof contextMenuApi
export type UpdateApi = typeof updateApi
