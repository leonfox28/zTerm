import { Client, type ClientChannel, type ConnectConfig, type SFTPWrapper } from 'ssh2'
import { readFileSync } from 'fs'
import { IShellOptions } from '@shared/types/terminal'
import { type IConnectionItem } from '@shared/types/store'
import { ConnectionService } from './connection.service'
import { createSshShellLaunchCommand } from './shell-integration'

interface SharedSshClient {
  client: Client
  sftp: SFTPWrapper | null
  sftpError: string | null
  shellIds: Set<number>
  endpoint: string
}

interface ActiveSshShell {
  sharedClientId: string
  stream: ClientChannel
  onExit: (id: number, code: number | undefined) => void
  exited: boolean
}

export function getSshConnection(connectionService: ConnectionService, connectionId: string): IConnectionItem {
  const connection = connectionService.getConnection(connectionId)
  if (!connection || connection.type !== 'ssh' || !connection.host || !connection.username) {
    throw new Error('Saved SSH connection is missing required fields')
  }

  return connection
}

export function createSshConnectConfig(
  connectionService: ConnectionService,
  connectionId: string,
  onDebug?: (message: string) => void
): { connection: IConnectionItem; config: ConnectConfig } {
  const connection = getSshConnection(connectionService, connectionId)
  const config: ConnectConfig = {
    host: connection.host,
    port: connection.port ?? 22,
    username: connection.username,
    readyTimeout: 15000,
    debug: onDebug
  }

  if (connection.authType === 'privateKey') {
    if (!connection.privateKeyPath) {
      throw new Error('Private key path is required')
    }

    try {
      config.privateKey = readFileSync(connection.privateKeyPath)
    } catch (error) {
      throw new Error(
        `Failed to read private key file: ${error instanceof Error ? error.message : 'Unknown file read error'}`
      )
    }

    const passphrase = connectionService.resolvePassphrase(connectionId)
    if (passphrase) {
      config.passphrase = passphrase
    }
  } else {
    const password = connectionService.resolvePassword(connectionId)
    if (!password) {
      throw new Error('No saved password is available for this SSH connection')
    }

    config.password = password
  }

  return { connection, config }
}

export class SshService {
  private clients = new Map<string, SharedSshClient>()
  private shells = new Map<number, ActiveSshShell>()
  private nextClientId = 1

  constructor(private readonly connectionService: ConnectionService) {}

  spawn(
    id: number,
    options: IShellOptions,
    onData: (id: number, data: string) => void,
    onExit: (id: number, code: number | undefined) => void
  ): Promise<number> {
    const connectionId = options.ssh?.connectionId
    if (!connectionId) {
      throw new Error('Missing SSH connection id')
    }

    const shareWithPtyId = options.ssh?.shareWithPtyId
    if (shareWithPtyId != null) {
      return this.spawnSharedShell(id, shareWithPtyId, options, onData, onExit)
    }

    return this.spawnPrimary(id, connectionId, options, onData, onExit)
  }

  write(id: number, data: string): void {
    this.shells.get(id)?.stream.write(data)
  }

  resize(id: number, cols: number, rows: number): void {
    this.shells.get(id)?.stream.setWindow(rows, cols, 0, 0)
  }

  getSftp(id: number): SFTPWrapper {
    const shell = this.shells.get(id)
    if (!shell) {
      throw new Error('SSH terminal session is not available')
    }

    const shared = this.clients.get(shell.sharedClientId)
    if (!shared) {
      throw new Error('SSH connection is not available')
    }

    if (!shared.sftp) {
      throw new Error(shared.sftpError ?? 'SFTP is not available for this terminal session')
    }

    return shared.sftp
  }

  kill(id: number): void {
    const shell = this.shells.get(id)
    if (!shell || shell.exited) {
      return
    }

    shell.stream.close()
    this.releaseShell(id, undefined, true)
  }

  dispose(): void {
    for (const id of [...this.shells.keys()]) {
      this.kill(id)
    }
  }

  private spawnSharedShell(
    id: number,
    shareWithPtyId: number,
    options: IShellOptions,
    onData: (id: number, data: string) => void,
    onExit: (id: number, code: number | undefined) => void
  ): Promise<number> {
    const source = this.shells.get(shareWithPtyId)
    if (!source) {
      return Promise.reject(new Error('Cannot reuse SSH connection: source terminal is not available'))
    }

    const shared = this.clients.get(source.sharedClientId)
    if (!shared) {
      return Promise.reject(new Error('Cannot reuse SSH connection: shared client is not available'))
    }

    return new Promise<number>((resolve, reject) => {
      shared.client.exec(
        createSshShellLaunchCommand(),
        {
          pty: {
            cols: options.cols,
            rows: options.rows,
            term: 'xterm-256color'
          },
          env: {
            TERM_PROGRAM: 'zterm'
          }
        },
        (error, stream) => {
          if (error || !stream) {
            reject(
              new Error(
                `Failed to open additional SSH shell on shared connection: ${error?.message ?? 'Unknown error'}`
              )
            )
            return
          }

          if (!this.clients.has(source.sharedClientId)) {
            stream.close()
            reject(new Error('Shared SSH connection was closed before the shell started'))
            return
          }

          this.attachShell(id, source.sharedClientId, stream, onData, onExit)
          resolve(id)
        }
      )
    })
  }

