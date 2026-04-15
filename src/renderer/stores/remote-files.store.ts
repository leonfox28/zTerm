import { create } from 'zustand'
import { type IRemoteDirectoryResult, type IRemoteFileEntry } from '@shared/types/sftp'

const ROOT_LOADING_KEY = '__root__'

interface RemoteFileNode {
  entry: IRemoteFileEntry
  children: string[] | null
}

type LoadPathSource = 'initial' | 'manual' | 'follow-terminal' | 'refresh'

interface RemoteConnectionTreeState {
  currentPath: string | null
  rootIds: string[]
  nodes: Record<string, RemoteFileNode>
  expandedPaths: string[]
  loadingPaths: string[]
  loadedPaths: string[]
  error: string | null
  followTerminalPath: boolean
}

interface RemoteFilesState {
  trees: Record<string, RemoteConnectionTreeState>
  ensureRootLoaded: (connectionId: string) => Promise<void>
  loadPath: (connectionId: string, path: string, options?: { source?: LoadPathSource }) => Promise<void>
  goToParent: (connectionId: string) => Promise<void>
  toggleDirectory: (connectionId: string, entry: IRemoteFileEntry) => Promise<void>
  refreshCurrentPath: (connectionId: string) => Promise<void>
  uploadToCurrentPath: (connectionId: string) => Promise<boolean>
  setFollowTerminalPath: (connectionId: string, enabled: boolean) => void
}

function createEmptyTreeState(): RemoteConnectionTreeState {
  return {
    currentPath: null,
    rootIds: [],
    nodes: {},
    expandedPaths: [],
    loadingPaths: [],
    loadedPaths: [],
    error: null,
    followTerminalPath: true
  }
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values))
}

function without(values: string[], target: string): string[] {
  return values.filter((value) => value !== target)
}

function applyDirectoryResult(
  tree: RemoteConnectionTreeState,
  result: IRemoteDirectoryResult,
  reset: boolean
): RemoteConnectionTreeState {
  const nextNodes = reset ? {} : { ...tree.nodes }
  const childIds: string[] = []

  for (const entry of result.entries) {
    nextNodes[entry.path] = {
      entry,
      children: entry.kind === 'directory' ? nextNodes[entry.path]?.children ?? null : []
    }
    childIds.push(entry.path)
  }

  const nextTree: RemoteConnectionTreeState = {
    ...tree,
    currentPath: reset ? result.path : tree.currentPath,
    rootIds: reset ? childIds : tree.rootIds,
    nodes: nextNodes,
    expandedPaths: reset ? [] : tree.expandedPaths,
    loadedPaths: reset ? [result.path] : unique([...tree.loadedPaths, result.path]),
    loadingPaths: without(without(tree.loadingPaths, result.path), ROOT_LOADING_KEY),
    error: null
  }

  if (!reset && nextTree.nodes[result.path]) {
    nextTree.nodes[result.path] = {
      ...nextTree.nodes[result.path],
      children: childIds
    }
  }

  return nextTree
}

function setLoading(tree: RemoteConnectionTreeState, path: string): RemoteConnectionTreeState {
  return {
    ...tree,
    loadingPaths: unique([...tree.loadingPaths, path]),
    error: null
  }
}

function setError(tree: RemoteConnectionTreeState, path: string, error: string): RemoteConnectionTreeState {
  return {
    ...tree,
    loadingPaths: without(tree.loadingPaths, path),
    error
  }
}

function getParentPath(path: string): string | null {
  if (path === '/') {
    return null
  }

  const trimmed = path.replace(/\/+$/, '')
  const separatorIndex = trimmed.lastIndexOf('/')
  if (separatorIndex <= 0) {
    return '/'
  }

  return trimmed.slice(0, separatorIndex)
}

