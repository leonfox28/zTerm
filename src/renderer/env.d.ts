import { ClipboardApi, ConnectionsApi, ContextMenuApi, LocalFileTreeApi, SftpApi, TerminalApi, StoreApi, UpdateApi } from '../../preload/index'

declare module '*.css' {
  const content: Record<string, string>
  export default content
}

declare global {
  interface Window {
    terminalApi: TerminalApi
    storeApi: StoreApi
    connectionsApi: ConnectionsApi
    sftpApi: SftpApi
    localFileTreeApi: LocalFileTreeApi
    clipboardApi: ClipboardApi
    contextMenuApi: ContextMenuApi
    updateApi: UpdateApi
  }
}
