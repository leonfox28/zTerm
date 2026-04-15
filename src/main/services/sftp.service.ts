import { promises as fs } from 'fs'
import { basename, join } from 'path'
import { Client, type FileEntryWithStats, type SFTPWrapper } from 'ssh2'
import {
  type IRemoteDirectoryResult,
  type IRemoteEntryDetails,
  type IRemoteFileEntry,
  type RemoteFileKind
} from '@shared/types/sftp'
import { ConnectionService } from './connection.service'
import { createSshConnectConfig } from './ssh.service'

function joinRemotePath(parent: string, name: string): string {
  if (parent === '/') {
    return `/${name}`
  }

  return `${parent.replace(/\/+$/, '')}/${name}`
}

function toRemoteFileKind(entry: Pick<FileEntryWithStats, 'attrs'>): RemoteFileKind {
  if (entry.attrs.isDirectory()) {
    return 'directory'
  }

  if (entry.attrs.isFile()) {
    return 'file'
  }

  if (entry.attrs.isSymbolicLink()) {
    return 'symlink'
  }

  return 'unknown'
}

function toRemoteFileEntry(parentPath: string, entry: FileEntryWithStats): IRemoteFileEntry {
  return {
    name: entry.filename,
    path: joinRemotePath(parentPath, entry.filename),
    kind: toRemoteFileKind(entry),
    size: entry.attrs.size ?? 0,
    mtime: entry.attrs.mtime ?? 0
  }
}

