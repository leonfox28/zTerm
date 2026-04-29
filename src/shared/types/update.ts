export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'
  | 'unavailable'

export interface IUpdateProgress {
  percent: number
  transferred: number
  total: number
  bytesPerSecond?: number
}

export interface IUpdateState {
  status: UpdateStatus
  currentVersion: string
  availableVersion?: string
  progress?: IUpdateProgress
  message: string
  checkedAt?: number
  error?: string
}
