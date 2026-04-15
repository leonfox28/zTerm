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

export interface IRemoteEntryDetails {
  path: string
  kind: RemoteFileKind
  size: number
  mtime: number
}

export interface ISftpUploadResult {
  canceled: boolean
}

export interface ISftpDownloadResult {
  canceled: boolean
}
