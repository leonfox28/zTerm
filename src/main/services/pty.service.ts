import * as pty from 'node-pty'
import os from 'os'
import { promises as fs } from 'fs'
import { IShellOptions } from '@shared/types/terminal'
import { ITerminalService } from '@shared/types/services'
import { resolveShellLaunch } from './shell-launch'
import { createLocalShellLaunchConfig } from './local-shell-integration'

export class PtyService implements ITerminalService {
  private processes = new Map<number, pty.IPty>()
  private nextId = 1

  getDefaultShell(): string {
    if (process.platform === 'win32') {
      return process.env.COMSPEC || 'cmd.exe'
    }
    return process.env.SHELL || '/bin/zsh'
  }

  async spawn(
    options: IShellOptions,
    onData: (id: number, data: string) => void,
    onExit: (id: number, code: number | undefined) => void,
    id?: number
  ): Promise<number> {
    const processId = id ?? this.nextId++
    const { shell } = resolveShellLaunch(options, () => this.getDefaultShell())
    const cwd = options.cwd || os.homedir()
    const shellConfig = await createLocalShellLaunchConfig(shell, options.loginShell ?? true)

    const proc = pty.spawn(shellConfig.shell, shellConfig.args, {
      name: 'xterm-256color',
      cols: options.cols,
      rows: options.rows,
      cwd,
      env: { ...process.env, ...options.env, ...shellConfig.env } as Record<string, string>
    })

    proc.onData((data) => onData(processId, data))
    proc.onExit(({ exitCode }) => {
      void (async () => {
        if (shellConfig.cleanupPath) {
          await fs.rm(shellConfig.cleanupPath, { recursive: true, force: true }).catch(() => undefined)
        }
      })()
      onExit(processId, exitCode)
      this.processes.delete(processId)
    })

    this.processes.set(processId, proc)
    return processId
  }

  write(id: number, data: string): void {
    this.processes.get(id)?.write(data)
  }

  resize(id: number, cols: number, rows: number): void {
    this.processes.get(id)?.resize(cols, rows)
  }

  kill(id: number): void {
    this.processes.get(id)?.kill()
    this.processes.delete(id)
  }

  dispose(): void {
    for (const [id] of this.processes) {
      this.kill(id)
    }
  }
}
