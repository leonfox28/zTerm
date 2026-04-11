import { TerminalApi } from '../../preload/index'

declare module '*.css' {
  const content: Record<string, string>
  export default content
}

declare global {
  interface Window {
    terminalApi: TerminalApi
  }
}
