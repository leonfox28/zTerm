import { create } from 'zustand'

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
  addFolder: (name: string) => void
  toggleFolder: (id: string) => void
  removeFolder: (id: string) => void
}

let nextFolderId = 1

export const useConnectionsStore = create<ConnectionsState>((set) => ({
  folders: [],

  addFolder: (name) =>
    set((state) => ({
      folders: [
        ...state.folders,
        { id: `folder-${nextFolderId++}`, name, expanded: true, children: [] }
      ]
    })),

  toggleFolder: (id) =>
    set((state) => ({
      folders: toggleFolderInTree(state.folders, id)
    })),

  removeFolder: (id) =>
    set((state) => ({
      folders: state.folders.filter((f) => f.id !== id)
    }))
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
