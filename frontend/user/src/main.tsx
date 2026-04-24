import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { useEffect, useReducer } from 'react'
import App from './App'
import i18n from '@/i18n'
import { applyDarkMode, getStoredDarkMode, subscribeDarkMode } from '@/theme/darkMode'
import { applyThemeColorStylesheet, getThemeColorKey } from '@/theme/themeColor'

;(window as any).__V2BOARD_APP_STARTED__ = true

applyDarkMode(getStoredDarkMode())
applyThemeColorStylesheet(getThemeColorKey())

function RootProviders() {
  useEffect(() => subscribeDarkMode(() => {}), [])
  const [, forceRerender] = useReducer((value: number) => value + 1, 0)

  useEffect(() => {
    const onLanguageChanged = () => {
      forceRerender()
    }
    i18n.on('languageChanged', onLanguageChanged)
    return () => {
      i18n.off('languageChanged', onLanguageChanged)
    }
  }, [])

  return (
    <HashRouter>
      <App />
    </HashRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <RootProviders />,
)
