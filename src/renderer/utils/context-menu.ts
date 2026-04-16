import { useEffect } from 'react'
import {
  type ContextMenuItem,
  type ContextMenuRequest,
  type ContextMenuSelection
} from '@shared/types/context-menu'

interface NativeMenuActionItem extends ContextMenuItem {
  onSelect?: () => void | Promise<void>
}

interface NativeMenuRequest {
  anchor: ContextMenuRequest['anchor']
  items: NativeMenuActionItem[]
}

const menuHandlers = new Map<string, Map<string, () => void | Promise<void>>>()
let menuCounter = 0
let initialized = false

function nextMenuId() {
  menuCounter += 1
  return `context-menu-${menuCounter}`
}

function toSerializableItems(items: NativeMenuActionItem[]): ContextMenuItem[] {
  return items.map(({ onSelect: _onSelect, submenu, ...item }) => ({
    ...item,
    submenu: submenu ? toSerializableItems(submenu as NativeMenuActionItem[]) : undefined
  }))
}

function collectHandlers(items: NativeMenuActionItem[], handlers: Map<string, () => void | Promise<void>>) {
  items.forEach((item) => {
    if (item.onSelect) {
      handlers.set(item.itemId, item.onSelect)
    }

    if (item.submenu) {
      collectHandlers(item.submenu as NativeMenuActionItem[], handlers)
    }
  })
}

async function runSelection(selection: ContextMenuSelection) {
  const handlers = menuHandlers.get(selection.menuId)
  const handler = handlers?.get(selection.itemId)

  if (!handler) {
    return
  }

  try {
    await handler()
  } finally {
    menuHandlers.delete(selection.menuId)
  }
}

function cleanupMenu(menuId: string) {
  menuHandlers.delete(menuId)
}

export function initializeNativeContextMenu() {
  if (initialized) {
    return
  }

  window.contextMenuApi.onItemSelected((selection: ContextMenuSelection) => {
    void runSelection(selection)
  })
  window.contextMenuApi.onMenuClosed(({ menuId }: { menuId: string }) => {
    cleanupMenu(menuId)
  })
  initialized = true
}

export function useNativeContextMenu() {
  useEffect(() => {
    initializeNativeContextMenu()
  }, [])
}

export async function showNativeContextMenu({ anchor, items }: NativeMenuRequest) {
  const menuId = nextMenuId()
  const handlers = new Map<string, () => void | Promise<void>>()
  collectHandlers(items, handlers)
  menuHandlers.set(menuId, handlers)

  await window.contextMenuApi.show({
    menuId,
    anchor,
    items: toSerializableItems(items)
  })
}

export type { NativeMenuActionItem }
