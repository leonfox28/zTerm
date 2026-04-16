import { type IFileTreeDirectoryResult, type IFileTreeEntry, type FileTreeEntryKind } from './file-tree'

export type RemoteFileKind = FileTreeEntryKind
export type IRemoteFileEntry = IFileTreeEntry
export type IRemoteDirectoryResult = IFileTreeDirectoryResult

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