function sortEntries(entries: IRemoteFileEntry[]): IRemoteFileEntry[] {
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

export class SftpService {
  constructor(private readonly connectionService: ConnectionService) {}

  async getInitialDirectory(connectionId: string): Promise<IRemoteDirectoryResult> {
    return this.withSftp(connectionId, async (sftp) => {
      const path = await this.resolveInitialPath(sftp)
      return this.readDirectory(sftp, path)
    })
  }

  async listDirectory(connectionId: string, path: string): Promise<IRemoteDirectoryResult> {
    return this.withSftp(connectionId, async (sftp) => this.readDirectory(sftp, path))
  }

  async uploadFile(connectionId: string, localFilePath: string, destinationPath: string): Promise<void> {
    return this.withSftp(connectionId, async (sftp) => {
      const remoteFilePath = joinRemotePath(destinationPath, basename(localFilePath))
      if (await this.pathExists(sftp, remoteFilePath)) {
        throw new Error(`Remote path already exists: ${remoteFilePath}`)
      }

      await this.fastPut(sftp, localFilePath, remoteFilePath)
    })
  }

  async downloadEntry(
    connectionId: string,
    entryPath: string,
    kind: RemoteFileKind,
    destinationPath: string
  ): Promise<void> {
    return this.withSftp(connectionId, async (sftp) => {
      if (kind === 'directory') {
        const localDirectoryPath = join(destinationPath, basename(entryPath))
        await this.downloadDirectory(sftp, entryPath, localDirectoryPath)
        return
      }

      await this.fastGet(sftp, entryPath, destinationPath)
    })
  }

  async getEntryDetails(connectionId: string, path: string): Promise<IRemoteEntryDetails> {
    return this.withSftp(connectionId, async (sftp) => this.readEntryDetails(sftp, path))
  }

  private async withSftp<T>(connectionId: string, run: (sftp: SFTPWrapper) => Promise<T>): Promise<T> {
    const client = new Client()

    return new Promise<T>((resolve, reject) => {
      let settled = false

      const finishReject = (error: unknown) => {
        if (settled) {
          return
        }

        settled = true
        client.end()
        reject(error instanceof Error ? error : new Error('SFTP operation failed'))
      }

      const finishResolve = (value: T) => {
        if (settled) {
          return
        }

        settled = true
        client.end()
        resolve(value)
      }

      let config
      try {
        config = createSshConnectConfig(this.connectionService, connectionId).config
      } catch (error) {
        finishReject(error)
        return
      }

      client.on('ready', () => {
        client.sftp((error, sftp) => {
          if (error || !sftp) {
            finishReject(new Error(`Failed to start SFTP session: ${error?.message ?? 'Unknown error'}`))
            return
          }

          void run(sftp).then(finishResolve).catch(finishReject)
        })
      })

      client.on('error', (error) => {
        finishReject(new Error(`SFTP connection failed: ${error.message}`))
      })

      client.on('close', () => {
        if (!settled) {
          finishReject(new Error('SFTP connection closed unexpectedly'))
        }
      })

      client.connect(config)
    })
  }

  private readDirectory(sftp: SFTPWrapper, path: string): Promise<IRemoteDirectoryResult> {
    return new Promise((resolve, reject) => {
      sftp.readdir(path, (error, entries) => {
        if (error) {
          reject(new Error(`Failed to read remote directory ${path}: ${error.message}`))
          return
        }

        const filteredEntries = entries
          .filter((entry) => entry.filename !== '.' && entry.filename !== '..')
          .map((entry) => toRemoteFileEntry(path, entry))

        resolve({
          path,
          entries: sortEntries(filteredEntries)
        })
      })
    })
  }

  private readEntryDetails(sftp: SFTPWrapper, path: string): Promise<IRemoteEntryDetails> {
    return new Promise((resolve, reject) => {
      sftp.lstat(path, (error, stats) => {
        if (error || !stats) {
          reject(new Error(`Failed to read remote entry details for ${path}: ${error?.message ?? 'Unknown error'}`))
          return
        }

        resolve({
          path,
          kind: toRemoteFileKind({ attrs: stats }),
          size: stats.size ?? 0,
          mtime: stats.mtime ?? 0
        })
      })
    })
  }

  private fastPut(sftp: SFTPWrapper, localFilePath: string, remoteFilePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      sftp.fastPut(localFilePath, remoteFilePath, (error) => {
        if (error) {
          reject(new Error(`Failed to upload file to ${remoteFilePath}: ${error.message}`))
          return
        }

        resolve()
      })
    })
  }

  private fastGet(sftp: SFTPWrapper, remoteFilePath: string, localFilePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      sftp.fastGet(remoteFilePath, localFilePath, (error) => {
        if (error) {
          reject(new Error(`Failed to download remote file ${remoteFilePath}: ${error.message}`))
          return
        }

        resolve()
      })
    })
  }

  private async downloadDirectory(sftp: SFTPWrapper, remoteDirectoryPath: string, localDirectoryPath: string): Promise<void> {
    await fs.mkdir(localDirectoryPath, { recursive: true })
    const directory = await this.readDirectory(sftp, remoteDirectoryPath)

    for (const entry of directory.entries) {
      const localEntryPath = join(localDirectoryPath, entry.name)
      if (entry.kind === 'directory') {
        await this.downloadDirectory(sftp, entry.path, localEntryPath)
        continue
      }

      await this.fastGet(sftp, entry.path, localEntryPath)
    }
  }

  private pathExists(sftp: SFTPWrapper, path: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      sftp.lstat(path, (error, stats) => {
        if (!error && stats) {
          resolve(true)
          return
        }

        if (error && error.message.toLowerCase().includes('no such file')) {
          resolve(false)
          return
        }

        if (error && 'code' in error && error.code === 2) {
          resolve(false)
          return
        }

        if (error) {
          reject(new Error(`Failed to inspect remote path ${path}: ${error.message}`))
          return
        }

        resolve(false)
      })
    })
  }

  private async resolveInitialPath(sftp: SFTPWrapper): Promise<string> {
    const currentPath = await this.tryRealpath(sftp, '.')
    if (currentPath) {
      return currentPath
    }

    return '/'
  }

  private tryRealpath(sftp: SFTPWrapper, path: string): Promise<string | null> {
    return new Promise((resolve) => {
      sftp.realpath(path, (error, resolvedPath) => {
        if (error || !resolvedPath) {
          resolve(null)
          return
        }

        resolve(resolvedPath)
      })
    })
  }
}
