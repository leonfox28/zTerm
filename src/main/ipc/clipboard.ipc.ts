import { clipboard, ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'

export function registerClipboardIpc() {
  ipcMain.handle(IPC_CHANNELS.CLIPBOARD_READ_TEXT, () => {
    return clipboard.readText()
  })

  ipcMain.handle(IPC_CHANNELS.CLIPBOARD_WRITE_TEXT, (_event, text: string) => {
    clipboard.writeText(text)
  })
}
