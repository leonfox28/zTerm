import { type IRemoteFileEntry } from '@shared/types/sftp'
import { useContextMenuStore, type ContextMenuItem } from '../../stores/context-menu.store'
import { useRemoteFilesStore } from '../../stores/remote-files.store'
import '../../styles/sidebar.css'

interface RemoteFileTreeProps {
  connectionId: string
  currentPath: string
  rootIds: string[]
  nodes: Record<string, { entry: IRemoteFileEntry; children: string[] | null }>
  expandedPaths: string[]
  loadingPaths: string[]
  onDownloadEntry: (entry: IRemoteFileEntry) => void
  onShowEntryDetails: (entry: IRemoteFileEntry) => void
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

function ParentDirectoryItem({ connectionId }: { connectionId: string }) {
  const goToParent = useRemoteFilesStore((state) => state.goToParent)

  return (
    <div
      className="tree-item tree-item--muted"
      style={{ paddingLeft: '8px' }}
      onClick={() => {
        void goToParent(connectionId)
      }}
      title="Go to parent directory"
    >
      <span className="tree-item__arrow-placeholder" />
      <i className="codicon codicon-arrow-up tree-item__icon" />
      <span className="tree-item__label">..</span>
    </div>
  )
}

function RemoteFileTreeItem({
  connectionId,
  nodeId,
  depth,
  nodes,
  expandedPaths,
  loadingPaths,
  onDownloadEntry,
  onShowEntryDetails
}: {
  connectionId: string
  nodeId: string
  depth: number
  nodes: Record<string, { entry: IRemoteFileEntry; children: string[] | null }>
  expandedPaths: string[]
  loadingPaths: string[]
  onDownloadEntry: (entry: IRemoteFileEntry) => void
  onShowEntryDetails: (entry: IRemoteFileEntry) => void
}) {
  const toggleDirectory = useRemoteFilesStore((state) => state.toggleDirectory)
  const loadPath = useRemoteFilesStore((state) => state.loadPath)
  const openContextMenu = useContextMenuStore((state) => state.openContextMenu)
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
        onDoubleClick={() => {
          if (!isDirectory) {
            return
          }

          void loadPath(connectionId, node.entry.path, { source: 'manual' })
        }}
        onContextMenu={(event) => {
          event.preventDefault()
          const items: ContextMenuItem[] = [
            {
              id: `remote-download-${node.entry.path}`,
              type: 'action',
              label: 'Download',
              onSelect: () => onDownloadEntry(node.entry)
            },
            {
              id: `remote-details-${node.entry.path}`,
              type: 'action',
              label: 'Show Details',
              onSelect: () => onShowEntryDetails(node.entry)
            }
          ]

          openContextMenu({
            anchor: { x: event.clientX, y: event.clientY },
            items
          })
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
          onDownloadEntry={onDownloadEntry}
          onShowEntryDetails={onShowEntryDetails}
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

export function RemoteFileTree({
  connectionId,
  currentPath,
  rootIds,
  nodes,
  expandedPaths,
  loadingPaths,
  onDownloadEntry,
  onShowEntryDetails
}: RemoteFileTreeProps) {
  const parentPath = getParentPath(currentPath)

  return (
    <div className="connection-tree remote-file-tree">
      {parentPath && <ParentDirectoryItem connectionId={connectionId} />}
      {rootIds.map((nodeId) => (
        <RemoteFileTreeItem
          connectionId={connectionId}
          depth={0}
          expandedPaths={expandedPaths}
          key={nodeId}
          loadingPaths={loadingPaths}
          nodeId={nodeId}
          nodes={nodes}
          onDownloadEntry={onDownloadEntry}
          onShowEntryDetails={onShowEntryDetails}
        />
      ))}
    </div>
  )
}
