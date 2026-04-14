import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { getThemeById } from '@shared/config/theme.config'
import { applyTheme } from './utils/theme'
import { DEFAULT_SETTINGS } from '@shared/types/store'
import './styles/global.css'

async function bootstrap() {
  const storedSettings = await window.storeApi.get('settings').catch(() => undefined)
  const themeId = storedSettings?.theme ?? DEFAULT_SETTINGS.theme

  applyTheme(getThemeById(themeId))

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

void bootstrap()
