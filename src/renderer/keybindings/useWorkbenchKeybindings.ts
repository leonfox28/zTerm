import { useEffect } from 'react'
import { useWorkbenchStore } from '../stores/workbench.store'
import { useTerminalStore } from '../stores/terminal.store'
import { workbenchCommands } from '../commands/workbench.commands'

function normalizeKey(event: KeyboardEvent): string {
  if (event.code === 'Backslash') {
    return 'backslash'
  }

  if (event.key === ' ') {
    return 'space'
  }

  return event.key.toLowerCase()
}

function normalizeKeybinding(event: KeyboardEvent): string {
  const parts: string[] = []

  if (event.ctrlKey) {
    parts.push('ctrl')
  }
  if (event.metaKey) {
    parts.push('meta')
  }
  if (event.altKey) {
    parts.push('alt')
  }
  if (event.shiftKey) {
    parts.push('shift')
  }

  parts.push(normalizeKey(event))
  return parts.join('+')
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  if (target.closest('[data-zterm-terminal-surface="true"]')) {
    return false
  }

  if (target.isContentEditable) {
    return true
  }

  return target.closest('input, textarea, select, [contenteditable="true"]') !== null
}

function isTerminalElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return target.closest('[data-zterm-terminal-surface="true"]') !== null
}

const keybindingRegistry = new Map(workbenchCommands.map((command) => [command.defaultKeybinding, command]))

export function useWorkbenchKeybindings() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return
      }

      const normalized = normalizeKeybinding(event)
      const command = keybindingRegistry.get(normalized)
      if (!command) {
        return
      }

      const workbenchState = useWorkbenchStore.getState()
      const terminalState = useTerminalStore.getState()
      const context = {
        activeMainView: workbenchState.activeMainView,
        activeTabId: terminalState.activeTabId,
        terminalFocused: isTerminalElement(event.target),
        textInputFocused: isEditableElement(event.target)
      }

      if (command.scope.mainView && context.activeMainView !== command.scope.mainView) {
        return
      }

      if (command.scope.requiresActiveTerminalTab && context.activeTabId === null) {
        return
      }

      if (context.textInputFocused && !command.scope.allowWhenTextInputFocused) {
        return
      }

      if (context.terminalFocused && !command.scope.allowWhenTerminalFocused) {
        return
      }

      event.preventDefault()
      void command.execute()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
