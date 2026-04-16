import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { LocalFileTreeService } from '../services/local-file-tree.service'

export function registerLocalFileTreeIpc(localFileTreeService: LocalFileTreeService) {
  ipcMain.handle(
    IPC_CHANNELS.LOCAL_FILE_TREE_GET_INITIAL_DIRECTORY,
    (_event, payload?: { path?: string }) => {
      return localFileTreeService.getInitialDirectory(payload?.path)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.LOCAL_FILE_TREE_LIST_DIRECTORY,
    (_event, payload: { path: string }) => {
      return localFileTreeService.listDirectory(payload.path)
    }
  )
}
