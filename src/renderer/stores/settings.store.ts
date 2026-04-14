import { create } from 'zustand'
import { DEFAULT_SETTINGS, type ISettings } from '@shared/types/store'
import { getThemeById } from '@shared/config/theme.config'
import { applyTheme } from '../utils/theme'

interface SettingsState {
  settings: ISettings
  initialized: boolean
  init: () => Promise<void>
  updateSettings: (patch: Partial<ISettings>) => void
}

function mergeSettings(stored?: Partial<ISettings> | null): ISettings {
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    theme: stored?.theme === 'light-plus' ? 'light-plus' : DEFAULT_SETTINGS.theme
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  initialized: false,

  init: async () => {
    if (get().initialized) {
      return
    }

    const stored = await window.storeApi.get('settings')
    const settings = mergeSettings(stored)
    applyTheme(getThemeById(settings.theme))
    set({ settings, initialized: true })
  },

  updateSettings: (patch) => {
    const nextSettings = mergeSettings({
      ...get().settings,
      ...patch
    })

    window.storeApi.set('settings', nextSettings)
    applyTheme(getThemeById(nextSettings.theme))
    set({ settings: nextSettings })
  }
}))
