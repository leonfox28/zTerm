import { dialog } from 'electron'
import { basename } from 'path'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { type RemoteFileKind } from '@shared/types/sftp'
import { SftpService } from '../services/sftp.service'
import { ipcMain } from 'electron'

export function registerSftpIpc(sftpService: SftpService) {
  ipcMain.handle(IPC_CHANNELS.SFTP_GET_INITIAL_DIRECTORY, (_event, connectionId: string) => {
    return sftpService.getInitialDirectory(connectionId)
  })

  ipcMain.handle(IPC_CHANNELS.SFTP_LIST_DIRECTORY, (_event, payload: { connectionId: string; path: string }) => {
    return sftpService.listDirectory(payload.connectionId, payload.path)
  })

  ipcMain.handle(
    IPC_CHANNELS.SFTP_UPLOAD_FILE,
    async (_event, payload: { connectionId: string; destinationPath: string }) => {
      const selection = await dialog.showOpenDialog({
        properties: ['openFile']
      })

      if (selection.canceled || selection.filePaths.length === 0) {
        return { canceled: true }
      }

      await sftpService.uploadFile(payload.connectionId, selection.filePaths[0], payload.destinationPath)
      return { canceled: false }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SFTP_DOWNLOAD_ENTRY,
    async (_event, payload: { connectionId: string; entryPath: string; kind: RemoteFileKind }) => {
      if (payload.kind === 'directory') {
        const selection = await dialog.showOpenDialog({
          properties: ['openDirectory', 'createDirectory']
        })

        if (selection.canceled || selection.filePaths.length === 0) {
          return { canceled: true }
        }

        await sftpService.downloadEntry(payload.connectionId, payload.entryPath, payload.kind, selection.filePaths[0])
        return { canceled: false }
      }

      const selection = await dialog.showSaveDialog({
        defaultPath: basename(payload.entryPath)
      })

      if (selection.canceled || !selection.filePath) {
        return { canceled: true }
      }

      await sftpService.downloadEntry(payload.connectionId, payload.entryPath, payload.kind, selection.filePath)
      return { canceled: false }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SFTP_GET_ENTRY_DETAILS,
    (_event, payload: { connectionId: string; entryPath: string }) => {
      return sftpService.getEntryDetails(payload.connectionId, payload.entryPath)
    }
  )
}
