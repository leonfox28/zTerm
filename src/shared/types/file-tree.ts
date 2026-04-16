export type FileTreeEntryKind = 'file' | 'directory' | 'symlink' | 'unknown'

export interface IFileTreeEntry {
  name: string
  path: string
  kind: FileTreeEntryKind
  size: number
  mtime: number
}

export interface IFileTreeDirectoryResult {
  path: string
  entries: IFileTreeEntry[]
}
