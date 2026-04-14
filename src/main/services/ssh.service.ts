import { Client, type ClientChannel, type ConnectConfig } from 'ssh2'
import { readFileSync } from 'fs'
import { IShellOptions } from '@shared/types/terminal'
import { ConnectionService } from './connection.service'

interface ActiveSshProcess {
  client: Client
  stream: ClientChannel
}

export class SshService {
  private processes = new Map<number, ActiveSshProcess>()

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

    const connection = this.connectionService.getConnection(connectionId)
    if (!connection || connection.type !== 'ssh' || !connection.host || !connection.username) {
      throw new Error('Saved SSH connection is missing required fields')
    }

    const client = new Client()
    const endpoint = `${connection.username}@${connection.host}:${connection.port ?? 22}`

    return new Promise<number>((resolve, reject) => {
      const debugLog: string[] = []
      let settled = false
      let ready = false
      let exited = false

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
        reject(formatError(summary, detail))
      }

      const resolveOnce = () => {
        if (settled) {
          return
        }

        settled = true
        resolve(id)
      }

      const exitOnce = (code: number | undefined) => {
        if (exited) {
          return
        }

        exited = true
        this.processes.delete(id)
        onExit(id, code)
      }

      const config: ConnectConfig = {
        host: connection.host,
        port: connection.port ?? 22,
        username: connection.username,
        readyTimeout: 15000,
        debug: (message: string) => {
          pushDebugLog(message)
        }
      }

      if (connection.authType === 'privateKey') {
        if (!connection.privateKeyPath) {
          rejectOnce('Private key path is required')
          return
        }

        try {
          config.privateKey = readFileSync(connection.privateKeyPath)
        } catch (error) {
          rejectOnce(
            'Failed to read private key file',
            error instanceof Error ? error.message : 'Unknown file read error'
          )
          return
        }

        const passphrase = this.connectionService.resolvePassphrase(connectionId)
        if (passphrase) {
          config.passphrase = passphrase
        }
      } else {
        const password = this.connectionService.resolvePassword(connectionId)
        if (!password) {
          rejectOnce('No saved password is available for this SSH connection')
          return
        }

        config.password = password
      }

      client.on('ready', () => {
        ready = true

        client.shell(
          {
            cols: options.cols,
            rows: options.rows,
            term: 'xterm-256color'
          },
          (error, stream) => {
            if (error) {
              client.end()
              rejectOnce('SSH handshake succeeded but opening the remote shell failed', error.message)
              return
            }

            stream.on('data', (data: Buffer | string) => {
              onData(id, typeof data === 'string' ? data : data.toString('utf8'))
            })

            stream.on('close', () => {
              exitOnce(0)
              client.end()
            })

            this.processes.set(id, { client, stream })
            resolveOnce()
          }
        )
      })

      client.on('error', (error) => {
        if (!ready) {
          rejectOnce('SSH handshake failed', error.message)
          return
        }

        exitOnce(undefined)
      })

      client.on('close', () => {
        if (!ready) {
          rejectOnce(
            'SSH server closed the connection before handshake completed',
            'Check that the host, port, and SSH service are correct and reachable'
          )
          return
        }

        exitOnce(0)
      })

      client.connect(config)
    })
  }

  write(id: number, data: string): void {
    this.processes.get(id)?.stream.write(data)
  }

  resize(id: number, cols: number, rows: number): void {
    this.processes.get(id)?.stream.setWindow(rows, cols, 0, 0)
  }

  kill(id: number): void {
    const process = this.processes.get(id)
    if (!process) {
      return
    }

    process.stream.close()
    process.client.end()
    this.processes.delete(id)
  }

  dispose(): void {
    for (const id of this.processes.keys()) {
      this.kill(id)
    }
  }
}
