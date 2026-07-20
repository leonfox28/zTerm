export type TerminalSessionKind = 'local' | 'ssh'

export interface ISshTerminalOptions {
  connectionId: string
  /** Reuse an existing SSH client from another shell in the same tab (split). */
  shareWithPtyId?: number
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
