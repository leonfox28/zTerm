/**
 * Theme definition for zTerm UI and terminal colors.
 * CSS variable names are derived from property keys: camelCase → kebab-case with `--` prefix.
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
  menuBackground: string
  menuForeground: string
  menuSelectionBackground: string
  menuSelectionForeground: string
  menuBorder: string
  menuSeparatorBackground: string
  terminalBackground: string
  terminalForeground: string
  terminalCursor: string
  terminalSelectionBackground: string
}

export type ThemeId = 'dark-plus' | 'light-plus'

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
  menuBackground: '#252526',
  menuForeground: '#cccccc',
  menuSelectionBackground: '#0078d4',
  menuSelectionForeground: '#ffffff',
  menuBorder: '#454545',
  menuSeparatorBackground: '#454545',
  terminalBackground: '#1e1e1e',
  terminalForeground: '#cccccc',
  terminalCursor: '#ffffff',
  terminalSelectionBackground: '#264f78'
}

export const lightPlusTheme: ITheme = {
  bgTitlebar: '#dddddd',
  textTitlebar: '#333333',
  bgActivitybar: '#f3f3f3',
  activitybarFgActive: '#424242',
  activitybarFgInactive: 'rgba(66, 66, 66, 0.55)',
  activitybarBadgeBg: '#007acc',
  bgEditor: '#ffffff',
  fgEditor: '#333333',
  bgTabsContainer: '#f3f3f3',
  bgTabActive: '#ffffff',
  bgTabInactive: '#ececec',
  fgTabActive: '#333333',
  fgTabInactive: 'rgba(51, 51, 51, 0.7)',
  tabBorder: '#e5e5e5',
  tabActiveBorderBottom: '#ffffff',
  tabActiveBorderTop: '#005fb8',
  bgSidebar: '#f3f3f3',
  fgSidebar: '#3c3c3c',
  fgSidebarTitle: '#6f6f6f',
  bgStatusbar: '#007acc',
  fgStatusbar: '#ffffff',
  borderColor: '#e5e5e5',
  bgHover: 'rgba(0, 0, 0, 0.04)',
  bgActive: 'rgba(0, 0, 0, 0.08)',
  focusBorder: '#0090f1',
  menuBackground: '#ffffff',
  menuForeground: '#333333',
  menuSelectionBackground: '#0060c0',
  menuSelectionForeground: '#ffffff',
  menuBorder: '#c8c8c8',
  menuSeparatorBackground: '#e5e5e5',
  terminalBackground: '#ffffff',
  terminalForeground: '#333333',
  terminalCursor: '#333333',
  terminalSelectionBackground: '#add6ff'
}

export const themesById: Record<ThemeId, ITheme> = {
  'dark-plus': darkPlusTheme,
  'light-plus': lightPlusTheme
}

export const themeOptions: Array<{ value: ThemeId; label: string }> = [
  { value: 'dark-plus', label: 'Dark+' },
  { value: 'light-plus', label: 'Light+' }
]

export function getThemeById(themeId: string | undefined): ITheme {
  if (themeId === 'light-plus') {
    return lightPlusTheme
  }

  return darkPlusTheme
}
