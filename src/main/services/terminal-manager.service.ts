import { ITerminalService } from '@shared/types/services'
import { IShellOptions } from '@shared/types/terminal'
import { PtyService } from './pty.service'
import { SshService } from './ssh.service'

export class TerminalManagerService implements ITerminalService {
  private nextId = 1
  private sessionKinds = new Map<number, 'local' | 'ssh'>()

  constructor(
    private readonly ptyService: PtyService,
    private readonly sshService: SshService
  ) {}

  spawn(
    options: IShellOptions,
    onData: (id: number, data: string) => void,
    onExit: (id: number, code: number | undefined) => void
  ): Promise<number> | number {
    const id = this.nextId++

    if (options.ssh) {
      this.sessionKinds.set(id, 'ssh')
      return this.sshService.spawn(
        id,
        options,
        onData,
        (termId, code) => {
          this.sessionKinds.delete(termId)
          onExit(termId, code)
        }
      ).catch((error) => {
        this.sessionKinds.delete(id)
        throw error
      })
    }

    this.sessionKinds.set(id, 'local')
    try {
      this.ptyService.spawn(
        options,
        onData,
        (termId, code) => {
          this.sessionKinds.delete(termId)
          onExit(termId, code)
        },
        id
      )
      return id
    } catch (error) {
      this.sessionKinds.delete(id)
      throw error
    }
  }

  write(id: number, data: string): void {
    if (this.sessionKinds.get(id) === 'ssh') {
      this.sshService.write(id, data)
      return
    }
    this.ptyService.write(id, data)
  }

  resize(id: number, cols: number, rows: number): void {
    if (this.sessionKinds.get(id) === 'ssh') {
      this.sshService.resize(id, cols, rows)
      return
    }
    this.ptyService.resize(id, cols, rows)
  }

  kill(id: number): void {
    if (this.sessionKinds.get(id) === 'ssh') {
      this.sshService.kill(id)
      this.sessionKinds.delete(id)
      return
    }
    this.ptyService.kill(id)
    this.sessionKinds.delete(id)
  }

  dispose(): void {
    this.ptyService.dispose()
    this.sshService.dispose()
    this.sessionKinds.clear()
  }
}
