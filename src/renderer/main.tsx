import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { darkPlusTheme } from '@shared/config/theme.config'
import { applyTheme } from './utils/theme'
import './styles/global.css'

// Apply theme CSS variables before React renders to avoid FOUC
applyTheme(darkPlusTheme)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
