import { ChangeEvent, ReactNode, useState } from 'react'
import { themeOptions } from '@shared/config/theme.config'
import { DEFAULT_SETTINGS } from '@shared/types/store'
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

const SETTINGS_CATEGORIES = [
  { id: 'general', label: 'General' },
  { id: 'appearance', label: 'Appearance' }
] as const

type SettingsCategoryId = (typeof SETTINGS_CATEGORIES)[number]['id']

type SettingsRow = {
  id: string
  label: string
  description: string
  searchTerms: string[]
  modified: boolean
  renderControl: () => ReactNode
}

export function SettingsView({ visible }: SettingsViewProps) {
  const settings = useSettingsStore((state) => state.settings)
  const updateSettings = useSettingsStore((state) => state.updateSettings)
  const [activeCategory, setActiveCategory] = useState<SettingsCategoryId>('general')

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

  const [searchQuery, setSearchQuery] = useState('')
  const normalizedQuery = searchQuery.trim().toLowerCase()
  const isSearchMode = normalizedQuery.length > 0

  const generalRows: SettingsRow[] = [
    {
      id: 'shellPath',
      label: 'Shell Path',
      description: 'The local shell path used when creating new terminal sessions. Leave empty to use the system default shell.',
      searchTerms: ['general', 'shell', 'shell path', 'local shell', 'terminal shell', 'default shell', 'path'],
      modified: settings.shellPath !== DEFAULT_SETTINGS.shellPath,
      renderControl: () => (
        <input className="settings-control settings-control--input" onChange={handleTextChange('shellPath')} placeholder="Use system default shell" type="text" value={settings.shellPath} />
      )
    },
    {
      id: 'loginShell',
      label: 'Use Login Shell',
      description: 'Controls whether newly created local terminal sessions launch as login shells.',
      searchTerms: ['general', 'login shell', 'shell', 'profile', 'terminal shell', 'startup shell'],
      modified: settings.loginShell !== DEFAULT_SETTINGS.loginShell,
      renderControl: () => (
        <label className="settings-toggle-control">
          <input checked={settings.loginShell} onChange={(event) => updateSettings({ loginShell: event.target.checked })} type="checkbox" />
          <span>{settings.loginShell ? 'Enabled' : 'Disabled'}</span>
        </label>
      )
    }
  ]

  const appearanceRows: SettingsRow[] = [
    {
      id: 'theme',
      label: 'Color Theme',
      description: 'Specifies the color theme used in the workbench.',
      searchTerms: ['appearance', 'theme', 'color theme', 'dark', 'light', 'workbench theme'],
      modified: settings.theme !== DEFAULT_SETTINGS.theme,
      renderControl: () => (
        <select className="settings-control settings-control--select" onChange={(event) => updateSettings({ theme: event.target.value as (typeof themeOptions)[number]['value'] })} value={settings.theme}>
          {themeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )
    },
    {
      id: 'fontFamily',
      label: 'Font Family',
      description: 'Controls the font family used by terminal tabs and terminal content.',
      searchTerms: ['appearance', 'font', 'font family', 'terminal font', 'typeface'],
      modified: settings.fontFamily !== DEFAULT_SETTINGS.fontFamily,
      renderControl: () => (
        <select className="settings-control settings-control--select" onChange={(event) => updateSettings({ fontFamily: event.target.value })} value={settings.fontFamily}>
          {FONT_FAMILY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )
    },
    {
      id: 'fontSize',
      label: 'Font Size',
      description: 'Controls the font size in pixels of the terminal.',
      searchTerms: ['appearance', 'font', 'font size', 'text size', 'terminal font'],
      modified: settings.fontSize !== DEFAULT_SETTINGS.fontSize,
      renderControl: () => (
        <input className="settings-control settings-control--input settings-control--input-number" min={8} onChange={handleNumberChange} type="number" value={settings.fontSize} />
      )
    }
  ]

  const allGroups = SETTINGS_CATEGORIES.map((category) => ({
    id: category.id,
    title: category.label,
    rows: category.id === 'appearance' ? appearanceRows : generalRows
  }))

  const activeGroup = allGroups.find((group) => group.id === activeCategory) ?? allGroups[0]

  const visibleGroups = allGroups
    .map((group) => ({
      ...group,
      rows: group.rows.filter((row) => {
        if (!normalizedQuery) {
          return true
        }

        const haystack = `${group.title} ${row.label} ${row.description} ${row.searchTerms.join(' ')}`.toLowerCase()
        return haystack.includes(normalizedQuery)
      })
    }))
    .filter((group) => group.rows.length > 0)

  const displayedGroups = isSearchMode ? visibleGroups : [activeGroup]
  const hasResults = displayedGroups.length > 0

  return (
    <div className={`main-area__view main-area__settings-view ${visible ? '' : 'main-area__view--hidden'}`}>
      <div className={`settings-view ${isSearchMode ? 'settings-view--search-mode' : ''} ${isSearchMode && !hasResults ? 'settings-view--no-results' : ''}`}>
        <div className="settings-view__header settings-editor-header">
          <div className="settings-editor-header__search-container">
            <input
              aria-label="Search settings"
              className="settings-editor-header__search-input"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search settings"
              type="text"
              value={searchQuery}
            />
            <div className="settings-editor-header__widgets">
              <button
                aria-label="Clear search"
                className={`settings-editor-header__clear ${searchQuery ? 'settings-editor-header__clear--visible' : ''}`}
                onClick={() => setSearchQuery('')}
                type="button"
              >
                <i className="codicon codicon-close" />
              </button>
            </div>
          </div>
          <div className="settings-editor-header__controls">
            <div className="settings-editor-header__tabs">
              <button className="settings-editor-header__tab settings-editor-header__tab--active" type="button">
                User
              </button>
            </div>
          </div>
        </div>

        <div className="settings-view__layout settings-editor-body">
          <nav aria-label="Settings categories" className="settings-view__nav settings-toc">
            {allGroups.map((group) => {
              const matchedCount = visibleGroups.find((visibleGroup) => visibleGroup.id === group.id)?.rows.length ?? 0
              const count = isSearchMode ? matchedCount : group.rows.length

              const isSelected = !isSearchMode && group.id === activeCategory

              return (
                <button
                  key={group.id}
                  className={`settings-view__nav-item settings-toc__item ${isSelected ? 'settings-view__nav-item--active settings-toc__item--active' : ''}`}
                  onClick={() => {
                    setActiveCategory(group.id)
                  }}
                  type="button"
                >
                  <span className="settings-toc__entry">{group.title}</span>
                  <span className="settings-toc__count">{count}</span>
                </button>
              )
            })}
          </nav>
          <div className="settings-view__content settings-editor-content">
            {hasResults ? (
              displayedGroups.map((group) => (
                <div key={group.id} className="settings-editor-group">
                  <div className="settings-editor-group__title-row">
                    <h2 className="settings-editor-group__title">{group.title}</h2>
                  </div>
                  <div className="settings-editor-list" role="list">
                    {group.rows.map((row) => (
                      <div key={row.id} className={`settings-editor-row ${row.modified ? 'settings-editor-row--modified' : ''}`} role="listitem">
                        <div className="settings-editor-row__inner">
                          <div className="settings-editor-row__title">
                            <div className="settings-editor-row__label">{row.label}</div>
                          </div>
                          <div className="settings-editor-row__description">{row.description}</div>
                          <div className="settings-editor-row__control">{row.renderControl()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="settings-editor-empty">No settings found for “{searchQuery}”.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
