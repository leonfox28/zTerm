export type TerminalSessionKind = 'local' | 'ssh'

export interface ISshTerminalOptions {
  connectionId: string
}

export interface IShellOptions {
  cols: number
  rows: number
  cwd?: string
  shell?: string
  loginShell?: boolean
  env?: Record<string, string>
  ssh?: ISshTerminalOptions
}

export interface ITerminalData {
  id: number
  data: string
}

export interface ITerminalExit {
  id: number
  code: number | undefined
}
