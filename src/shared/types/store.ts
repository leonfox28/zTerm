import type { ThemeId } from '@shared/config/theme.config'

export type ConnectionType = 'local' | 'ssh'
export type ConnectionAuthType = 'password' | 'privateKey'

export interface ISettings {
  fontSize: number
  fontFamily: string
  shellPath: string
  loginShell: boolean
  copyOnSelect: boolean
  theme: ThemeId
}

export interface IConnectionItem {
  id: string
  name: string
  type: ConnectionType
  folderId?: string
  host?: string
  port?: number
  username?: string
  authType?: ConnectionAuthType
  encryptedPassword?: string
  privateKeyPath?: string
  encryptedPassphrase?: string
}

export interface IConnectionSummary {
  id: string
  name: string
  type: ConnectionType
  folderId?: string
  host?: string
  port?: number
  username?: string
  authType?: ConnectionAuthType
  privateKeyPath?: string
  hasSavedPassword?: boolean
  hasSavedPassphrase?: boolean
}

export interface IConnectionUpsertInput {
  id?: string
  name: string
  folderId?: string
  host: string
  port: number
  username: string
  authType: ConnectionAuthType
  password?: string
  savePassword: boolean
  privateKeyPath?: string
  passphrase?: string
  savePassphrase: boolean
}

export interface IConnectionSaveResult {
  connection: IConnectionSummary
  warning?: string
}

export interface IConnectionFolder {
  id: string
  name: string
  parentId?: string
  expanded: boolean
}

export interface IStoreSchema {
  settings: ISettings
  connections: IConnectionItem[]
  connectionFolders: IConnectionFolder[]
}

export const DEFAULT_SETTINGS: ISettings = {
  fontSize: 14,
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
  shellPath: '',
  loginShell: true,
  copyOnSelect: true,
  theme: 'dark-plus'
}
