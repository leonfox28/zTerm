import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { type IConnectionUpsertInput } from '@shared/types/store'
import { ConnectionService } from '../services/connection.service'

export function registerConnectionIpc(connectionService: ConnectionService) {
  ipcMain.handle(IPC_CHANNELS.CONNECTIONS_LIST, () => {
    return connectionService.listConnections()
  })

  ipcMain.handle(IPC_CHANNELS.CONNECTIONS_SAVE, (_event, payload: IConnectionUpsertInput) => {
    return connectionService.saveConnection(payload)
  })

  ipcMain.handle(IPC_CHANNELS.CONNECTIONS_DELETE, (_event, id: string) => {
    connectionService.deleteConnection(id)
  })
}
