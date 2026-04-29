import { existsSync } from 'fs'
import { app, BrowserWindow, dialog, type MessageBoxOptions } from 'electron'
import { autoUpdater, type AppUpdater, type ProgressInfo, type UpdateDownloadedEvent, type UpdateInfo } from 'electron-updater'
import { join } from 'path'
import { type IUpdateProgress, type IUpdateState } from '@shared/types/update'

type UpdateStateListener = (state: IUpdateState) => void
type UpdateCheckReason = 'startup' | 'manual'

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Update operation failed'
}

function toProgress(info: ProgressInfo): IUpdateProgress {
  return {
    percent: Math.max(0, Math.min(100, info.percent ?? 0)),
    transferred: info.transferred ?? 0,
    total: info.total ?? 0,
    bytesPerSecond: info.bytesPerSecond
  }
}

function hasPackagedUpdateConfig(): boolean {
  return existsSync(join(process.resourcesPath, 'app-update.yml'))
}

export class UpdateService {
  private state: IUpdateState
  private readonly listeners = new Set<UpdateStateListener>()
  private startupCheckStarted = false
  private downloadPromptOpen = false
  private installPromptOpen = false

  constructor(
    private readonly getWindow: () => BrowserWindow | null,
    private readonly updater: AppUpdater = autoUpdater
  ) {
    this.state = {
      status: 'idle',
      currentVersion: app.getVersion(),
      message: 'Updates are idle.'
    }

    this.updater.autoDownload = false
    this.updater.autoInstallOnAppQuit = false
    this.updater.allowPrerelease = false
    this.registerUpdaterEvents()
  }

  getState(): IUpdateState {
    return this.state
  }

