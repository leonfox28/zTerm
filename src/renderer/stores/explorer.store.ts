import { create } from 'zustand'
import { type IFileTreeDirectoryResult, type IFileTreeEntry } from '@shared/types/file-tree'
import { useWorkbenchStore } from './workbench.store'

const ROOT_LOADING_KEY = '__root__'

export type ExplorerProviderKind = 'local' | 'ssh'

export interface ExplorerContext {
  key: string
  provider: ExplorerProviderKind
  cwd?: string
  connectionId?: string
}

interface ExplorerNode {
  entry: IFileTreeEntry
  children: string[] | null
}

type LoadPathSource = 'initial' | 'manual' | 'follow-terminal' | 'refresh'

interface ExplorerTreeState {
  currentPath: string | null
  rootIds: string[]
  nodes: Record<string, ExplorerNode>
  expandedPaths: string[]
  loadingPaths: string[]
  loadedPaths: string[]
  error: string | null
  followTerminalPath: boolean
  requestVersion: number
}

interface ExplorerState {
  trees: Record<string, ExplorerTreeState>
  ensureRootLoaded: (context: ExplorerContext) => Promise<void>
  loadPath: (context: ExplorerContext, path: string, options?: { source?: LoadPathSource }) => Promise<void>
  goToParent: (context: ExplorerContext) => Promise<void>
  toggleDirectory: (context: ExplorerContext, entry: IFileTreeEntry) => Promise<void>
  refreshCurrentPath: (context: ExplorerContext) => Promise<void>
  uploadToCurrentPath: (context: ExplorerContext) => Promise<boolean>
  setFollowTerminalPath: (key: string, enabled: boolean) => void
  setTreeError: (key: string, message: string | null) => void
}

function createEmptyTreeState(): ExplorerTreeState {
  return {
    currentPath: null,
    rootIds: [],
    nodes: {},
    expandedPaths: [],
    loadingPaths: [],
    loadedPaths: [],
    error: null,
    followTerminalPath: true,
    requestVersion: 0
  }
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values))
}

function without(values: string[], target: string): string[] {
  return values.filter((value) => value !== target)
}

function applyDirectoryResult(
  tree: ExplorerTreeState,
  result: IFileTreeDirectoryResult,
  reset: boolean
): ExplorerTreeState {
  useWorkbenchStore.getState().setStatusMessage(result.error ?? null)

  const nextNodes = reset ? {} : { ...tree.nodes }
  const childIds: string[] = []

  for (const entry of result.entries) {
    nextNodes[entry.path] = {
      entry,
      children: entry.kind === 'directory' ? nextNodes[entry.path]?.children ?? null : []
    }
    childIds.push(entry.path)
  }

  const nextTree: ExplorerTreeState = {
    ...tree,
    currentPath: reset ? result.path : tree.currentPath,
    rootIds: reset ? childIds : tree.rootIds,
    nodes: nextNodes,
    expandedPaths: reset ? [] : tree.expandedPaths,
    loadedPaths: result.error
      ? without(tree.loadedPaths, result.path)
      : reset
        ? [result.path]
        : unique([...tree.loadedPaths, result.path]),
    loadingPaths: without(without(tree.loadingPaths, result.path), ROOT_LOADING_KEY),
    error: result.error ?? null
  }

  if (!reset && nextTree.nodes[result.path]) {
    nextTree.nodes[result.path] = {
      ...nextTree.nodes[result.path],
      children: childIds
    }
  }

  return nextTree
}

function setLoading(tree: ExplorerTreeState, path: string): ExplorerTreeState {
  useWorkbenchStore.getState().setStatusMessage(null)

  return {
    ...tree,
    loadingPaths: unique([...tree.loadingPaths, path]),
    error: null,
    requestVersion: tree.requestVersion + 1
  }
}

function setError(tree: ExplorerTreeState, path: string, error: string): ExplorerTreeState {
  useWorkbenchStore.getState().setStatusMessage(error)

  return {
    ...tree,
    loadingPaths: without(tree.loadingPaths, path),
    loadedPaths: without(tree.loadedPaths, path),
    error
  }
}

