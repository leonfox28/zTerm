import { useEffect } from 'react'
import { type IRemoteFileEntry } from '@shared/types/sftp'
import { RemoteFileTree } from '../sidebar/RemoteFileTree'
import { useConnectionsStore } from '../../stores/connections.store'
import { useRemoteFilesStore } from '../../stores/remote-files.store'
import { useTerminalStore } from '../../stores/terminal.store'
import { WorkbenchPane } from './WorkbenchPane'

function getActiveSession() {
  const { activeTabId, tabs, panes, sessions } = useTerminalStore.getState()
  if (activeTabId === null) {
    return null
  }

  const activeTab = tabs.find((tab) => tab.id === activeTabId)
  if (!activeTab) {
    return null
  }

  const activePane = panes[activeTab.activePaneId]
  if (!activePane || activePane.type !== 'leaf') {
    return null
  }

  const session = sessions[activePane.sessionId]
  if (!session || session.kind !== 'ssh' || !session.connectionId) {
    return null
  }

  return session
}

function escapeShellPath(path: string): string {
  return `'${path.replaceAll("'", `'\\''`)}'`
}

export function AuxiliarySidebar() {
  const activeSession = useTerminalStore(() => getActiveSession())
  const connections = useConnectionsStore((state) => state.connections)
  const trees = useRemoteFilesStore((state) => state.trees)
  const ensureRootLoaded = useRemoteFilesStore((state) => state.ensureRootLoaded)
  const loadPath = useRemoteFilesStore((state) => state.loadPath)
  const refreshCurrentPath = useRemoteFilesStore((state) => state.refreshCurrentPath)
  const uploadToCurrentPath = useRemoteFilesStore((state) => state.uploadToCurrentPath)
  const setFollowTerminalPath = useRemoteFilesStore((state) => state.setFollowTerminalPath)

  const activeConnectionId = activeSession?.connectionId ?? null
  const activeConnection = connections.find((connection) => connection.id === activeConnectionId)
  const tree = activeConnectionId ? trees[activeConnectionId] : undefined

  useEffect(() => {
    if (!activeConnectionId) {
      return
    }

    void ensureRootLoaded(activeConnectionId)
  }, [activeConnectionId, ensureRootLoaded])

  useEffect(() => {
    if (!activeConnectionId || !activeSession?.cwd || !tree?.followTerminalPath || tree.currentPath === activeSession.cwd) {
      return
    }

    void loadPath(activeConnectionId, activeSession.cwd, { source: 'follow-terminal' })
  }, [activeConnectionId, activeSession?.cwd, loadPath, tree?.currentPath, tree?.followTerminalPath])
  const title = activeConnection ? activeConnection.name : 'Remote Files'
  const isRootLoading = Boolean(activeConnectionId && !tree?.currentPath && tree?.loadingPaths.length)

  const handleDownloadEntry = async (entry: IRemoteFileEntry) => {
    if (!activeConnectionId) {
      return
    }

    await window.sftpApi.downloadEntry(activeConnectionId, entry.path, entry.kind)
  }

  const handleShowEntryDetails = async (entry: IRemoteFileEntry) => {
    if (!activeConnectionId) {
      return
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
  }

  return (
    <WorkbenchPane variant="auxiliary" title={title} contentClassName="auxiliarybar__content">
      {!activeConnectionId ? (
        <div className="auxiliarybar__message">Remote files are available for SSH terminals.</div>
      ) : tree?.error ? (
        <div className="auxiliarybar__message auxiliarybar__message--error">{tree.error}</div>
      ) : isRootLoading ? (
        <div className="auxiliarybar__message">Loading remote files…</div>
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
              disabled={!activeConnectionId || !activeSession?.cwd}
              onClick={() => {
                if (!activeConnectionId) {
                  return
                }

                if (tree.followTerminalPath) {
                  setFollowTerminalPath(activeConnectionId, false)
                  return
                }

                setFollowTerminalPath(activeConnectionId, true)
                if (!activeSession?.cwd) {
                  return
                }

                void loadPath(activeConnectionId, activeSession.cwd, { source: 'follow-terminal' }).catch((error: unknown) => {
                  window.alert(error instanceof Error ? error.message : 'Terminal path unavailable')
                })
              }}
              title={tree.followTerminalPath ? 'Stop following terminal path' : 'Follow terminal path'}
              type="button"
            >
              <i className="codicon codicon-folder-active" />
            </button>
            <button
              className="workbench-pane__icon-button"
              onClick={() => {
                if (!activeConnectionId) {
                  return
                }

                void uploadToCurrentPath(activeConnectionId)
              }}
              title="Upload file to current path"
              type="button"
            >
              <i className="codicon codicon-cloud-upload" />
            </button>
            <button
              className="workbench-pane__icon-button"
              onClick={() => {
                if (!activeConnectionId) {
                  return
                }

                void refreshCurrentPath(activeConnectionId)
              }}
              title="Refresh current path"
              type="button"
            >
              <i className="codicon codicon-refresh" />
            </button>
          </div>
          <RemoteFileTree
            connectionId={activeConnectionId}
            currentPath={tree.currentPath}
            expandedPaths={tree.expandedPaths}
            loadingPaths={tree.loadingPaths}
            nodes={tree.nodes}
            onDownloadEntry={handleDownloadEntry}
            onShowEntryDetails={handleShowEntryDetails}
            rootIds={tree.rootIds}
          />
        </>
      ) : (
        <div className="auxiliarybar__message">No remote files found.</div>
      )}
    </WorkbenchPane>
  )
}
