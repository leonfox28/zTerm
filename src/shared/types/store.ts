import type { ThemeId } from '@shared/config/theme.config'

export interface ISettings {
  fontSize: number
  fontFamily: string
  shellPath: string
  loginShell: boolean
  theme: ThemeId
}

export interface IConnectionItem {
  id: string
  name: string
  type: 'local' | 'ssh'
  folderId?: string
  host?: string
  port?: number
  username?: string
  authType?: 'password' | 'privateKey'
  encryptedPassword?: string
  privateKeyPath?: string
  encryptedPassphrase?: string
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
  theme: 'dark-plus'
}
