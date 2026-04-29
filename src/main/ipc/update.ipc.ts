import { BrowserWindow, ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { UpdateService } from '../services/update.service'

export function registerUpdateIpc(updateService: UpdateService, getWindow: () => BrowserWindow | null) {
  ipcMain.handle(IPC_CHANNELS.UPDATE_CHECK_FOR_UPDATES, () => {
    return updateService.checkForUpdates('manual')
  })

  ipcMain.handle(IPC_CHANNELS.UPDATE_GET_STATE, () => {
    return updateService.getState()
  })

  ipcMain.handle(IPC_CHANNELS.UPDATE_INSTALL_DOWNLOADED, () => {
    return updateService.installDownloadedUpdate()
  })

  updateService.onStateChange((state) => {
    const window = getWindow()
    if (!window || window.isDestroyed()) {
      return
    }

    window.webContents.send(IPC_CHANNELS.UPDATE_STATE_CHANGED, state)
  })
}
