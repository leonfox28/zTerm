import { create } from 'zustand'
import { IConnectionFolder as StoredConnectionFolder } from '@shared/types/store'

export interface ConnectionItem {
  id: string
  name: string
  type: 'local' | 'ssh'
}

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
  initialized: boolean
  init: () => Promise<void>
  addFolder: (name: string) => void
  toggleFolder: (id: string) => void
  removeFolder: (id: string) => void
}

let nextFolderId = 1

function persistFolders(folders: ConnectionFolder[]) {
  const flat: StoredConnectionFolder[] = folders.map((f) => ({
    id: f.id,
    name: f.name,
    expanded: f.expanded
  }))
  window.storeApi.set('connectionFolders', flat)
}

export const useConnectionsStore = create<ConnectionsState>((set, get) => ({
  folders: [],
  initialized: false,

  init: async () => {
    if (get().initialized) return
    const stored: StoredConnectionFolder[] = await window.storeApi.get('connectionFolders')
    if (stored && stored.length > 0) {
      const folders: ConnectionFolder[] = stored.map((f) => ({
        id: f.id,
        name: f.name,
        expanded: f.expanded,
        children: []
      }))
      // Update nextFolderId to avoid collisions
      const maxId = stored.reduce<number>((max, f) => {
        const num = parseInt(f.id.replace('folder-', ''), 10)
        return isNaN(num) ? max : Math.max(max, num)
      }, 0)
      nextFolderId = maxId + 1
      set({ folders, initialized: true })
    } else {
      set({ initialized: true })
    }
  },

  addFolder: (name) =>
    set((state) => {
      const folders = [
        ...state.folders,
        { id: `folder-${nextFolderId++}`, name, expanded: true, children: [] }
      ]
      persistFolders(folders)
      return { folders }
    }),

  toggleFolder: (id) =>
    set((state) => {
      const folders = toggleFolderInTree(state.folders, id)
      persistFolders(folders)
      return { folders }
    }),

  removeFolder: (id) =>
    set((state) => {
      const folders = state.folders.filter((f) => f.id !== id)
      persistFolders(folders)
      return { folders }
    })
}))

function toggleFolderInTree(folders: ConnectionFolder[], id: string): ConnectionFolder[] {
  return folders.map((folder) => {
    if (folder.id === id) {
      return { ...folder, expanded: !folder.expanded }
    }
    if (folder.children.length > 0) {
      return {
        ...folder,
        children: folder.children.map((child) =>
          isFolder(child) ? toggleFolderInTree([child], id)[0] : child
        )
      }
    }
    return folder
  })
}
