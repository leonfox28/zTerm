export interface ContextMenuAnchor {
  x: number
  y: number
}

export type ContextMenuItemType = 'normal' | 'separator' | 'checkbox' | 'radio'

export interface ContextMenuItem {
  itemId: string
  type: ContextMenuItemType
  label?: string
  enabled?: boolean
  checked?: boolean
  accelerator?: string
  submenu?: ContextMenuItem[]
}

export interface ContextMenuRequest {
  menuId: string
  anchor: ContextMenuAnchor
  items: ContextMenuItem[]
}

export interface ContextMenuSelection {
  menuId: string
  itemId: string
}

export interface ContextMenuClosed {
  menuId: string
}
