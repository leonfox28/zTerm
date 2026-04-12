import { ITheme } from '@shared/config/theme.config'

/**
 * Converts camelCase property name to CSS variable name.
 * e.g. "bgEditor" → "--bg-editor"
 *      "activitybarFgActive" → "--activitybar-fg-active"
 *      "terminalBackground" → "--terminal-background"
 */
function toCssVar(key: string): string {
  return '--' + key.replace(/([A-Z])/g, '-').toLowerCase()
}

/**
 * Applies a theme by setting CSS custom properties on :root.
 * Call this before React renders to avoid flash of unstyled content.
 */
export function applyTheme(theme: ITheme): void {
  const root = document.documentElement
  for (const [key, value] of Object.entries(theme)) {
    root.style.setProperty(toCssVar(key), value)
  }
}
