import { create } from 'zustand'

export interface ContextMenuAnchor {
  x: number
  y: number
}

interface ContextMenuItemBase {
  id: string
}

export interface ContextMenuActionItem extends ContextMenuItemBase {
  type: 'action'
  label: string
  onSelect: () => void
  disabled?: boolean
  icon?: string
}

export interface ContextMenuSeparatorItem extends ContextMenuItemBase {
  type: 'separator'
}

export type ContextMenuItem = ContextMenuActionItem | ContextMenuSeparatorItem

export interface ContextMenuDescriptor {
  anchor: ContextMenuAnchor
  items: ContextMenuItem[]
}

interface ContextMenuState {
  menu: ContextMenuDescriptor | null
  openContextMenu: (menu: ContextMenuDescriptor) => void
  closeContextMenu: () => void
}

export const useContextMenuStore = create<ContextMenuState>((set) => ({
  menu: null,
  openContextMenu: (menu) => set({ menu }),
  closeContextMenu: () => set({ menu: null })
}))
