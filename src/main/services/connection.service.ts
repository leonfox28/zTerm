import {
  type IConnectionItem,
  type IConnectionSaveResult,
  type IConnectionSummary,
  type IConnectionUpsertInput
} from '@shared/types/store'
import {
  CredentialStorageService,
  type CredentialKind
} from './credential-storage.service'
import { StoreService } from './store.service'

type LegacyCredentialFields = {
  encryptedPassword?: string
  encryptedPassphrase?: string
}

type CredentialAction =
  | { kind: CredentialKind; type: 'keep' }
  | { kind: CredentialKind; type: 'delete' }
  | { kind: CredentialKind; type: 'set'; value: string }

type AppliedCredentialAction = {
  kind: CredentialKind
  previous: string | undefined
}

function createConnectionId(): string {
  return `connection-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function hasStoredCredential(connection: IConnectionItem | undefined, kind: CredentialKind): boolean {
  if (!connection) {
    return false
  }

  const legacy = connection as IConnectionItem & LegacyCredentialFields
  return kind === 'password'
    ? Boolean(connection.hasSavedPassword || legacy.encryptedPassword)
    : Boolean(connection.hasSavedPassphrase || legacy.encryptedPassphrase)
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
    hasSavedPassword: hasStoredCredential(connection, 'password'),
    hasSavedPassphrase: hasStoredCredential(connection, 'passphrase')
  }
}

function planCredentialActions(
  input: IConnectionUpsertInput,
  existing: IConnectionItem | undefined
): CredentialAction[] {
  const passwordAction: CredentialAction =
    input.authType !== 'password' || !input.savePassword
      ? { kind: 'password', type: 'delete' }
      : input.password
        ? { kind: 'password', type: 'set', value: input.password }
        : hasStoredCredential(existing, 'password')
          ? { kind: 'password', type: 'keep' }
          : { kind: 'password', type: 'delete' }

  const passphraseAction: CredentialAction =
    input.authType !== 'privateKey' || !input.savePassphrase
      ? { kind: 'passphrase', type: 'delete' }
      : input.passphrase
        ? { kind: 'passphrase', type: 'set', value: input.passphrase }
        : hasStoredCredential(existing, 'passphrase')
          ? { kind: 'passphrase', type: 'keep' }
          : { kind: 'passphrase', type: 'delete' }

  return [passwordAction, passphraseAction]
}

function actionStoresCredential(action: CredentialAction): boolean {
  return action.type === 'set' || action.type === 'keep'
}

export class ConnectionService {
  private readonly credentialStorage = new CredentialStorageService()
  private migrationPromise: Promise<void> | null = null

  constructor(private readonly storeService: StoreService) {}

  listConnections(): IConnectionSummary[] {
    return this.storeService.get('connections').map(toSummary)
  }

  getConnection(id: string): IConnectionItem | undefined {
    return this.storeService.get('connections').find((connection) => connection.id === id)
  }

  async resolvePassword(id: string): Promise<string | undefined> {
    return this.resolveCredential(id, 'password')
  }

  async resolvePassphrase(id: string): Promise<string | undefined> {
    return this.resolveCredential(id, 'passphrase')
  }

  async saveConnection(input: IConnectionUpsertInput): Promise<IConnectionSaveResult> {
    await this.ensureCredentialsMigrated()

    const connections = this.storeService.get('connections')
    const connectionId = input.id ?? createConnectionId()
    const existing = connections.find((connection) => connection.id === connectionId)
    const actions = planCredentialActions(input, existing)
    const applied = await this.applyCredentialActions(connectionId, actions)

    const nextConnection: IConnectionItem = {
      id: connectionId,
      name: input.name,
      type: 'ssh',
      folderId: input.folderId || undefined,
      host: input.host,
      port: input.port,
      username: input.username,
      authType: input.authType,
      hasSavedPassword: actionStoresCredential(actions[0]),
      privateKeyPath: input.authType === 'privateKey' ? input.privateKeyPath || undefined : undefined,
      hasSavedPassphrase: actionStoresCredential(actions[1])
    }

    const existingIndex = connections.findIndex((connection) => connection.id === connectionId)
    const nextConnections = [...connections]

    if (existingIndex === -1) {
      nextConnections.push(nextConnection)
    } else {
      nextConnections[existingIndex] = nextConnection
    }

    try {
      this.storeService.set('connections', nextConnections)
    } catch (error) {
      await this.rollbackCredentialActions(connectionId, applied)
      throw error
    }

    return {
      connection: toSummary(nextConnection)
    }
  }

  async deleteConnection(id: string): Promise<void> {
    await this.ensureCredentialsMigrated()

    const connections = this.storeService.get('connections')
    if (!connections.some((connection) => connection.id === id)) {
      return
    }

    const actions: CredentialAction[] = [
      { kind: 'password', type: 'delete' },
      { kind: 'passphrase', type: 'delete' }
    ]
    const applied = await this.applyCredentialActions(id, actions)
    const nextConnections = connections.filter((connection) => connection.id !== id)

    try {
      this.storeService.set('connections', nextConnections)
    } catch (error) {
      await this.rollbackCredentialActions(id, applied)
      throw error
    }
  }

  private async resolveCredential(id: string, kind: CredentialKind): Promise<string | undefined> {
    await this.ensureCredentialsMigrated()

    const connection = this.getConnection(id)
    if (!hasStoredCredential(connection, kind)) {
      return undefined
    }

    return this.credentialStorage.get(id, kind)
  }

  private async ensureCredentialsMigrated(): Promise<void> {
    if (!this.migrationPromise) {
      this.migrationPromise = this.migrateCredentials().catch((error) => {
        this.migrationPromise = null
        throw error
      })
    }

    await this.migrationPromise
  }

  private async migrateCredentials(): Promise<void> {
    const connections = this.storeService.get('connections')
    const hasLegacyCredentials = this.credentialStorage.hasLegacyCredentials(connections)

    if (hasLegacyCredentials) {
      const migrated = await this.credentialStorage.migrateLegacyCredentials(connections)
      this.storeService.set('connections', migrated)
    }

    await this.credentialStorage.cleanupLegacyStorage()
  }

  private async applyCredentialActions(
    connectionId: string,
    actions: readonly CredentialAction[]
  ): Promise<AppliedCredentialAction[]> {
    const applied: AppliedCredentialAction[] = []

    try {
      for (const action of actions) {
        if (action.type === 'keep') {
          const existing = await this.credentialStorage.get(connectionId, action.kind)
          if (existing === undefined) {
            throw new Error(
              `The saved ${action.kind} is missing from the system credential store; enter it again`
            )
          }
          continue
        }

        const previous = await this.credentialStorage.get(connectionId, action.kind)
        applied.push({ kind: action.kind, previous })

        if (action.type === 'set') {
          await this.credentialStorage.set(connectionId, action.kind, action.value)
        } else {
          await this.credentialStorage.delete(connectionId, action.kind)
        }
      }

      return applied
    } catch (error) {
      await this.rollbackCredentialActions(connectionId, applied)
      throw error
    }
  }

  private async rollbackCredentialActions(
    connectionId: string,
    applied: readonly AppliedCredentialAction[]
  ): Promise<void> {
    for (const action of [...applied].reverse()) {
      try {
        if (action.previous === undefined) {
          await this.credentialStorage.delete(connectionId, action.kind)
        } else {
          await this.credentialStorage.set(connectionId, action.kind, action.previous)
        }
      } catch {
        // Preserve the original storage error.
      }
    }
  }
}
