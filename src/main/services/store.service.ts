import ElectronStoreModule from 'electron-store'
import { IStoreSchema, DEFAULT_SETTINGS } from '@shared/types/store'

const Store = (
  ElectronStoreModule as typeof ElectronStoreModule & { default?: typeof ElectronStoreModule }
).default ?? ElectronStoreModule

const store = new Store<IStoreSchema>({
  defaults: {
    settings: DEFAULT_SETTINGS,
    connections: [],
    connectionFolders: []
  }
})

export class StoreService {
  get<K extends keyof IStoreSchema>(key: K): IStoreSchema[K] {
    return store.get(key)
  }

  set<K extends keyof IStoreSchema>(key: K, value: IStoreSchema[K]): void {
    store.set(key, value)
  }

  getAll(): IStoreSchema {
    return store.store
  }
}
