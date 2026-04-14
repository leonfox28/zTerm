import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { PtyService } from './services/pty.service'
import { StoreService } from './services/store.service'
import { ConnectionService } from './services/connection.service'
import { SshService } from './services/ssh.service'
import { TerminalManagerService } from './services/terminal-manager.service'
import { registerTerminalIpc } from './ipc/terminal.ipc'
import { registerStoreIpc } from './ipc/store.ipc'
import { registerConnectionIpc } from './ipc/connection.ipc'

let mainWindow: BrowserWindow | null = null
const ptyService = new PtyService()
const storeService = new StoreService()
const connectionService = new ConnectionService(storeService)
const sshService = new SshService(connectionService)
const terminalManagerService = new TerminalManagerService(ptyService, sshService)

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  registerTerminalIpc(terminalManagerService, () => mainWindow)
  registerStoreIpc(storeService)
  registerConnectionIpc(connectionService)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  terminalManagerService.dispose()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
