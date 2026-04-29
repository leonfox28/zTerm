import { ChangeEvent, ReactNode, useState } from 'react'
import { themeOptions } from '@shared/config/theme.config'
import { DEFAULT_SETTINGS } from '@shared/types/store'
import { type IUpdateState } from '@shared/types/update'
import { useSettingsStore } from '../../stores/settings.store'
import { useUpdateStore } from '../../stores/update.store'
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
  { id: 'appearance', label: 'Appearance' },
  { id: 'updates', label: 'Updates' }
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

function formatBytes(value: number): string {
  if (value <= 0) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB']
  let size = value
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function formatCheckedAt(value?: number): string {
  if (!value) {
    return 'Never'
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(new Date(value))
}

function getUpdateStatusLabel(state: IUpdateState): string {
  switch (state.status) {
    case 'checking':
      return 'Checking for updates'
    case 'available':
      return state.availableVersion ? `Update ${state.availableVersion} available` : 'Update available'
    case 'not-available':
      return 'Up to date'
    case 'downloading':
      return 'Downloading update'
    case 'downloaded':
      return state.availableVersion ? `Update ${state.availableVersion} ready` : 'Update ready'
    case 'error':
      return 'Update check failed'
    case 'unavailable':
      return 'Updates unavailable'
    default:
      return 'Ready'
  }
}

function getUpdateIcon(state: IUpdateState): string {
  switch (state.status) {
    case 'checking':
    case 'downloading':
      return 'codicon-sync'
    case 'available':
      return 'codicon-cloud-download'
    case 'downloaded':
      return 'codicon-arrow-up'
    case 'error':
      return 'codicon-error'
    case 'not-available':
      return 'codicon-check'
    case 'unavailable':
      return 'codicon-circle-slash'
    default:
      return 'codicon-info'
  }
}

export function SettingsView({ visible }: SettingsViewProps) {
  const settings = useSettingsStore((state) => state.settings)
  const updateSettings = useSettingsStore((state) => state.updateSettings)
  const updateState = useUpdateStore((state) => state.state)
  const checkForUpdates = useUpdateStore((state) => state.checkForUpdates)
  const installDownloadedUpdate = useUpdateStore((state) => state.installDownloadedUpdate)
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
    },
    {
      id: 'copyOnSelect',
      label: 'Copy on Selection',
      description: 'Controls whether selecting text in the terminal immediately copies it to the system clipboard.',
      searchTerms: ['general', 'copy on selection', 'copy', 'clipboard', 'selection', 'terminal clipboard'],
      modified: settings.copyOnSelect !== DEFAULT_SETTINGS.copyOnSelect,
      renderControl: () => (
        <label className="settings-toggle-control">
          <input checked={settings.copyOnSelect} onChange={(event) => updateSettings({ copyOnSelect: event.target.checked })} type="checkbox" />
          <span>{settings.copyOnSelect ? 'Enabled' : 'Disabled'}</span>
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

  const isUpdateBusy = updateState.status === 'checking' || updateState.status === 'downloading'
  const updateProgress = updateState.progress
  const checkButtonLabel = updateState.status === 'checking' ? 'Checking...' : 'Check for Updates'
  const updatesRows: SettingsRow[] = [
    {
      id: 'currentVersion',
      label: 'Current Version',
      description: 'The version of zTerm currently running.',
      searchTerms: ['updates', 'version', 'current version', 'app version'],
      modified: false,
      renderControl: () => (
        <span className="settings-update-value">{updateState.currentVersion || 'Unknown'}</span>
      )
    },
    {
      id: 'updateStatus',
      label: 'Update Status',
      description: updateState.message,
      searchTerms: ['updates', 'status', 'download', 'progress', 'error', 'available'],
      modified: false,
      renderControl: () => (
        <div className="settings-update-summary">
          <i className={`codicon ${getUpdateIcon(updateState)}`} />
          <span>{getUpdateStatusLabel(updateState)}</span>
          {updateProgress ? (
            <span className="settings-update-summary__progress">
              {Math.round(updateProgress.percent)}% · {formatBytes(updateProgress.transferred)}
              {updateProgress.total > 0 ? ` / ${formatBytes(updateProgress.total)}` : ''}
            </span>
          ) : null}
        </div>
      )
    },
    {
      id: 'lastChecked',
      label: 'Last Checked',
      description: 'The most recent time zTerm checked for application updates.',
      searchTerms: ['updates', 'last checked', 'checked at', 'manual check', 'time'],
      modified: false,
      renderControl: () => (
        <span className="settings-update-value">{formatCheckedAt(updateState.checkedAt)}</span>
      )
    },
    {
      id: 'checkForUpdates',
      label: 'Check for Updates',
      description: isUpdateBusy
        ? 'An update operation is already in progress.'
        : 'Check GitHub Releases for the latest stable zTerm update.',
      searchTerms: ['updates', 'check for updates', 'manual check', 'github release'],
      modified: false,
      renderControl: () => (
        <button
          className="settings-view__button settings-view__button--icon"
          disabled={isUpdateBusy}
          onClick={() => void checkForUpdates()}
          type="button"
        >
          <i className="codicon codicon-sync" />
          <span>{checkButtonLabel}</span>
        </button>
      )
    },
    ...(updateState.status === 'downloaded'
      ? [
          {
            id: 'installDownloadedUpdate',
            label: 'Install Downloaded Update',
            description: 'Restart zTerm to install the downloaded update.',
            searchTerms: ['updates', 'restart', 'install', 'downloaded update'],
            modified: false,
            renderControl: () => (
              <button
                className="settings-view__button settings-view__button--icon"
                onClick={() => void installDownloadedUpdate()}
                type="button"
              >
                <i className="codicon codicon-debug-restart" />
                <span>Restart and Install</span>
              </button>
            )
          }
        ]
      : [])
  ]

  const rowsByCategory: Record<SettingsCategoryId, SettingsRow[]> = {
    general: generalRows,
    appearance: appearanceRows,
    updates: updatesRows
  }

  const allGroups = SETTINGS_CATEGORIES.map((category) => ({
    id: category.id,
    title: category.label,
    rows: rowsByCategory[category.id]
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
