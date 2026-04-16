import { useEffect, useMemo } from 'react'
import { type IFileTreeEntry } from '@shared/types/file-tree'
import { FileTree } from '../sidebar/FileTree'
import { useConnectionsStore } from '../../stores/connections.store'
import { type ExplorerContext, useExplorerStore } from '../../stores/explorer.store'
import { useTerminalStore, type TerminalSession } from '../../stores/terminal.store'
import { useWorkbenchStore } from '../../stores/workbench.store'
import { WorkbenchPane } from './WorkbenchPane'

function escapeShellPath(path: string): string {
  return `'${path.replaceAll("'", `'\\''`)}'`
}

function createExplorerContext(session: TerminalSession | null): ExplorerContext | null {
  if (!session) {
    return null
  }

  if (session.kind === 'ssh' && session.connectionId) {
    return {
      key: `ssh:${session.connectionId}`,
      provider: 'ssh',
      connectionId: session.connectionId,
      cwd: session.cwd
    }
  }

  if (session.kind === 'local') {
    return {
      key: `local:${session.id}`,
      provider: 'local',
      cwd: session.cwd
    }
  }

  return null
}

export function AuxiliarySidebar() {
  const activeSession = useTerminalStore((state) => {
    if (state.activeTabId === null) {
      return null
    }

    const activeTab = state.tabs.find((tab) => tab.id === state.activeTabId)
    if (!activeTab) {
      return null
    }

    const activePane = state.panes[activeTab.activePaneId]
    if (!activePane || activePane.type !== 'leaf') {
      return null
    }

    return state.sessions[activePane.sessionId] ?? null
  })
  const connections = useConnectionsStore((state) => state.connections)
  const trees = useExplorerStore((state) => state.trees)
  const ensureRootLoaded = useExplorerStore((state) => state.ensureRootLoaded)
  const loadPath = useExplorerStore((state) => state.loadPath)
  const refreshCurrentPath = useExplorerStore((state) => state.refreshCurrentPath)
  const uploadToCurrentPath = useExplorerStore((state) => state.uploadToCurrentPath)
  const setFollowTerminalPath = useExplorerStore((state) => state.setFollowTerminalPath)
  const setTreeError = useExplorerStore((state) => state.setTreeError)

  const explorerContext = useMemo(() => createExplorerContext(activeSession), [activeSession])
  const activeConnectionId = explorerContext?.provider === 'ssh' ? explorerContext.connectionId ?? null : null
  const activeConnection = connections.find((connection) => connection.id === activeConnectionId)
  const tree = explorerContext ? trees[explorerContext.key] : undefined
  const explorerKey = explorerContext?.key ?? null
  const setStatusMessage = useWorkbenchStore((state) => state.setStatusMessage)

  useEffect(() => {
    setStatusMessage(tree?.error ?? null)
  }, [setStatusMessage, tree?.error, explorerKey])

  useEffect(() => {
    if (!explorerContext) {
      return
    }

    void ensureRootLoaded(explorerContext).catch((error: unknown) => {
      setTreeError(explorerContext.key, error instanceof Error ? error.message : 'Failed to load files')
    })
  }, [explorerContext, ensureRootLoaded, setTreeError])

  useEffect(() => {
    if (!explorerContext || !activeSession?.cwd || !tree?.followTerminalPath || tree.currentPath === activeSession.cwd) {
      return
    }

    void loadPath(explorerContext, activeSession.cwd, { source: 'follow-terminal' }).catch((error: unknown) => {
      setTreeError(explorerContext.key, error instanceof Error ? error.message : 'Terminal path unavailable')
    })
  }, [explorerContext, activeSession?.cwd, loadPath, setTreeError, tree?.currentPath, tree?.followTerminalPath])
  const title = explorerContext?.provider === 'ssh' ? activeConnection?.name ?? 'Remote Files' : 'Explorer'
  const isRootLoading = Boolean(explorerContext && !tree?.currentPath && tree?.loadingPaths.length)

  const handleDownloadEntry = async (entry: IFileTreeEntry) => {
    if (!activeConnectionId) {
      return
    }

    try {
      if (explorerKey) {
        setTreeError(explorerKey, null)
      }
      await window.sftpApi.downloadEntry(activeConnectionId, entry.path, entry.kind)
    } catch (error) {
      if (explorerKey) {
        setTreeError(explorerKey, error instanceof Error ? error.message : `Failed to download ${entry.name}`)
      }
      throw error
    }
  }

  const handleShowEntryDetails = async (entry: IFileTreeEntry) => {
    if (!activeConnectionId) {
      return
    }

    try {
      if (explorerKey) {
        setTreeError(explorerKey, null)
      }
      const details = await window.sftpApi.getEntryDetails(activeConnectionId, entry.path)
      window.alert(
        [
          `Path: ${details.path}`,
          `Kind: ${details.kind}`,
          `Size: ${details.size}`,
          `Modified: ${details.mtime ? new Date(details.mtime * 1000).toLocaleString() : 'Unknown'}`
        ].join('\n')
      )
    } catch (error) {
      if (explorerKey) {
        setTreeError(explorerKey, error instanceof Error ? error.message : `Failed to load details for ${entry.name}`)
      }
      throw error
    }
  }

  return (
    <WorkbenchPane variant="auxiliary" title={title} contentClassName="auxiliarybar__content">
      {!explorerContext ? (
        <div className="auxiliarybar__message">File browsing is available from terminal sessions.</div>
      ) : isRootLoading ? (
        <div className="auxiliarybar__message">Loading files…</div>
      ) : tree?.currentPath ? (
        <>
          <div className="auxiliarybar__path" title={tree.currentPath}>
            {tree.currentPath}
          </div>
          <div className="auxiliarybar__toolbar">
            <button
              className="workbench-pane__icon-button"
              onClick={() => {
                if (!activeSession?.ptyId || !tree.currentPath) {
                  return
                }

                window.terminalApi.write(activeSession.ptyId, `cd ${escapeShellPath(tree.currentPath)}\n`)
              }}
              title="Switch terminal to current file tree path"
              type="button"
            >
              <i className="codicon codicon-terminal" />
            </button>
            <button
              className={`workbench-pane__icon-button${tree.followTerminalPath ? '' : ' workbench-pane__icon-button--inactive'}`}
              disabled={!activeSession?.cwd}
              onClick={() => {
                if (!explorerContext) {
                  return
                }

                if (tree.followTerminalPath) {
                  setFollowTerminalPath(explorerContext.key, false)
                  return
                }

                setFollowTerminalPath(explorerContext.key, true)
                if (!activeSession?.cwd) {
                  return
                }

                void loadPath(explorerContext, activeSession.cwd, { source: 'follow-terminal' }).catch((error: unknown) => {
                  setTreeError(explorerContext.key, error instanceof Error ? error.message : 'Terminal path unavailable')
                })
              }}
              title={tree.followTerminalPath ? 'Stop following terminal path' : 'Follow terminal path'}
              type="button"
            >
              <i className="codicon codicon-folder-active" />
            </button>
            {explorerContext.provider === 'ssh' ? (
              <button
                className="workbench-pane__icon-button"
                onClick={() => {
                  void uploadToCurrentPath(explorerContext).catch((error: unknown) => {
                    setTreeError(explorerContext.key, error instanceof Error ? error.message : 'Failed to upload file')
                  })
                }}
                title="Upload file to current path"
                type="button"
              >
                <i className="codicon codicon-cloud-upload" />
              </button>
            ) : null}
            <button
              className="workbench-pane__icon-button"
              onClick={() => {
                void refreshCurrentPath(explorerContext)
              }}
              title="Refresh current path"
              type="button"
            >
              <i className="codicon codicon-refresh" />
            </button>
          </div>
          <FileTree
            context={explorerContext}
            currentPath={tree.currentPath}
            expandedPaths={tree.expandedPaths}
            loadingPaths={tree.loadingPaths}
            nodes={tree.nodes}
            onDownloadEntry={explorerContext.provider === 'ssh' ? handleDownloadEntry : undefined}
            onShowEntryDetails={explorerContext.provider === 'ssh' ? handleShowEntryDetails : undefined}
            rootIds={tree.rootIds}
          />
        </>
      ) : (
        <div className="auxiliarybar__message">No files found.</div>
      )}
    </WorkbenchPane>
  )
}
