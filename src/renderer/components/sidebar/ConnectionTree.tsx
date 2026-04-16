import { openSshConnectionCommand } from '../../commands/workbench.commands'
import { showNativeContextMenu, type NativeMenuActionItem } from '../../utils/context-menu'
import { useWorkbenchStore } from '../../stores/workbench.store'
import { useConnectionsStore, isFolder, type ConnectionItem, type ConnectionFolder } from '../../stores/connections.store'
import '../../styles/sidebar.css'

function getConnectionTypeIcon(connection: ConnectionItem): string {
  switch (connection.type) {
    case 'ssh':
      return 'codicon-remote'
    case 'local':
      return 'codicon-terminal'
    default:
      return 'codicon-plug'
  }
}

function openSshTerminal(connection: ConnectionItem) {
  useWorkbenchStore.getState().openTerminalView()
  window.dispatchEvent(
    new CustomEvent('zterm:new-terminal', {
      detail: {
        kind: 'ssh',
        connectionId: connection.id,
        title: connection.name
      }
    })
  )
}

function TreeItem({
  node,
  depth
}: {
  node: ConnectionItem | ConnectionFolder
  depth: number
}) {
  const { toggleFolder, deleteConnection } = useConnectionsStore()

  if (isFolder(node)) {
    return (
      <>
        <div className="tree-item" style={{ paddingLeft: `${8 + depth * 16}px` }} onClick={() => toggleFolder(node.id)}>
          <i
            className={`codicon ${node.expanded ? 'codicon-chevron-down' : 'codicon-chevron-right'} tree-item__arrow`}
          />
          <i className={`codicon ${node.expanded ? 'codicon-folder-opened' : 'codicon-folder'} tree-item__icon`} />
          <span className="tree-item__label">{node.name}</span>
        </div>
        {node.expanded && node.children.map((child) => <TreeItem key={child.id} node={child} depth={depth + 1} />)}
      </>
    )
  }

  return (
    <div
      className="tree-item"
      style={{ paddingLeft: `${8 + depth * 16}px` }}
      onClick={() => openSshTerminal(node)}
      onContextMenu={(event) => {
        event.preventDefault()
        const items: NativeMenuActionItem[] = [
          {
            itemId: `connection-edit-${node.id}`,
            type: 'normal',
            label: 'Edit Connection',
            onSelect: () => openSshConnectionCommand(node.id)
          },
          {
            itemId: `connection-delete-${node.id}`,
            type: 'normal',
            label: 'Delete Connection',
            onSelect: () => {
              void deleteConnection(node.id)
            }
          }
        ]

        void showNativeContextMenu({
          anchor: { x: event.clientX, y: event.clientY },
          items
        })
      }}
      title={node.host}
    >
      <span className="tree-item__arrow-placeholder" />
      <i className={`codicon ${getConnectionTypeIcon(node)} tree-item__icon`} />
      <span className="tree-item__label">{node.name}</span>
    </div>
  )
}

export function ConnectionTree() {
  const { folders, connections } = useConnectionsStore()

  const rootConnections = connections.filter((connection) => !connection.folderId)

  return (
    <div className="connection-tree">
      <div className="tree-item" style={{ paddingLeft: '8px' }} onClick={() => window.dispatchEvent(new CustomEvent('zterm:new-terminal'))}>
        <span className="tree-item__arrow-placeholder" />
        <i className="codicon codicon-terminal tree-item__icon" />
        <span className="tree-item__label">Local Terminal</span>
      </div>
      {rootConnections.map((connection) => (
        <TreeItem key={connection.id} node={connection} depth={0} />
      ))}
      {folders.map((folder) => {
        const folderConnections = connections.filter((connection) => connection.folderId === folder.id)
        const folderNode: ConnectionFolder = {
          ...folder,
          children: folderConnections
        }
        return <TreeItem key={folder.id} node={folderNode} depth={0} />
      })}
    </div>
  )
}
