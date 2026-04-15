import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { SftpService } from '../services/sftp.service'

export function registerSftpIpc(sftpService: SftpService) {
  ipcMain.handle(IPC_CHANNELS.SFTP_GET_INITIAL_DIRECTORY, (_event, connectionId: string) => {
    return sftpService.getInitialDirectory(connectionId)
  })

  ipcMain.handle(IPC_CHANNELS.SFTP_LIST_DIRECTORY, (_event, payload: { connectionId: string; path: string }) => {
    return sftpService.listDirectory(payload.connectionId, payload.path)
  })
}
