/**
 * Theme definition for zTerm UI and terminal colors.
 * CSS variable names are derived from property keys: camelCase → kebab-case with -- prefix.
 * e.g. bgEditor → --bg-editor
 */
export interface ITheme {
  bgTitlebar: string
  textTitlebar: string

  bgActivitybar: string
  activitybarFgActive: string
  activitybarFgInactive: string
  activitybarBadgeBg: string

  bgEditor: string
  fgEditor: string

  bgTabsContainer: string
  bgTabActive: string
  bgTabInactive: string
  fgTabActive: string
  fgTabInactive: string
  tabBorder: string
  tabActiveBorderBottom: string
  tabActiveBorderTop: string

  bgSidebar: string
  fgSidebar: string
  fgSidebarTitle: string

  bgStatusbar: string
  fgStatusbar: string

  borderColor: string
  bgHover: string
  bgActive: string
  focusBorder: string

  terminalBackground: string
  terminalForeground: string
  terminalCursor: string
  terminalSelectionBackground: string
}

export const darkPlusTheme: ITheme = {
  bgTitlebar: '#3c3c3c',
  textTitlebar: '#cccccc',

  bgActivitybar: '#333333',
  activitybarFgActive: '#ffffff',
  activitybarFgInactive: 'rgba(255, 255, 255, 0.4)',
  activitybarBadgeBg: '#007acc',

  bgEditor: '#1e1e1e',
  fgEditor: '#d4d4d4',

  bgTabsContainer: '#252526',
  bgTabActive: '#1e1e1e',
  bgTabInactive: '#2d2d2d',
  fgTabActive: '#ffffff',
  fgTabInactive: 'rgba(255, 255, 255, 0.5)',
  tabBorder: '#252526',
  tabActiveBorderBottom: '#1e1e1e',
  tabActiveBorderTop: '#007acc',

  bgSidebar: '#252526',
  fgSidebar: '#cccccc',
  fgSidebarTitle: '#bbbbbb',

  bgStatusbar: '#007acc',
  fgStatusbar: '#ffffff',

  borderColor: '#414141',
  bgHover: 'rgba(90, 93, 94, 0.31)',
  bgActive: 'rgba(255, 255, 255, 0.12)',
  focusBorder: '#007fd4',

  terminalBackground: '#1e1e1e',
  terminalForeground: '#cccccc',
  terminalCursor: '#ffffff',
  terminalSelectionBackground: '#264f78'
}
