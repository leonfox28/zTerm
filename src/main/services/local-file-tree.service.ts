import os from 'os'
import { promises as fs } from 'fs'
import path from 'path'
import { type Dirent } from 'fs'
import { type IFileTreeDirectoryResult, type IFileTreeEntry, type FileTreeEntryKind } from '@shared/types/file-tree'

function toFileTreeEntryKind(entry: Dirent): FileTreeEntryKind {
  if (entry.isDirectory()) {
    return 'directory'
  }

  if (entry.isFile()) {
    return 'file'
  }

  if (entry.isSymbolicLink()) {
    return 'symlink'
  }

  return 'unknown'
}

function sortEntries(entries: IFileTreeEntry[]): IFileTreeEntry[] {
  return [...entries].sort((a, b) => {
    if (a.kind === 'directory' && b.kind !== 'directory') {
      return -1
    }

    if (a.kind !== 'directory' && b.kind === 'directory') {
      return 1
    }

    return a.name.localeCompare(b.name)
  })
}

export class LocalFileTreeService {
  async getInitialDirectory(preferredPath?: string): Promise<IFileTreeDirectoryResult> {
    const initialPath = preferredPath?.trim() || os.homedir()

    try {
      return await this.listDirectory(initialPath)
    } catch {
      return this.listDirectory(os.homedir())
    }
  }

  async listDirectory(directoryPath: string): Promise<IFileTreeDirectoryResult> {
    const resolvedPath = path.resolve(directoryPath)
    const entries = await fs.readdir(resolvedPath, { withFileTypes: true })

    const fileEntries = await Promise.all(
      entries
        .filter((entry) => entry.name !== '.' && entry.name !== '..')
        .map(async (entry) => {
          const entryPath = path.join(resolvedPath, entry.name)
          const stats = await fs.lstat(entryPath)

          return {
            name: entry.name,
            path: entryPath,
            kind: toFileTreeEntryKind(entry),
            size: stats.size,
            mtime: Math.floor(stats.mtimeMs / 1000)
          } satisfies IFileTreeEntry
        })
    )

    return {
      path: resolvedPath,
      entries: sortEntries(fileEntries)
    }
  }
}
