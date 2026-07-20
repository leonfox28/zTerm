import { create } from 'zustand'
import { type IFileTreeDirectoryResult, type IFileTreeEntry } from '@shared/types/file-tree'
import { useWorkbenchStore } from './workbench.store'

const ROOT_LOADING_KEY = '__root__'

export type ExplorerProviderKind = 'local' | 'ssh'

export interface ExplorerContext {
  key: string
  provider: ExplorerProviderKind
  cwd?: string
  /** Saved SSH connection id — display / config only. */
  connectionId?: string
  /** Runtime terminal pty id — required for SSH SFTP operations. */
  ptyId?: number
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
  /** Invalidates in-flight root/navigation loads (reset:true). */
  navigationToken: number
  /** Invalidates in-flight per-path expand loads without affecting other paths. */
  pathTokens: Record<string, number>
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
    navigationToken: 0,
    pathTokens: {}
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

function beginNavigationLoad(
  tree: ExplorerTreeState,
  path: string
): { tree: ExplorerTreeState; navigationToken: number } {
  useWorkbenchStore.getState().setStatusMessage(null)
  const navigationToken = tree.navigationToken + 1

  return {
    navigationToken,
    tree: {
      ...tree,
      loadingPaths: unique([...tree.loadingPaths, path]),
      error: null,
      navigationToken
    }
  }
}

function beginPathLoad(
  tree: ExplorerTreeState,
  path: string
): { tree: ExplorerTreeState; navigationToken: number; pathToken: number } {
  useWorkbenchStore.getState().setStatusMessage(null)
  const pathToken = (tree.pathTokens[path] ?? 0) + 1

  return {
    navigationToken: tree.navigationToken,
    pathToken,
    tree: {
      ...tree,
      loadingPaths: unique([...tree.loadingPaths, path]),
      error: null,
      pathTokens: {
        ...tree.pathTokens,
        [path]: pathToken
      }
    }
  }
}

function isCurrentNavigation(tree: ExplorerTreeState, navigationToken: number): boolean {
  return tree.navigationToken === navigationToken
}

function isCurrentPathLoad(tree: ExplorerTreeState, path: string, navigationToken: number, pathToken: number): boolean {
  return tree.navigationToken === navigationToken && tree.pathTokens[path] === pathToken
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

function requireSshPtyId(context: ExplorerContext): number {
  if (context.ptyId == null) {
    throw new Error('SSH terminal session is not ready')
  }

  return context.ptyId
}

async function getInitialDirectory(context: ExplorerContext): Promise<IFileTreeDirectoryResult> {
  if (context.provider === 'ssh') {
    return window.sftpApi.getInitialDirectory(requireSshPtyId(context))
  }

  return window.localFileTreeApi.getInitialDirectory(context.cwd)
}

async function listDirectory(context: ExplorerContext, path: string): Promise<IFileTreeDirectoryResult> {
  if (context.provider === 'ssh') {
    return window.sftpApi.listDirectory(requireSshPtyId(context), path)
  }

  return window.localFileTreeApi.listDirectory(path)
}

export const useExplorerStore = create<ExplorerState>((set, get) => ({
  trees: {},

  ensureRootLoaded: async (context) => {
    if (context.provider === 'ssh' && context.ptyId == null) {
      return
    }

    const currentTree = get().trees[context.key] ?? createEmptyTreeState()
    if (currentTree.currentPath && currentTree.loadedPaths.includes(currentTree.currentPath)) {
      return
    }

    const loadingKey = currentTree.currentPath ?? ROOT_LOADING_KEY
    let navigationToken = 0

    set((state) => {
      const started = beginNavigationLoad(state.trees[context.key] ?? createEmptyTreeState(), loadingKey)
      navigationToken = started.navigationToken
      return {
        trees: {
          ...state.trees,
          [context.key]: started.tree
        }
      }
    })

    try {
      const result = await getInitialDirectory(context)
      set((state) => {
        const tree = state.trees[context.key] ?? createEmptyTreeState()
        if (!isCurrentNavigation(tree, navigationToken)) {
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
        if (!isCurrentNavigation(tree, navigationToken)) {
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
    if (context.provider === 'ssh' && context.ptyId == null) {
      throw new Error('SSH terminal session is not ready')
    }

    const source = options?.source ?? 'manual'
    let navigationToken = 0

    set((state) => {
      const started = beginNavigationLoad(state.trees[context.key] ?? createEmptyTreeState(), path)
      navigationToken = started.navigationToken
      return {
        trees: {
          ...state.trees,
          [context.key]: started.tree
        }
      }
    })

    try {
      const result = await listDirectory(context, path)
      set((state) => {
        const tree = state.trees[context.key] ?? createEmptyTreeState()
        if (!isCurrentNavigation(tree, navigationToken)) {
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
        if (!isCurrentNavigation(tree, navigationToken)) {
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

    let navigationToken = 0
    let pathToken = 0

    set((state) => {
      const started = beginPathLoad(state.trees[context.key] ?? createEmptyTreeState(), entry.path)
      navigationToken = started.navigationToken
      pathToken = started.pathToken
      return {
        trees: {
          ...state.trees,
          [context.key]: started.tree
        }
      }
    })

    try {
      const result = await listDirectory(context, entry.path)
      set((state) => {
        const tree = state.trees[context.key] ?? createEmptyTreeState()
        if (!isCurrentPathLoad(tree, entry.path, navigationToken, pathToken)) {
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
        if (!isCurrentPathLoad(tree, entry.path, navigationToken, pathToken)) {
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
    if (context.provider !== 'ssh' || context.ptyId == null) {
      return false
    }

    const tree = get().trees[context.key] ?? createEmptyTreeState()
    if (!tree.currentPath) {
      return false
    }

    try {
      const result = await window.sftpApi.uploadFile(context.ptyId, tree.currentPath)
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
