import { useEffect } from 'react'
import { RemoteFileTree } from '../sidebar/RemoteFileTree'
import { useConnectionsStore } from '../../stores/connections.store'
import { useRemoteFilesStore } from '../../stores/remote-files.store'
import { useTerminalStore } from '../../stores/terminal.store'

function getActiveConnectionId() {
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

  return session.connectionId
}

export function AuxiliarySidebar() {
  const activeConnectionId = useTerminalStore(() => getActiveConnectionId())
  const connections = useConnectionsStore((state) => state.connections)
  const trees = useRemoteFilesStore((state) => state.trees)
  const ensureRootLoaded = useRemoteFilesStore((state) => state.ensureRootLoaded)
  const refreshConnection = useRemoteFilesStore((state) => state.refreshConnection)

  useEffect(() => {
    if (!activeConnectionId) {
      return
    }

    void ensureRootLoaded(activeConnectionId)
  }, [activeConnectionId, ensureRootLoaded])

  const activeConnection = connections.find((connection) => connection.id === activeConnectionId)
  const tree = activeConnectionId ? trees[activeConnectionId] : undefined
  const title = activeConnection ? activeConnection.name : 'Remote Files'
  const isRootLoading = Boolean(activeConnectionId && !tree?.rootPath && tree?.loadingPaths.length)

  return (
    <div className="auxiliarybar">
      <div className="auxiliarybar__header">
        <span className="auxiliarybar__title">{title}</span>
        {activeConnectionId && (
          <div className="auxiliarybar__actions">
            <div
              className="auxiliarybar__action"
              title="Refresh Remote Files"
              onClick={() => {
                void refreshConnection(activeConnectionId)
              }}
            >
              <i className="codicon codicon-refresh" />
            </div>
          </div>
        )}
      </div>
      <div className="auxiliarybar__content">
        {!activeConnectionId ? (
          <div className="auxiliarybar__message">Remote files are available for SSH terminals.</div>
        ) : tree?.error ? (
          <div className="auxiliarybar__message auxiliarybar__message--error">{tree.error}</div>
        ) : isRootLoading ? (
          <div className="auxiliarybar__message">Loading remote files…</div>
        ) : tree?.rootPath ? (
          <>
            <div className="auxiliarybar__path" title={tree.rootPath}>
              {tree.rootPath}
            </div>
            <RemoteFileTree
              connectionId={activeConnectionId}
              expandedPaths={tree.expandedPaths}
              loadingPaths={tree.loadingPaths}
              nodes={tree.nodes}
              rootIds={tree.rootIds}
            />
          </>
        ) : (
          <div className="auxiliarybar__message">No remote files found.</div>
        )}
      </div>
    </div>
  )
}
