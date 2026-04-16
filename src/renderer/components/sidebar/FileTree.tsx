import { type IFileTreeEntry } from '@shared/types/file-tree'
import { showNativeContextMenu, type NativeMenuActionItem } from '../../utils/context-menu'
import { type ExplorerContext, useExplorerStore } from '../../stores/explorer.store'
import '../../styles/sidebar.css'

interface FileTreeProps {
  context: ExplorerContext
  currentPath: string
  rootIds: string[]
  nodes: Record<string, { entry: IFileTreeEntry; children: string[] | null }>
  expandedPaths: string[]
  loadingPaths: string[]
  onDownloadEntry?: (entry: IFileTreeEntry) => void
  onShowEntryDetails?: (entry: IFileTreeEntry) => void
}

function getFileIcon(entry: IFileTreeEntry, expanded: boolean): string {
  if (entry.kind === 'directory') {
    return expanded ? 'codicon-folder-opened' : 'codicon-folder'
  }

  if (entry.kind === 'symlink') {
    return 'codicon-symbol-link'
  }

  return 'codicon-file'
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

function ParentDirectoryItem({ context }: { context: ExplorerContext }) {
  const goToParent = useExplorerStore((state) => state.goToParent)

  return (
    <div
      className="tree-item tree-item--muted"
      style={{ paddingLeft: '8px' }}
      onClick={() => {
        void goToParent(context)
      }}
      title="Go to parent directory"
    >
      <span className="tree-item__arrow-placeholder" />
      <i className="codicon codicon-arrow-up tree-item__icon" />
      <span className="tree-item__label">..</span>
    </div>
  )
}

function FileTreeItem({
  context,
  nodeId,
  depth,
  nodes,
  expandedPaths,
  loadingPaths,
  onDownloadEntry,
  onShowEntryDetails
}: {
  context: ExplorerContext
  nodeId: string
  depth: number
  nodes: Record<string, { entry: IFileTreeEntry; children: string[] | null }>
  expandedPaths: string[]
  loadingPaths: string[]
  onDownloadEntry?: (entry: IFileTreeEntry) => void
  onShowEntryDetails?: (entry: IFileTreeEntry) => void
}) {
  const toggleDirectory = useExplorerStore((state) => state.toggleDirectory)
  const loadPath = useExplorerStore((state) => state.loadPath)
  const node = nodes[nodeId]

  if (!node) {
    return null
  }

  const expanded = expandedPaths.includes(node.entry.path)
  const loading = loadingPaths.includes(node.entry.path)
  const isDirectory = node.entry.kind === 'directory'
  const hasLoadedChildren = Array.isArray(node.children)
  const canShowContextActions = Boolean(onDownloadEntry || onShowEntryDetails)

  return (
    <>
      <div
        className="tree-item"
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => {
          if (!isDirectory) {
            return
          }

          void toggleDirectory(context, node.entry)
        }}
        onDoubleClick={() => {
          if (!isDirectory) {
            return
          }

          void loadPath(context, node.entry.path, { source: 'manual' })
        }}
        onContextMenu={(event) => {
          if (!canShowContextActions) {
            return
          }

          event.preventDefault()
          const items: NativeMenuActionItem[] = []

          if (onDownloadEntry) {
            items.push({
              itemId: `file-tree-download-${node.entry.path}`,
              type: 'normal',
              label: 'Download',
              onSelect: () => onDownloadEntry(node.entry)
            })
          }

          if (onShowEntryDetails) {
            items.push({
              itemId: `file-tree-details-${node.entry.path}`,
              type: 'normal',
              label: 'Show Details',
              onSelect: () => onShowEntryDetails(node.entry)
            })
          }

          void showNativeContextMenu({
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
        <i className={`codicon ${getFileIcon(node.entry, expanded)} tree-item__icon`} />
        <span className="tree-item__label">{node.entry.name}</span>
        {loading && <span className="remote-file-tree__meta">Loading…</span>}
      </div>
      {isDirectory && expanded && hasLoadedChildren && node.children!.map((childId) => (
        <FileTreeItem
          context={context}
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

export function FileTree({
  context,
  currentPath,
  rootIds,
  nodes,
  expandedPaths,
  loadingPaths,
  onDownloadEntry,
  onShowEntryDetails
}: FileTreeProps) {
  const parentPath = getParentPath(currentPath)

  return (
    <div className="connection-tree remote-file-tree">
      {parentPath && <ParentDirectoryItem context={context} />}
      {rootIds.map((nodeId) => (
        <FileTreeItem
          context={context}
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
