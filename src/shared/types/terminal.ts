export interface IShellOptions {
  cols: number
  rows: number
  cwd?: string
  shell?: string
  env?: Record<string, string>
}

export interface ITerminalData {
  id: number
  data: string
}

export interface ITerminalExit {
  id: number
  code: number | undefined
}
