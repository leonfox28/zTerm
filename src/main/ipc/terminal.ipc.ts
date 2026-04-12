import { ipcMain, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { IShellOptions } from '@shared/types/terminal'
import { ITerminalService } from '@shared/types/services'

export function registerTerminalIpc(
  terminalService: ITerminalService,
  getWindow: () => BrowserWindow | null
) {
  ipcMain.handle(IPC_CHANNELS.TERMINAL_CREATE, (_event, options: IShellOptions) => {
    const win = getWindow()
    const id = terminalService.spawn(
      options,
      (termId, data) => {
        if (!win?.isDestroyed()) {
          win?.webContents.send(IPC_CHANNELS.TERMINAL_DATA, { id: termId, data })
        }
      },
      (termId, code) => {
        if (!win?.isDestroyed()) {
          win?.webContents.send(IPC_CHANNELS.TERMINAL_EXIT, { id: termId, code })
        }
      }
    )
    return id
  })

  ipcMain.on(IPC_CHANNELS.TERMINAL_WRITE, (_event, { id, data }: { id: number; data: string }) => {
    terminalService.write(id, data)
  })

  ipcMain.on(
    IPC_CHANNELS.TERMINAL_RESIZE,
    (_event, { id, cols, rows }: { id: number; cols: number; rows: number }) => {
      terminalService.resize(id, cols, rows)
    }
  )

  ipcMain.on(IPC_CHANNELS.TERMINAL_KILL, (_event, { id }: { id: number }) => {
    terminalService.kill(id)
  })
}