export const useRemoteFilesStore = create<RemoteFilesState>((set, get) => ({
  trees: {},

  ensureRootLoaded: async (connectionId) => {
    const currentTree = get().trees[connectionId] ?? createEmptyTreeState()
    if (currentTree.currentPath && currentTree.loadedPaths.includes(currentTree.currentPath)) {
      return
    }

    set((state) => ({
      trees: {
        ...state.trees,
        [connectionId]: setLoading(state.trees[connectionId] ?? createEmptyTreeState(), currentTree.currentPath ?? ROOT_LOADING_KEY)
      }
    }))

    try {
      const result = await window.sftpApi.getInitialDirectory(connectionId)
      set((state) => ({
        trees: {
          ...state.trees,
          [connectionId]: applyDirectoryResult(state.trees[connectionId] ?? createEmptyTreeState(), result, true)
        }
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load remote files'
      set((state) => ({
        trees: {
          ...state.trees,
          [connectionId]: {
            ...setError(state.trees[connectionId] ?? createEmptyTreeState(), ROOT_LOADING_KEY, message),
            currentPath: null,
            rootIds: []
          }
        }
      }))
    }
  },

  loadPath: async (connectionId, path, options) => {
    const source = options?.source ?? 'manual'

    set((state) => ({
      trees: {
        ...state.trees,
        [connectionId]: setLoading(state.trees[connectionId] ?? createEmptyTreeState(), path)
      }
    }))

    try {
      const result = await window.sftpApi.listDirectory(connectionId, path)
      set((state) => {
        const nextTree = applyDirectoryResult(state.trees[connectionId] ?? createEmptyTreeState(), result, true)
        return {
          trees: {
            ...state.trees,
            [connectionId]: source === 'manual' ? { ...nextTree, followTerminalPath: false } : nextTree
          }
        }
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to load ${path}`
      set((state) => ({
        trees: {
          ...state.trees,
          [connectionId]: setError(state.trees[connectionId] ?? createEmptyTreeState(), path, message)
        }
      }))
    }
  },

  goToParent: async (connectionId) => {
    const tree = get().trees[connectionId] ?? createEmptyTreeState()
    const parentPath = tree.currentPath ? getParentPath(tree.currentPath) : null
    if (!parentPath) {
      return
    }

    await get().loadPath(connectionId, parentPath, { source: 'manual' })
  },

  toggleDirectory: async (connectionId, entry) => {
    if (entry.kind !== 'directory') {
      return
    }

    const tree = get().trees[connectionId] ?? createEmptyTreeState()
    if (tree.expandedPaths.includes(entry.path)) {
      set((state) => ({
        trees: {
          ...state.trees,
          [connectionId]: {
            ...(state.trees[connectionId] ?? createEmptyTreeState()),
            expandedPaths: without((state.trees[connectionId] ?? createEmptyTreeState()).expandedPaths, entry.path)
          }
        }
      }))
      return
    }

    set((state) => ({
      trees: {
        ...state.trees,
        [connectionId]: {
          ...(state.trees[connectionId] ?? createEmptyTreeState()),
          expandedPaths: unique([...(state.trees[connectionId] ?? createEmptyTreeState()).expandedPaths, entry.path])
        }
      }
    }))

    if (tree.loadedPaths.includes(entry.path)) {
      return
    }

    set((state) => ({
      trees: {
        ...state.trees,
        [connectionId]: setLoading(state.trees[connectionId] ?? createEmptyTreeState(), entry.path)
      }
    }))

    try {
      const result = await window.sftpApi.listDirectory(connectionId, entry.path)
      set((state) => ({
        trees: {
          ...state.trees,
          [connectionId]: applyDirectoryResult(state.trees[connectionId] ?? createEmptyTreeState(), result, false)
        }
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to load ${entry.path}`
      set((state) => ({
        trees: {
          ...state.trees,
          [connectionId]: setError(state.trees[connectionId] ?? createEmptyTreeState(), entry.path, message)
        }
      }))
    }
  },

  refreshCurrentPath: async (connectionId) => {
    const tree = get().trees[connectionId] ?? createEmptyTreeState()
    if (tree.currentPath) {
      await get().loadPath(connectionId, tree.currentPath, { source: 'refresh' })
      return
    }

    await get().ensureRootLoaded(connectionId)
  },

  uploadToCurrentPath: async (connectionId) => {
    const tree = get().trees[connectionId] ?? createEmptyTreeState()
    if (!tree.currentPath) {
      return false
    }

    const result = await window.sftpApi.uploadFile(connectionId, tree.currentPath)
    if (result.canceled) {
      return false
    }

    await get().refreshCurrentPath(connectionId)
    return true
  },

  setFollowTerminalPath: (connectionId, enabled) => {
    set((state) => ({
      trees: {
        ...state.trees,
        [connectionId]: {
          ...(state.trees[connectionId] ?? createEmptyTreeState()),
          followTerminalPath: enabled
        }
      }
    }))
  }
}))
