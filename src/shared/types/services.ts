import { IShellOptions } from './terminal'

export interface ITerminalService {
  spawn(
    options: IShellOptions,
    onData: (id: number, data: string) => void,
    onExit: (id: number, code: number | undefined) => void
  ): number | Promise<number>
  write(id: number, data: string): void
  resize(id: number, cols: number, rows: number): void
  kill(id: number): void
  dispose(): void
}