  private spawnPrimary(
    id: number,
    connectionId: string,
    options: IShellOptions,
    onData: (id: number, data: string) => void,
    onExit: (id: number, code: number | undefined) => void
  ): Promise<number> {
    const client = new Client()
    const sharedClientId = `ssh-client-${this.nextClientId++}`

    return new Promise<number>((resolve, reject) => {
      const debugLog: string[] = []
      let settled = false
      let ready = false
      let endpoint = 'unknown SSH endpoint'

      const pushDebugLog = (message: string) => {
        debugLog.push(message)
        if (debugLog.length > 20) {
          debugLog.shift()
        }
      }

      const formatError = (summary: string, detail?: string) => {
        const lastDebug = debugLog[debugLog.length - 1]
        const parts = [`${summary} (${endpoint})`]

        if (detail) {
          parts.push(detail)
        }

        if (lastDebug) {
          parts.push(`Last SSH debug event: ${lastDebug}`)
        }

        return new Error(parts.join('. '))
      }

      const rejectOnce = (summary: string, detail?: string) => {
        if (settled) {
          return
        }

        settled = true
        client.end()
        reject(formatError(summary, detail))
      }

      const resolveOnce = () => {
        if (settled) {
          return
        }

        settled = true
        resolve(id)
      }

      let config: ConnectConfig

      try {
        const resolved = createSshConnectConfig(this.connectionService, connectionId, (message) => {
          pushDebugLog(message)
        })
        endpoint = `${resolved.connection.username}@${resolved.connection.host}:${resolved.connection.port ?? 22}`
        config = resolved.config
      } catch (error) {
        rejectOnce(error instanceof Error ? error.message : 'Failed to prepare SSH connection')
        return
      }

      client.on('ready', () => {
        ready = true

        client.exec(
          createSshShellLaunchCommand(),
          {
            pty: {
              cols: options.cols,
              rows: options.rows,
              term: 'xterm-256color'
            },
            env: {
              TERM_PROGRAM: 'zterm'
            }
          },
          (error, stream) => {
            if (error || !stream) {
              rejectOnce('SSH handshake succeeded but opening the remote terminal failed', error?.message)
              return
            }

            if (settled) {
              client.end()
              return
            }

            this.clients.set(sharedClientId, {
              client,
              sftp: null,
              sftpError: null,
              shellIds: new Set(),
              endpoint
            })

            // Attach shell I/O immediately so banner/prompt are not lost while SFTP starts.
            this.attachShell(id, sharedClientId, stream, onData, onExit)

            client.sftp((sftpError, sftp) => {
              const shared = this.clients.get(sharedClientId)
              if (!shared) {
                client.end()
                return
              }

              if (sftpError || !sftp) {
                shared.sftp = null
                shared.sftpError = sftpError?.message ?? 'Failed to start SFTP session'
              } else {
                shared.sftp = sftp
                shared.sftpError = null
              }

              resolveOnce()
            })
          }
        )
      })

      client.on('error', (error) => {
        if (!ready) {
          rejectOnce('SSH handshake failed', error.message)
          return
        }

        this.teardownSharedClient(sharedClientId, undefined)
      })

      client.on('close', () => {
        if (!ready) {
          rejectOnce(
            'SSH server closed the connection before handshake completed',
            'Check that the host, port, and SSH service are correct and reachable'
          )
          return
        }

        this.teardownSharedClient(sharedClientId, 0)
      })

      client.connect(config)
    })
  }

  private attachShell(
    id: number,
    sharedClientId: string,
    stream: ClientChannel,
    onData: (id: number, data: string) => void,
    onExit: (id: number, code: number | undefined) => void
  ): void {
    const shared = this.clients.get(sharedClientId)
    if (!shared) {
      stream.close()
      throw new Error('Shared SSH connection is not available')
    }

    shared.shellIds.add(id)
    this.shells.set(id, {
      sharedClientId,
      stream,
      onExit,
      exited: false
    })

    stream.on('data', (data: Buffer | string) => {
      const text = typeof data === 'string' ? data : data.toString('utf8')
      onData(id, text)
    })

    stream.on('close', () => {
      this.releaseShell(id, 0, true)
    })
  }

  private releaseShell(id: number, code: number | undefined, notifyExit: boolean): void {
    const shell = this.shells.get(id)
    if (!shell || shell.exited) {
      return
    }

    shell.exited = true
    this.shells.delete(id)

    const shared = this.clients.get(shell.sharedClientId)
    if (shared) {
      shared.shellIds.delete(id)
      if (shared.shellIds.size === 0) {
        this.clients.delete(shell.sharedClientId)
        shared.client.end()
      }
    }

    if (notifyExit) {
      shell.onExit(id, code)
    }
  }

  private teardownSharedClient(sharedClientId: string, code: number | undefined): void {
    const shared = this.clients.get(sharedClientId)
    if (!shared) {
      return
    }

    const shellIds = [...shared.shellIds]
    for (const shellId of shellIds) {
      this.releaseShell(shellId, code, true)
    }
  }
}
