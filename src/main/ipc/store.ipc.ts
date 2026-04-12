import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { IStoreSchema } from '@shared/types/store'
import { StoreService } from '../services/store.service'

export function registerStoreIpc(storeService: StoreService) {
  ipcMain.handle(IPC_CHANNELS.STORE_GET, (_event, key: keyof IStoreSchema) => {
    return storeService.get(key)
  })

  ipcMain.on(
    IPC_CHANNELS.STORE_SET,
    (_event, { key, value }: { key: keyof IStoreSchema; value: IStoreSchema[keyof IStoreSchema] }) => {
      storeService.set(key, value as never)
    }
  )

  ipcMain.handle(IPC_CHANNELS.STORE_GET_ALL, () => {
    return storeService.getAll()
  })
}
