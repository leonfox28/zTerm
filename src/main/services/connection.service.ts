import { safeStorage } from 'electron'
import {
  type IConnectionItem,
  type IConnectionSaveResult,
  type IConnectionSummary,
  type IConnectionUpsertInput
} from '@shared/types/store'
import { StoreService } from './store.service'

function createConnectionId(): string {
  return `connection-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function encryptIfNeeded(value: string | undefined, shouldSave: boolean): { encrypted?: string; warning?: string } {
  if (!shouldSave || !value) {
    return {}
  }

  if (!safeStorage.isEncryptionAvailable()) {
    return {
      warning: 'Secure credential storage is unavailable, so the credential was not saved.'
    }
  }

  return {
    encrypted: safeStorage.encryptString(value).toString('base64')
  }
}

function decryptIfPresent(value?: string): string | undefined {
  if (!value || !safeStorage.isEncryptionAvailable()) {
    return undefined
  }

  return safeStorage.decryptString(Buffer.from(value, 'base64'))
}

function toSummary(connection: IConnectionItem): IConnectionSummary {
  return {
    id: connection.id,
    name: connection.name,
    type: connection.type,
    folderId: connection.folderId,
    host: connection.host,
    port: connection.port,
    username: connection.username,
    authType: connection.authType,
    privateKeyPath: connection.privateKeyPath,
    hasSavedPassword: Boolean(connection.encryptedPassword),
    hasSavedPassphrase: Boolean(connection.encryptedPassphrase)
  }
}

export class ConnectionService {
  constructor(private readonly storeService: StoreService) {}

  listConnections(): IConnectionSummary[] {
    return this.storeService.get('connections').map(toSummary)
  }

  getConnection(id: string): IConnectionItem | undefined {
    return this.storeService.get('connections').find((connection) => connection.id === id)
  }

  resolvePassword(id: string): string | undefined {
    return decryptIfPresent(this.getConnection(id)?.encryptedPassword)
  }

  resolvePassphrase(id: string): string | undefined {
    return decryptIfPresent(this.getConnection(id)?.encryptedPassphrase)
  }

  saveConnection(input: IConnectionUpsertInput): IConnectionSaveResult {
    const connections = this.storeService.get('connections')
    const connectionId = input.id ?? createConnectionId()

    const passwordResult = encryptIfNeeded(input.password, input.savePassword && input.authType === 'password')
    const passphraseResult = encryptIfNeeded(
      input.passphrase,
      input.savePassphrase && input.authType === 'privateKey'
    )

    const nextConnection: IConnectionItem = {
      id: connectionId,
      name: input.name,
      type: 'ssh',
      folderId: input.folderId || undefined,
      host: input.host,
      port: input.port,
      username: input.username,
      authType: input.authType,
      encryptedPassword: input.authType === 'password' ? passwordResult.encrypted : undefined,
      privateKeyPath: input.authType === 'privateKey' ? input.privateKeyPath || undefined : undefined,
      encryptedPassphrase: input.authType === 'privateKey' ? passphraseResult.encrypted : undefined
    }

    const existingIndex = connections.findIndex((connection) => connection.id === connectionId)
    const nextConnections = [...connections]

    if (existingIndex === -1) {
      nextConnections.push(nextConnection)
    } else {
      nextConnections[existingIndex] = nextConnection
    }

    this.storeService.set('connections', nextConnections)

    return {
      connection: toSummary(nextConnection),
      warning: passwordResult.warning ?? passphraseResult.warning
    }
  }

  deleteConnection(id: string): void {
    const nextConnections = this.storeService.get('connections').filter((connection) => connection.id !== id)
    this.storeService.set('connections', nextConnections)
  }
}
