import { appConfig } from '@/config/app'
import { disable, enable } from '@/vendor/darkreader'

const THEME_LINK_ID = 'theme-color'
const DARK_MODE_KEY = 'dark_mode'

export function ensureThemeStylesheet() {
  const href = window.settings?.host
    ? `./theme/${appConfig.theme.color}.css`
    : `/assets/admin/theme/${appConfig.theme.color}.css`

  let link = document.getElementById(THEME_LINK_ID) as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    link.id = THEME_LINK_ID
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }
  link.href = href
}

export function isDarkModeEnabled() {
  return localStorage.getItem(DARK_MODE_KEY) === '1'
}

export function setDarkModeEnabled(enabled: boolean) {
  if (enabled) {
    enable({
      brightness: 100,
      contrast: 90,
      sepia: 10,
    })
    localStorage.setItem(DARK_MODE_KEY, '1')
    return
  }

  disable()
  localStorage.setItem(DARK_MODE_KEY, '0')
}

export function initializeDarkMode() {
  if (isDarkModeEnabled()) {
    setDarkModeEnabled(true)
  } else {
    disable()
  }
}
