import { create } from 'zustand'
import {
  type IConnectionFolder as StoredConnectionFolder,
  type IConnectionSaveResult,
  type IConnectionSummary,
  type IConnectionUpsertInput
} from '@shared/types/store'

export type ConnectionItem = IConnectionSummary

export interface ConnectionFolder {
  id: string
  name: string
  expanded: boolean
  children: (ConnectionItem | ConnectionFolder)[]
}

export function isFolder(node: ConnectionItem | ConnectionFolder): node is ConnectionFolder {
  return 'children' in node
}

interface ConnectionsState {
  folders: ConnectionFolder[]
  connections: ConnectionItem[]
  initialized: boolean
  init: () => Promise<void>
  addFolder: (name: string) => void
  toggleFolder: (id: string) => void
  removeFolder: (id: string) => void
  saveConnection: (input: IConnectionUpsertInput) => Promise<IConnectionSaveResult>
  deleteConnection: (id: string) => Promise<void>
}

let nextFolderId = 1

function persistFolders(folders: ConnectionFolder[]) {
  const flat: StoredConnectionFolder[] = folders.map((folder) => ({
    id: folder.id,
    name: folder.name,
    expanded: folder.expanded
  }))
  window.storeApi.set('connectionFolders', flat)
}

function hydrateFolders(stored: StoredConnectionFolder[]): ConnectionFolder[] {
  return stored.map((folder) => ({
    id: folder.id,
    name: folder.name,
    expanded: folder.expanded,
    children: []
  }))
}

export const useConnectionsStore = create<ConnectionsState>((set, get) => ({
  folders: [],
  connections: [],
  initialized: false,

  init: async () => {
    if (get().initialized) {
      return
    }

    const [storedFolders, storedConnections] = await Promise.all([
      window.storeApi.get('connectionFolders'),
      window.connectionsApi.list()
    ])

    const folders = storedFolders && storedFolders.length > 0 ? hydrateFolders(storedFolders) : []
    const connections = storedConnections

    const maxId = (storedFolders ?? []).reduce<number>((max: number, folder: StoredConnectionFolder) => {
      const num = parseInt(folder.id.replace('folder-', ''), 10)
      return Number.isNaN(num) ? max : Math.max(max, num)
    }, 0)

    nextFolderId = maxId + 1
    set({ folders, connections, initialized: true })
  },

  addFolder: (name) =>
    set((state) => {
      const folders = [...state.folders, { id: `folder-${nextFolderId++}`, name, expanded: true, children: [] }]
      persistFolders(folders)
      return { folders }
    }),

  toggleFolder: (id) =>
    set((state) => {
      const folders = state.folders.map((folder) => (folder.id === id ? { ...folder, expanded: !folder.expanded } : folder))
      persistFolders(folders)
      return { folders }
    }),

  removeFolder: (id) =>
    set((state) => {
      const folders = state.folders.filter((folder) => folder.id !== id)
      const connections = state.connections.map((connection) =>
        connection.folderId === id ? { ...connection, folderId: undefined } : connection
      )
      persistFolders(folders)
      return { folders, connections }
    }),

  saveConnection: async (input) => {
    const result = await window.connectionsApi.save(input)
    set((state) => {
      const existingIndex = state.connections.findIndex((connection) => connection.id === result.connection.id)
      const connections = [...state.connections]
      if (existingIndex === -1) {
        connections.push(result.connection)
      } else {
        connections[existingIndex] = result.connection
      }
      return { connections }
    })
    return result
  },

  deleteConnection: async (id) => {
    await window.connectionsApi.delete(id)
    set((state) => ({
      connections: state.connections.filter((connection) => connection.id !== id)
    }))
  }
}))
