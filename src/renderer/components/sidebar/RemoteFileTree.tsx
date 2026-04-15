import { type IRemoteFileEntry } from '@shared/types/sftp'
import { useRemoteFilesStore } from '../../stores/remote-files.store'
import '../../styles/sidebar.css'

interface RemoteFileTreeProps {
  connectionId: string
  rootIds: string[]
  nodes: Record<string, { entry: IRemoteFileEntry; children: string[] | null }>
  expandedPaths: string[]
  loadingPaths: string[]
}

function getRemoteFileIcon(entry: IRemoteFileEntry, expanded: boolean): string {
  if (entry.kind === 'directory') {
    return expanded ? 'codicon-folder-opened' : 'codicon-folder'
  }

  if (entry.kind === 'symlink') {
    return 'codicon-symbol-link'
  }

  return 'codicon-file'
}

function RemoteFileTreeItem({
  connectionId,
  nodeId,
  depth,
  nodes,
  expandedPaths,
  loadingPaths
}: {
  connectionId: string
  nodeId: string
  depth: number
  nodes: Record<string, { entry: IRemoteFileEntry; children: string[] | null }>
  expandedPaths: string[]
  loadingPaths: string[]
}) {
  const toggleDirectory = useRemoteFilesStore((state) => state.toggleDirectory)
  const node = nodes[nodeId]

  if (!node) {
    return null
  }

  const expanded = expandedPaths.includes(node.entry.path)
  const loading = loadingPaths.includes(node.entry.path)
  const isDirectory = node.entry.kind === 'directory'
  const hasLoadedChildren = Array.isArray(node.children)

  return (
    <>
      <div
        className="tree-item"
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => {
          if (!isDirectory) {
            return
          }

          void toggleDirectory(connectionId, node.entry)
        }}
        title={node.entry.path}
      >
        {isDirectory ? (
          <i
            className={`codicon ${expanded ? 'codicon-chevron-down' : 'codicon-chevron-right'} tree-item__arrow`}
          />
        ) : (
          <span className="tree-item__arrow-placeholder" />
        )}
        <i className={`codicon ${getRemoteFileIcon(node.entry, expanded)} tree-item__icon`} />
        <span className="tree-item__label">{node.entry.name}</span>
        {loading && <span className="remote-file-tree__meta">Loading…</span>}
      </div>
      {isDirectory && expanded && hasLoadedChildren && node.children!.map((childId) => (
        <RemoteFileTreeItem
          connectionId={connectionId}
          depth={depth + 1}
          expandedPaths={expandedPaths}
          key={childId}
          loadingPaths={loadingPaths}
          nodeId={childId}
          nodes={nodes}
        />
      ))}
      {isDirectory && expanded && hasLoadedChildren && node.children!.length === 0 && !loading && (
        <div className="tree-item remote-file-tree__empty" style={{ paddingLeft: `${24 + depth * 16}px` }}>
          <span className="tree-item__arrow-placeholder" />
          <span className="tree-item__label">Empty</span>
        </div>
      )}
    </>
  )
}

export function RemoteFileTree({ connectionId, rootIds, nodes, expandedPaths, loadingPaths }: RemoteFileTreeProps) {
  return (
    <div className="connection-tree remote-file-tree">
      {rootIds.map((nodeId) => (
        <RemoteFileTreeItem
          connectionId={connectionId}
          depth={0}
          expandedPaths={expandedPaths}
          key={nodeId}
          loadingPaths={loadingPaths}
          nodeId={nodeId}
          nodes={nodes}
        />
      ))}
    </div>
  )
}
