/**
 * Theme definition for zTerm UI and terminal colors.
 * CSS variable names are derived from property keys: camelCase → kebab-case with `--` prefix.
 * e.g. bgEditor → --bg-editor
 */
export interface ITheme {
  // Title Bar
  bgTitlebar: string
  textTitlebar: string

  // Activity Bar
  bgActivitybar: string
  activitybarFgActive: string
  activitybarFgInactive: string
  activitybarBadgeBg: string

  // Editor / Terminal area
  bgEditor: string
  fgEditor: string

  // Tabs
  bgTabsContainer: string
  bgTabActive: string
  bgTabInactive: string
  fgTabActive: string
  fgTabInactive: string
  tabBorder: string
  tabActiveBorderBottom: string
  tabActiveBorderTop: string

  // Sidebar
  bgSidebar: string
  fgSidebar: string
  fgSidebarTitle: string

  // Status Bar
  bgStatusbar: string
  fgStatusbar: string

  // Borders & General
  borderColor: string
  bgHover: string
  bgActive: string
  focusBorder: string

  // Menus
  menuBackground: string
  menuForeground: string
  menuSelectionBackground: string
  menuSelectionForeground: string
  menuBorder: string
  menuSeparatorBackground: string

  // Terminal
  terminalBackground: string
  terminalForeground: string
  terminalCursor: string
  terminalSelectionBackground: string
}

export const darkPlusTheme: ITheme = {
  // Title Bar
  bgTitlebar: '#3c3c3c',
  textTitlebar: '#cccccc',

  // Activity Bar
  bgActivitybar: '#333333',
  activitybarFgActive: '#ffffff',
  activitybarFgInactive: 'rgba(255, 255, 255, 0.4)',
  activitybarBadgeBg: '#007acc',

  // Editor / Terminal area
  bgEditor: '#1e1e1e',
  fgEditor: '#d4d4d4',

  // Tabs
  bgTabsContainer: '#252526',
  bgTabActive: '#1e1e1e',
  bgTabInactive: '#2d2d2d',
  fgTabActive: '#ffffff',
  fgTabInactive: 'rgba(255, 255, 255, 0.5)',
  tabBorder: '#252526',
  tabActiveBorderBottom: '#1e1e1e',
  tabActiveBorderTop: '#007acc',

  // Sidebar
  bgSidebar: '#252526',
  fgSidebar: '#cccccc',
  fgSidebarTitle: '#bbbbbb',

  // Status Bar
  bgStatusbar: '#007acc',
  fgStatusbar: '#ffffff',

  // Borders & General
  borderColor: '#414141',
  bgHover: 'rgba(90, 93, 94, 0.31)',
  bgActive: 'rgba(255, 255, 255, 0.12)',
  focusBorder: '#007fd4',

  // Menus
  menuBackground: '#252526',
  menuForeground: '#cccccc',
  menuSelectionBackground: '#0078d4',
  menuSelectionForeground: '#ffffff',
  menuBorder: '#454545',
  menuSeparatorBackground: '#454545',

  // Terminal
  terminalBackground: '#1e1e1e',
  terminalForeground: '#cccccc',
  terminalCursor: '#ffffff',
  terminalSelectionBackground: '#264f78'
}
