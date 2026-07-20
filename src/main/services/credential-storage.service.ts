import { AsyncEntry } from '@napi-rs/keyring'
import { app, safeStorage } from 'electron'
import { createDecipheriv } from 'crypto'
import { existsSync, readFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { type IConnectionItem } from '@shared/types/store'

export type CredentialKind = 'password' | 'passphrase'

type LegacyCredentialFields = {
  encryptedPassword?: string
  encryptedPassphrase?: string
}

type ConnectionWithLegacyCredentials = IConnectionItem & LegacyCredentialFields

type AppliedMigration = {
  connectionId: string
  kind: CredentialKind
  previous: string | undefined
}

const CREDENTIAL_SERVICE = 'com.leonfox28.zterm.ssh'
const LEGACY_DEK_SERVICE = 'zTerm'
const LEGACY_DEK_ACCOUNT = 'credential-dek'
const CURRENT_LEGACY_PREFIX = 'zt2.'
const FILE_LEGACY_PREFIX = 'zt1.'
const LEGACY_DEK_FILE = 'credential-dek.enc'
const LEGACY_MASTER_KEY_FILE = 'credential-master.key'

function accountName(connectionId: string, kind: CredentialKind): string {
  return `${connectionId}:${kind}`
}

function legacyField(kind: CredentialKind): keyof LegacyCredentialFields {
  return kind === 'password' ? 'encryptedPassword' : 'encryptedPassphrase'
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown credential storage error'
}

function validateDek(value: Buffer): Buffer {
  if (value.length !== 32) {
    throw new Error('Legacy credential encryption key has an invalid length')
  }

  return value
}

function decryptAesGcm(dek: Buffer, payloadBase64: string): string {
  const packed = Buffer.from(payloadBase64, 'base64')
  if (packed.length < 28) {
    throw new Error('Legacy credential ciphertext is invalid')
  }

  const iv = packed.subarray(0, 12)
  const tag = packed.subarray(12, 28)
  const data = packed.subarray(28)
  const decipher = createDecipheriv('aes-256-gcm', dek, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

export class CredentialStorageService {
  private legacyDekPromise: Promise<Buffer> | null = null

  async get(connectionId: string, kind: CredentialKind): Promise<string | undefined> {
    try {
      const value = await this.entry(connectionId, kind).getPassword()
      return value ?? undefined
    } catch (error) {
      throw new Error(`Failed to read ${kind} from the system credential store: ${errorMessage(error)}`)
    }
  }

  async set(connectionId: string, kind: CredentialKind, value: string): Promise<void> {
    try {
      await this.entry(connectionId, kind).setPassword(value)
    } catch (error) {
      throw new Error(`Failed to save ${kind} in the system credential store: ${errorMessage(error)}`)
    }
  }

  async delete(connectionId: string, kind: CredentialKind): Promise<void> {
    try {
      await this.entry(connectionId, kind).deleteCredential()
    } catch (error) {
      throw new Error(`Failed to delete ${kind} from the system credential store: ${errorMessage(error)}`)
    }
  }

  hasLegacyCredentials(connections: readonly IConnectionItem[]): boolean {
    return connections.some((connection) => {
      const legacy = connection as ConnectionWithLegacyCredentials
      return Boolean(legacy.encryptedPassword || legacy.encryptedPassphrase)
    })
  }

  async migrateLegacyCredentials(connections: readonly IConnectionItem[]): Promise<IConnectionItem[]> {
    if (!this.hasLegacyCredentials(connections)) {
      return [...connections]
    }

    const applied: AppliedMigration[] = []

    try {
      const migrated: IConnectionItem[] = []

      for (const connection of connections) {
        const legacy = connection as ConnectionWithLegacyCredentials
        const next = { ...connection } as ConnectionWithLegacyCredentials
        next.hasSavedPassword = false
        next.hasSavedPassphrase = false

        for (const kind of ['password', 'passphrase'] as const) {
          const isActiveKind =
            connection.authType === undefined ||
            (connection.authType === 'password' && kind === 'password') ||
            (connection.authType === 'privateKey' && kind === 'passphrase')
          if (!isActiveKind) {
            continue
          }

          const field = legacyField(kind)
          const encrypted = legacy[field]
          if (!encrypted) {
            continue
          }

          const plaintext = await this.decryptLegacyCredential(encrypted)
          const previous = await this.get(connection.id, kind)

          if (previous !== plaintext) {
            applied.push({
              connectionId: connection.id,
              kind,
              previous
            })
            await this.set(connection.id, kind, plaintext)
            const verified = await this.get(connection.id, kind)
            if (verified !== plaintext) {
              throw new Error(`Failed to verify migrated ${kind} in the system credential store`)
            }
          }

          if (kind === 'password') {
            next.hasSavedPassword = true
          } else {
            next.hasSavedPassphrase = true
          }
        }

        delete next.encryptedPassword
        delete next.encryptedPassphrase
        migrated.push(next)
      }

      return migrated
    } catch (error) {
      await this.rollbackMigration(applied)
      throw error
    }
  }

  async cleanupLegacyStorage(): Promise<void> {
    try {
      await new AsyncEntry(LEGACY_DEK_SERVICE, LEGACY_DEK_ACCOUNT).deleteCredential()
    } catch {
      // Retry on the next migration attempt; credentials have already been copied.
    }

    for (const name of [LEGACY_DEK_FILE, LEGACY_MASTER_KEY_FILE]) {
      const path = join(app.getPath('userData'), name)
      if (!existsSync(path)) {
        continue
      }

      try {
        unlinkSync(path)
      } catch {
        // Best-effort cleanup of obsolete encrypted key files.
      }
    }
  }

  private entry(connectionId: string, kind: CredentialKind): AsyncEntry {
    return new AsyncEntry(CREDENTIAL_SERVICE, accountName(connectionId, kind))
  }

  private async decryptLegacyCredential(encrypted: string): Promise<string> {
    if (encrypted.startsWith(CURRENT_LEGACY_PREFIX)) {
      const dek = await this.loadLegacyDek()
      return decryptAesGcm(dek, encrypted.slice(CURRENT_LEGACY_PREFIX.length))
    }

    if (encrypted.startsWith(FILE_LEGACY_PREFIX)) {
      const path = join(app.getPath('userData'), LEGACY_MASTER_KEY_FILE)
      if (!existsSync(path)) {
        throw new Error('Legacy local credential key is unavailable')
      }

      const dek = validateDek(readFileSync(path))
      return decryptAesGcm(dek, encrypted.slice(FILE_LEGACY_PREFIX.length))
    }

    try {
      return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
    } catch (error) {
      throw new Error(`Failed to decrypt legacy credential: ${errorMessage(error)}`)
    }
  }

  private loadLegacyDek(): Promise<Buffer> {
    if (this.legacyDekPromise) {
      return this.legacyDekPromise
    }

    this.legacyDekPromise = (async () => {
      const keyringValue = await new AsyncEntry(LEGACY_DEK_SERVICE, LEGACY_DEK_ACCOUNT).getPassword()
      if (keyringValue) {
        return validateDek(Buffer.from(keyringValue, 'base64'))
      }

      const wrappedPath = join(app.getPath('userData'), LEGACY_DEK_FILE)
      if (existsSync(wrappedPath)) {
        try {
          const unwrapped = safeStorage.decryptString(readFileSync(wrappedPath))
          return validateDek(Buffer.from(unwrapped, 'base64'))
        } catch (error) {
          throw new Error(`Failed to unwrap legacy credential key: ${errorMessage(error)}`)
        }
      }

      const localKeyPath = join(app.getPath('userData'), LEGACY_MASTER_KEY_FILE)
      if (existsSync(localKeyPath)) {
        return validateDek(readFileSync(localKeyPath))
      }

      throw new Error('Legacy credential encryption key is unavailable')
    })()

    return this.legacyDekPromise
  }

  private async rollbackMigration(applied: readonly AppliedMigration[]): Promise<void> {
    for (const mutation of [...applied].reverse()) {
      try {
        if (mutation.previous === undefined) {
          await this.delete(mutation.connectionId, mutation.kind)
        } else {
          await this.set(mutation.connectionId, mutation.kind, mutation.previous)
        }
      } catch {
        // Preserve the original migration error.
      }
    }
  }
}
