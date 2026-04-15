import { create } from 'zustand'
import { type IRemoteDirectoryResult, type IRemoteFileEntry } from '@shared/types/sftp'

const ROOT_LOADING_KEY = '__root__'

interface RemoteFileNode {
  entry: IRemoteFileEntry
  children: string[] | null
}

interface RemoteConnectionTreeState {
  rootPath: string | null
  rootIds: string[]
  nodes: Record<string, RemoteFileNode>
  expandedPaths: string[]
  loadingPaths: string[]
  loadedPaths: string[]
  error: string | null
}

interface RemoteFilesState {
  trees: Record<string, RemoteConnectionTreeState>
  ensureRootLoaded: (connectionId: string) => Promise<void>
  toggleDirectory: (connectionId: string, entry: IRemoteFileEntry) => Promise<void>
  refreshConnection: (connectionId: string) => Promise<void>
}

function createEmptyTreeState(): RemoteConnectionTreeState {
  return {
    rootPath: null,
    rootIds: [],
    nodes: {},
    expandedPaths: [],
    loadingPaths: [],
    loadedPaths: [],
    error: null
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
    rootPath: reset ? result.path : tree.rootPath,
    rootIds: reset ? childIds : tree.rootIds,
    nodes: nextNodes,
    loadedPaths: unique([...tree.loadedPaths, result.path]),
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

export const useRemoteFilesStore = create<RemoteFilesState>((set, get) => ({
  trees: {},

  ensureRootLoaded: async (connectionId) => {
    const currentTree = get().trees[connectionId] ?? createEmptyTreeState()
    if (currentTree.rootPath && currentTree.loadedPaths.includes(currentTree.rootPath)) {
      return
    }

    set((state) => ({
      trees: {
        ...state.trees,
        [connectionId]: setLoading(state.trees[connectionId] ?? createEmptyTreeState(), currentTree.rootPath ?? ROOT_LOADING_KEY)
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
            rootPath: null,
            rootIds: []
          }
        }
      }))
    }
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

  refreshConnection: async (connectionId) => {
    set((state) => ({
      trees: {
        ...state.trees,
        [connectionId]: createEmptyTreeState()
      }
    }))

    await get().ensureRootLoaded(connectionId)
  }
}))