function getParentPath(path: string): string | null {
  const normalized = path.replace(/\/+$/, '') || path
  const parentPath = normalized.slice(0, normalized.lastIndexOf('/'))

  if (!parentPath) {
    return normalized === '/' ? null : '/'
  }

  if (parentPath === normalized) {
    return null
  }

  return parentPath
}

async function getInitialDirectory(context: ExplorerContext): Promise<IFileTreeDirectoryResult> {
  if (context.provider === 'ssh') {
    if (!context.connectionId) {
      throw new Error('Missing SSH connection id')
    }

    return window.sftpApi.getInitialDirectory(context.connectionId)
  }

  return window.localFileTreeApi.getInitialDirectory(context.cwd)
}

async function listDirectory(context: ExplorerContext, path: string): Promise<IFileTreeDirectoryResult> {
  if (context.provider === 'ssh') {
    if (!context.connectionId) {
      throw new Error('Missing SSH connection id')
    }

    return window.sftpApi.listDirectory(context.connectionId, path)
  }

  return window.localFileTreeApi.listDirectory(path)
}

export const useExplorerStore = create<ExplorerState>((set, get) => ({
  trees: {},

  ensureRootLoaded: async (context) => {
    const currentTree = get().trees[context.key] ?? createEmptyTreeState()
    if (currentTree.currentPath && currentTree.loadedPaths.includes(currentTree.currentPath)) {
      return
    }

    const loadingKey = currentTree.currentPath ?? ROOT_LOADING_KEY
    let requestVersion = 0

    set((state) => {
      const nextTree = setLoading(state.trees[context.key] ?? createEmptyTreeState(), loadingKey)
      requestVersion = nextTree.requestVersion
      return {
        trees: {
          ...state.trees,
          [context.key]: nextTree
        }
      }
    })

    try {
      const result = await getInitialDirectory(context)
      set((state) => {
        const tree = state.trees[context.key] ?? createEmptyTreeState()
        if (tree.requestVersion !== requestVersion) {
          return state
        }

        return {
          trees: {
            ...state.trees,
            [context.key]: applyDirectoryResult(tree, result, true)
          }
        }
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load files'
      set((state) => {
        const tree = state.trees[context.key] ?? createEmptyTreeState()
        if (tree.requestVersion !== requestVersion) {
          return state
        }

        return {
          trees: {
            ...state.trees,
            [context.key]: {
              ...setError(tree, ROOT_LOADING_KEY, message),
              currentPath: null,
              rootIds: []
            }
          }
        }
      })
      throw error
    }
  },

  loadPath: async (context, path, options) => {
    const source = options?.source ?? 'manual'
    let requestVersion = 0

    set((state) => {
      const nextTree = setLoading(state.trees[context.key] ?? createEmptyTreeState(), path)
      requestVersion = nextTree.requestVersion
      return {
        trees: {
          ...state.trees,
          [context.key]: nextTree
        }
      }
    })

    try {
      const result = await listDirectory(context, path)
      set((state) => {
        const tree = state.trees[context.key] ?? createEmptyTreeState()
        if (tree.requestVersion !== requestVersion) {
          return state
        }

        const nextTree = result.error ? setError(tree, path, result.error) : applyDirectoryResult(tree, result, true)
        return {
          trees: {
            ...state.trees,
            [context.key]: source === 'manual' ? { ...nextTree, followTerminalPath: false } : nextTree
          }
        }
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to load ${path}`
      set((state) => {
        const tree = state.trees[context.key] ?? createEmptyTreeState()
        if (tree.requestVersion !== requestVersion) {
          return state
        }

        return {
          trees: {
            ...state.trees,
            [context.key]: setError(tree, path, message)
          }
        }
      })
      throw error
    }
  },

  goToParent: async (context) => {
    const tree = get().trees[context.key] ?? createEmptyTreeState()
    const parentPath = tree.currentPath ? getParentPath(tree.currentPath) : null
    if (!parentPath) {
      return
    }

    await get().loadPath(context, parentPath, { source: 'manual' })
  },

  toggleDirectory: async (context, entry) => {
    if (entry.kind !== 'directory') {
      return
    }

    const tree = get().trees[context.key] ?? createEmptyTreeState()
    if (tree.expandedPaths.includes(entry.path)) {
      set((state) => ({
        trees: {
          ...state.trees,
          [context.key]: {
            ...(state.trees[context.key] ?? createEmptyTreeState()),
            expandedPaths: without((state.trees[context.key] ?? createEmptyTreeState()).expandedPaths, entry.path)
          }
        }
      }))
      return
    }

    set((state) => ({
      trees: {
        ...state.trees,
        [context.key]: {
          ...(state.trees[context.key] ?? createEmptyTreeState()),
          expandedPaths: unique([...(state.trees[context.key] ?? createEmptyTreeState()).expandedPaths, entry.path])
        }
      }
    }))

    if (tree.loadedPaths.includes(entry.path)) {
      return
    }

    let requestVersion = 0

    set((state) => {
      const nextTree = setLoading(state.trees[context.key] ?? createEmptyTreeState(), entry.path)
      requestVersion = nextTree.requestVersion
      return {
        trees: {
          ...state.trees,
          [context.key]: nextTree
        }
      }
    })

    try {
      const result = await listDirectory(context, entry.path)
      set((state) => {
        const tree = state.trees[context.key] ?? createEmptyTreeState()
        if (tree.requestVersion !== requestVersion) {
          return state
        }

        const nextTree = applyDirectoryResult(tree, result, false)
        if (result.error) {
          return {
            trees: {
              ...state.trees,
              [context.key]: {
                ...nextTree,
                expandedPaths: without(nextTree.expandedPaths, entry.path)
              }
            }
          }
        }

        return {
          trees: {
            ...state.trees,
            [context.key]: nextTree
          }
        }
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to load ${entry.path}`
      set((state) => {
        const tree = state.trees[context.key] ?? createEmptyTreeState()
        if (tree.requestVersion !== requestVersion) {
          return state
        }

        return {
          trees: {
            ...state.trees,
            [context.key]: setError(tree, entry.path, message)
          }
        }
      })
      throw error
    }
  },

  refreshCurrentPath: async (context) => {
    const tree = get().trees[context.key] ?? createEmptyTreeState()
    if (tree.currentPath) {
      await get().loadPath(context, tree.currentPath, { source: 'refresh' })
      return
    }

    await get().ensureRootLoaded(context)
  },

  uploadToCurrentPath: async (context) => {
    if (context.provider !== 'ssh' || !context.connectionId) {
      return false
    }

    const tree = get().trees[context.key] ?? createEmptyTreeState()
    if (!tree.currentPath) {
      return false
    }

    try {
      const result = await window.sftpApi.uploadFile(context.connectionId, tree.currentPath)
      if (result.canceled) {
        return false
      }

      await get().refreshCurrentPath(context)
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload file'
      useWorkbenchStore.getState().setStatusMessage(message)
      set((state) => ({
        trees: {
          ...state.trees,
          [context.key]: {
            ...(state.trees[context.key] ?? createEmptyTreeState()),
            error: message
          }
        }
      }))
      throw error
    }
  },

  setFollowTerminalPath: (key, enabled) => {
    set((state) => ({
      trees: {
        ...state.trees,
        [key]: {
          ...(state.trees[key] ?? createEmptyTreeState()),
          followTerminalPath: enabled
        }
      }
    }))
  },

  setTreeError: (key, message) => {
    useWorkbenchStore.getState().setStatusMessage(message)
    set((state) => ({
      trees: {
        ...state.trees,
        [key]: {
          ...(state.trees[key] ?? createEmptyTreeState()),
          error: message
        }
      }
    }))
  }
}))
