import { ChangeEvent } from 'react'
import { themeOptions } from '@shared/config/theme.config'
import { returnToTerminalCommand } from '../../commands/workbench.commands'
import { useSettingsStore } from '../../stores/settings.store'
import '../../styles/settings.css'

interface SettingsViewProps {
  visible: boolean
}

const FONT_FAMILY_OPTIONS = [
  {
    value: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
    label: 'JetBrains Mono'
  },
  {
    value: "'Fira Code', 'JetBrains Mono', 'Cascadia Code', Menlo, monospace",
    label: 'Fira Code'
  },
  {
    value: "'Cascadia Code', 'JetBrains Mono', 'Fira Code', Menlo, monospace",
    label: 'Cascadia Code'
  },
  {
    value: "Menlo, Monaco, 'SF Mono', monospace",
    label: 'Menlo'
  },
  {
    value: "Monaco, Menlo, 'SF Mono', monospace",
    label: 'Monaco'
  }
]

export function SettingsView({ visible }: SettingsViewProps) {
  const settings = useSettingsStore((state) => state.settings)
  const updateSettings = useSettingsStore((state) => state.updateSettings)

  const handleTextChange =
    (key: 'fontFamily' | 'shellPath') => (event: ChangeEvent<HTMLInputElement>) => {
      updateSettings({ [key]: event.target.value })
    }

  const handleNumberChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value)
    if (Number.isNaN(value)) {
      return
    }

    updateSettings({ fontSize: value })
  }

  return (
    <div className={`main-area__view main-area__settings-view ${visible ? '' : 'main-area__view--hidden'}`}>
      <div className="settings-view">
        <div className="settings-view__header">
          <div>
            <h1 className="settings-view__title">Settings</h1>
            <p className="settings-view__description">Configure terminal behavior and workbench appearance.</p>
          </div>
          <button className="settings-view__button" onClick={returnToTerminalCommand} type="button">
            Back to Terminal
          </button>
        </div>

        <section className="settings-section">
          <h2 className="settings-section__title">Terminal</h2>
          <div className="settings-field-grid">
            <label className="settings-field">
              <span className="settings-field__label">Font Family</span>
              <select
                className="settings-field__select"
                onChange={(event) => updateSettings({ fontFamily: event.target.value })}
                value={settings.fontFamily}
              >
                {FONT_FAMILY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="settings-field">
              <span className="settings-field__label">Font Size</span>
              <input
                className="settings-field__input"
                min={8}
                onChange={handleNumberChange}
                type="number"
                value={settings.fontSize}
              />
            </label>

            <label className="settings-field settings-field--full">
              <span className="settings-field__label">Shell Path</span>
              <input
                className="settings-field__input"
                onChange={handleTextChange('shellPath')}
                placeholder="Use system default shell"
                type="text"
                value={settings.shellPath}
              />
            </label>

            <label className="settings-field settings-field--toggle">
              <span>
                <span className="settings-field__label">Login Shell</span>
                <span className="settings-field__hint">Applies to newly created terminals only.</span>
              </span>
              <input
                checked={settings.loginShell}
                onChange={(event) => updateSettings({ loginShell: event.target.checked })}
                type="checkbox"
              />
            </label>
          </div>
        </section>

        <section className="settings-section">
          <h2 className="settings-section__title">Appearance</h2>
          <label className="settings-field settings-field--select">
            <span className="settings-field__label">Theme</span>
            <select
              className="settings-field__select"
              onChange={(event) => updateSettings({ theme: event.target.value as (typeof themeOptions)[number]['value'] })}
              value={settings.theme}
            >
              {themeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </section>
      </div>
    </div>
  )
}
