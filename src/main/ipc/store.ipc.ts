import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import {
  PUBLIC_STORE_KEYS,
  type IPublicStoreSchema,
  type IStoreSchema,
  type PublicStoreKey
} from '@shared/types/store'
import { StoreService } from '../services/store.service'

function isPublicStoreKey(key: unknown): key is PublicStoreKey {
  return typeof key === 'string' && (PUBLIC_STORE_KEYS as readonly string[]).includes(key)
}

function assertPublicStoreKey(key: unknown): PublicStoreKey {
  if (!isPublicStoreKey(key)) {
    throw new Error('Store key is not accessible from the renderer')
  }

  return key
}

function toPublicStore(schema: IStoreSchema): IPublicStoreSchema {
  return {
    settings: schema.settings,
    connectionFolders: schema.connectionFolders
  }
}

export function registerStoreIpc(storeService: StoreService) {
  ipcMain.handle(IPC_CHANNELS.STORE_GET, (_event, key: keyof IStoreSchema) => {
    const publicKey = assertPublicStoreKey(key)
    return storeService.get(publicKey)
  })

  ipcMain.on(
    IPC_CHANNELS.STORE_SET,
    (_event, { key, value }: { key: keyof IStoreSchema; value: IStoreSchema[keyof IStoreSchema] }) => {
      const publicKey = assertPublicStoreKey(key)
      storeService.set(publicKey, value as IStoreSchema[typeof publicKey])
    }
  )

  ipcMain.handle(IPC_CHANNELS.STORE_GET_ALL, () => {
    return toPublicStore(storeService.getAll())
  })
}
