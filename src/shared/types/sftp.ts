export type RemoteFileKind = 'file' | 'directory' | 'symlink' | 'unknown'

export interface IRemoteFileEntry {
  name: string
  path: string
  kind: RemoteFileKind
  size: number
  mtime: number
}

export interface IRemoteDirectoryResult {
  path: string
  entries: IRemoteFileEntry[]
}