  onStateChange(listener: UpdateStateListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  startLaunchCheck(delayMs = 1500): void {
    if (this.startupCheckStarted) {
      return
    }

    this.startupCheckStarted = true
    setTimeout(() => {
      void this.checkForUpdates('startup')
    }, delayMs)
  }

  async checkForUpdates(_reason: UpdateCheckReason = 'manual'): Promise<IUpdateState> {
    if (!app.isPackaged) {
      this.setState({
        status: 'unavailable',
        currentVersion: app.getVersion(),
        message: 'Updates are unavailable in development mode.',
        checkedAt: Date.now()
      })
      return this.state
    }

    if (!hasPackagedUpdateConfig()) {
      this.setState({
        status: 'unavailable',
        currentVersion: app.getVersion(),
        message: 'Updates are unavailable for this local packaged build.',
        checkedAt: Date.now()
      })
      return this.state
    }

    if (this.state.status === 'checking' || this.state.status === 'downloading') {
      return this.state
    }

    this.setState({
      status: 'checking',
      currentVersion: app.getVersion(),
      availableVersion: this.state.availableVersion,
      message: 'Checking for updates...',
      checkedAt: Date.now()
    })

    try {
      const result = await this.updater.checkForUpdates()
      if (!result) {
        this.setState({
          status: 'unavailable',
          currentVersion: app.getVersion(),
          message: 'Updates are unavailable for this build.',
          checkedAt: Date.now()
        })
      }
    } catch (error) {
      this.setError(error)
    }

    return this.state
  }

  async installDownloadedUpdate(): Promise<IUpdateState> {
    if (this.state.status !== 'downloaded') {
      return this.state
    }

    await this.confirmRestartAndInstall()
    return this.state
  }

  private registerUpdaterEvents(): void {
    this.updater.on('checking-for-update', () => {
      this.setState({
        status: 'checking',
        currentVersion: app.getVersion(),
        message: 'Checking for updates...',
        checkedAt: Date.now()
      })
    })

    this.updater.on('update-available', (info: UpdateInfo) => {
      this.setState({
        status: 'available',
        currentVersion: app.getVersion(),
        availableVersion: info.version,
        message: `Update ${info.version} is available.`,
        checkedAt: Date.now()
      })

      void this.confirmDownload(info)
    })

    this.updater.on('update-not-available', (info: UpdateInfo) => {
      this.setState({
        status: 'not-available',
        currentVersion: app.getVersion(),
        availableVersion: info.version,
        message: 'zTerm is up to date.',
        checkedAt: Date.now()
      })
    })

    this.updater.on('download-progress', (info: ProgressInfo) => {
      this.setState({
        status: 'downloading',
        currentVersion: app.getVersion(),
        availableVersion: this.state.availableVersion,
        progress: toProgress(info),
        message: `Downloading update ${Math.round(info.percent ?? 0)}%...`,
        checkedAt: this.state.checkedAt
      })
    })

    this.updater.on('update-downloaded', (event: UpdateDownloadedEvent) => {
      this.setState({
        status: 'downloaded',
        currentVersion: app.getVersion(),
        availableVersion: event.version,
        message: `Update ${event.version} is ready to install.`,
        checkedAt: this.state.checkedAt
      })

      void this.confirmRestartAndInstall()
    })

    this.updater.on('update-cancelled', (info: UpdateInfo) => {
      this.setState({
        status: 'available',
        currentVersion: app.getVersion(),
        availableVersion: info.version,
        message: `Update ${info.version} download was canceled.`,
        checkedAt: this.state.checkedAt
      })
    })

    this.updater.on('error', (error: Error) => {
      this.setError(error)
    })
  }

  private async confirmDownload(info: UpdateInfo): Promise<void> {
    if (this.downloadPromptOpen || this.state.status === 'downloading' || this.state.status === 'downloaded') {
      return
    }

    this.downloadPromptOpen = true

    try {
      const result = await this.showMessageBox({
        type: 'info',
        buttons: ['Download', 'Later'],
        defaultId: 0,
        cancelId: 1,
        title: 'Update Available',
        message: `zTerm ${info.version} is available.`,
        detail: 'Download the update now? zTerm will ask again before restarting to install it.'
      })

      if (result.response !== 0) {
        this.setState({
          status: 'available',
          currentVersion: app.getVersion(),
          availableVersion: info.version,
          message: `Update ${info.version} is available. Download postponed.`,
          checkedAt: this.state.checkedAt
        })
        return
      }

      this.setState({
        status: 'downloading',
        currentVersion: app.getVersion(),
        availableVersion: info.version,
        message: `Downloading update ${info.version}...`,
        checkedAt: this.state.checkedAt
      })

      await this.updater.downloadUpdate()
    } catch (error) {
      this.setError(error)
    } finally {
      this.downloadPromptOpen = false
    }
  }

  private async confirmRestartAndInstall(): Promise<void> {
    if (this.installPromptOpen || this.state.status !== 'downloaded') {
      return
    }

    this.installPromptOpen = true

    try {
      const version = this.state.availableVersion
      const result = await this.showMessageBox({
        type: 'info',
        buttons: ['Restart and Install', 'Later'],
        defaultId: 0,
        cancelId: 1,
        title: 'Update Ready',
        message: version ? `zTerm ${version} is ready to install.` : 'A zTerm update is ready to install.',
        detail: 'Restart zTerm now to install the update? Active terminal sessions will close.'
      })

      if (result.response === 0) {
        this.updater.quitAndInstall(false, true)
        return
      }

      this.setState({
        ...this.state,
        message: version
          ? `Update ${version} is ready. Restart to install when you are ready.`
          : 'Update is ready. Restart to install when you are ready.'
      })
    } finally {
      this.installPromptOpen = false
    }
  }

  private async showMessageBox(options: MessageBoxOptions) {
    const window = this.getWindow()
    if (window && !window.isDestroyed()) {
      return dialog.showMessageBox(window, options)
    }

    return dialog.showMessageBox(options)
  }

  private setError(error: unknown): void {
    const message = getErrorMessage(error)
    this.setState({
      status: 'error',
      currentVersion: app.getVersion(),
      availableVersion: this.state.availableVersion,
      message,
      error: message,
      checkedAt: this.state.checkedAt
    })
  }

  private setState(state: IUpdateState): void {
    this.state = state
    this.listeners.forEach((listener) => listener(this.state))
  }
}
