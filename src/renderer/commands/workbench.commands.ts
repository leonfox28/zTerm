import { type MainViewId, useWorkbenchStore } from '../stores/workbench.store'
import { type SplitDirection, useTerminalStore } from '../stores/terminal.store'

export const CREATE_TERMINAL_EVENT = 'zterm:new-terminal'

export type WorkbenchCommandId =
  | 'workbench.openSettings'
  | 'workbench.returnToTerminal'
  | 'workbench.openSshConnection'
  | 'terminal.new'
  | 'terminal.splitVertical'
  | 'terminal.splitHorizontal'
  | 'terminal.closeActiveTab'
  | 'terminal.focusNextTab'
  | 'terminal.focusPreviousTab'

interface WorkbenchCommandScope {
  mainView?: MainViewId
  requiresActiveTerminalTab?: boolean
  allowWhenTerminalFocused?: boolean
  allowWhenTextInputFocused?: boolean
}

export interface WorkbenchCommandContext {
  activeMainView: MainViewId
  activeTabId: number | null
  terminalFocused: boolean
  textInputFocused: boolean
}

export interface WorkbenchCommandDefinition {
  id: WorkbenchCommandId
  title: string
  defaultKeybinding: string
  scope: WorkbenchCommandScope
  execute: () => void
}

function dispatchNewTerminalEvent() {
  window.dispatchEvent(new CustomEvent(CREATE_TERMINAL_EVENT))
}

function splitActivePane(direction: SplitDirection) {
  const { activeTabId, splitActivePane } = useTerminalStore.getState()
  if (activeTabId === null) {
    return
  }

  splitActivePane(activeTabId, direction)
}

export function closeActiveTabCommand() {
  const { activeTabId, removeTab } = useTerminalStore.getState()
  if (activeTabId === null) {
    return
  }

  removeTab(activeTabId)
}

function focusAdjacentTab(step: 1 | -1) {
  const { tabs, activeTabId, setActiveTab } = useTerminalStore.getState()
  if (tabs.length <= 1 || activeTabId === null) {
    return
  }

  const activeIndex = tabs.findIndex((tab) => tab.id === activeTabId)
  if (activeIndex === -1) {
    return
  }

  const nextIndex = (activeIndex + step + tabs.length) % tabs.length
  setActiveTab(tabs[nextIndex].id)
}

export function splitActiveTerminalVerticallyCommand() {
  splitActivePane('vertical')
}

export function splitActiveTerminalHorizontallyCommand() {
  splitActivePane('horizontal')
}

export function focusNextTerminalTabCommand() {
  focusAdjacentTab(1)
}

export function focusPreviousTerminalTabCommand() {
  focusAdjacentTab(-1)
}

export function createNewTerminalCommand() {
  useWorkbenchStore.getState().openTerminalView()
  dispatchNewTerminalEvent()
}

export function openSettingsCommand() {
  useWorkbenchStore.getState().openSettingsView()
}

export function returnToTerminalCommand() {
  useWorkbenchStore.getState().openTerminalView()
}

export function openSshConnectionCommand(connectionId?: string) {
  useWorkbenchStore.getState().openConnectionDialog(connectionId)
}

export const workbenchCommands: WorkbenchCommandDefinition[] = [
  {
    id: 'terminal.new',
    title: 'New Terminal',
    defaultKeybinding: 'meta+t',
    scope: {
      mainView: 'terminal',
      allowWhenTerminalFocused: true
    },
    execute: createNewTerminalCommand
  },
  {
    id: 'terminal.closeActiveTab',
    title: 'Close Active Terminal Tab',
    defaultKeybinding: 'meta+w',
    scope: {
      mainView: 'terminal',
      requiresActiveTerminalTab: true,
      allowWhenTerminalFocused: true
    },
    execute: closeActiveTabCommand
  },
  {
    id: 'terminal.splitVertical',
    title: 'Split Terminal Vertically',
    defaultKeybinding: 'meta+backslash',
    scope: {
      mainView: 'terminal',
      requiresActiveTerminalTab: true,
      allowWhenTerminalFocused: true
    },
    execute: splitActiveTerminalVerticallyCommand
  },
  {
    id: 'terminal.splitHorizontal',
    title: 'Split Terminal Horizontally',
    defaultKeybinding: 'meta+shift+backslash',
    scope: {
      mainView: 'terminal',
      requiresActiveTerminalTab: true,
      allowWhenTerminalFocused: true
    },
    execute: splitActiveTerminalHorizontallyCommand
  },
  {
    id: 'terminal.focusNextTab',
    title: 'Focus Next Terminal Tab',
    defaultKeybinding: 'meta+alt+arrowright',
    scope: {
      mainView: 'terminal',
      requiresActiveTerminalTab: true,
      allowWhenTerminalFocused: true
    },
    execute: focusNextTerminalTabCommand
  },
  {
    id: 'terminal.focusPreviousTab',
    title: 'Focus Previous Terminal Tab',
    defaultKeybinding: 'meta+alt+arrowleft',
    scope: {
      mainView: 'terminal',
      requiresActiveTerminalTab: true,
      allowWhenTerminalFocused: true
    },
    execute: focusPreviousTerminalTabCommand
  },
  {
    id: 'workbench.openSettings',
    title: 'Open Settings',
    defaultKeybinding: 'meta+,',
    scope: {
      allowWhenTerminalFocused: true
    },
    execute: openSettingsCommand
  },
  {
    id: 'workbench.returnToTerminal',
    title: 'Return to Terminal Workspace',
    defaultKeybinding: 'escape',
    scope: {
      mainView: 'settings',
      allowWhenTextInputFocused: true
    },
    execute: returnToTerminalCommand
  }
]
