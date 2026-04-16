import { BrowserWindow, Menu, MenuItem, ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import {
  type ContextMenuItem,
  type ContextMenuRequest,
  type ContextMenuSelection
} from '@shared/types/context-menu'

function createMenu(
  window: BrowserWindow,
  menuId: string,
  items: ContextMenuItem[]
): Menu {
  const menu = new Menu()

  items.forEach((item) => {
    if (item.type === 'separator') {
      menu.append(new MenuItem({ type: 'separator' }))
      return
    }

    menu.append(
      new MenuItem({
        type: item.type,
        label: item.label,
        enabled: item.enabled ?? true,
        checked: item.checked,
        accelerator: item.accelerator,
        submenu: item.submenu ? createMenu(window, menuId, item.submenu) : undefined,
        click: () => {
          const selection: ContextMenuSelection = {
            menuId,
            itemId: item.itemId
          }
          if (!window.isDestroyed()) {
            window.webContents.send(IPC_CHANNELS.CONTEXT_MENU_ITEM_SELECTED, selection)
          }
        }
      })
    )
  })

  return menu
}

export function registerContextMenuIpc(getWindow: () => BrowserWindow | null) {
  ipcMain.handle(IPC_CHANNELS.CONTEXT_MENU_SHOW, async (_event, request: ContextMenuRequest) => {
    const window = getWindow()
    if (!window || window.isDestroyed()) {
      return
    }

    const menu = createMenu(window, request.menuId, request.items)
    menu.popup({
      window,
      x: request.anchor.x,
      y: request.anchor.y,
      callback: () => {
        if (!window.isDestroyed()) {
          window.webContents.send(IPC_CHANNELS.CONTEXT_MENU_CLOSED, { menuId: request.menuId })
        }
      }
    })
  })
}
