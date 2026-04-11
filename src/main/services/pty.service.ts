import * as pty from 'node-pty'
import { IShellOptions } from '@shared/types/terminal'
import os from 'os'

export class PtyService {
  private processes = new Map<number, pty.IPty>()
  private nextId = 1

  getDefaultShell(): string {
    if (process.platform === 'win32') {
      return process.env.COMSPEC || 'cmd.exe'
    }
    return process.env.SHELL || '/bin/zsh'
  }

  spawn(
    options: IShellOptions,
    onData: (id: number, data: string) => void,
    onExit: (id: number, code: number | undefined) => void
  ): number {
    const id = this.nextId++
    const shell = options.shell || this.getDefaultShell()

    const cwd = options.cwd || os.homedir()

    const proc = pty.spawn(shell, ['-l'], {
      name: 'xterm-256color',
      cols: options.cols,
      rows: options.rows,
      cwd,
      env: { ...process.env, ...options.env } as Record<string, string>
    })

    proc.onData((data) => onData(id, data))
    proc.onExit(({ exitCode }) => {
      onExit(id, exitCode)
      this.processes.delete(id)
    })

    this.processes.set(id, proc)
    return id
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
