import {
  useConnectionsStore,
  isFolder,
  type ConnectionItem,
  type ConnectionFolder
} from '../../stores/connections.store'
import '../../styles/sidebar.css'

function handleNewTerminal() {
  window.dispatchEvent(new CustomEvent('zterm:new-terminal'))
}

function TreeItem({
  node,
  depth
}: {
  node: ConnectionItem | ConnectionFolder
  depth: number
}) {
  const { toggleFolder } = useConnectionsStore()

  if (isFolder(node)) {
    return (
      <>
        <div
          className="tree-item"
          style={{ paddingLeft: `${8 + depth * 16}px` }}
          onClick={() => toggleFolder(node.id)}
        >
          <i
            className={`codicon ${node.expanded ? 'codicon-chevron-down' : 'codicon-chevron-right'} tree-item__arrow`}
          />
          <i
            className={`codicon ${node.expanded ? 'codicon-folder-opened' : 'codicon-folder'} tree-item__icon`}
          />
          <span className="tree-item__label">{node.name}</span>
        </div>
        {node.expanded &&
          node.children.map((child) => (
            <TreeItem key={child.id} node={child} depth={depth + 1} />
          ))}
      </>
    )
  }

  return (
    <div
      className="tree-item"
      style={{ paddingLeft: `${8 + depth * 16}px` }}
      onClick={handleNewTerminal}
    >
      <span className="tree-item__arrow-placeholder" />
      <i className="codicon codicon-plug tree-item__icon" />
      <span className="tree-item__label">{node.name}</span>
    </div>
  )
}

export function ConnectionTree() {
  const { folders } = useConnectionsStore()

  return (
    <div className="connection-tree">
      <div className="tree-item" style={{ paddingLeft: '8px' }} onClick={handleNewTerminal}>
        <span className="tree-item__arrow-placeholder" />
        <i className="codicon codicon-terminal tree-item__icon" />
        <span className="tree-item__label">Local Terminal</span>
      </div>
      {folders.map((folder) => (
        <TreeItem key={folder.id} node={folder} depth={0} />
      ))}
    </div>
  )
}
