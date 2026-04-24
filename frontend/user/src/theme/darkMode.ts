import { disable, enable } from '@/vendor/darkreader'

export const DARK_MODE_STORAGE_KEY = 'dark_mode'
export const DARK_MODE_EVENT = 'v2board:dark-mode'

const DARKREADER_CONFIG = {
  brightness: 100,
  contrast: 90,
  sepia: 10,
} as const

export function getStoredDarkMode(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(DARK_MODE_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function applyDarkMode(enabled: boolean) {
  if (typeof document === 'undefined') return

  // Prevent the legacy CSS-variable dark mode from being applied together with DarkReader.
  try {
    delete document.documentElement.dataset.darkMode
  } catch {
    // ignore
  }

  try {
    if (enabled) {
      enable(DARKREADER_CONFIG)
    } else {
      disable()
    }
  } catch {
    // ignore
  }

  if (!enabled) {
    // Hard cleanup in case the bundled DarkReader module fails to disable (e.g. partial initialization).
    // The upstream theme relies on DarkReader, so leaving artifacts breaks "light mode" badly.
    try {
      document.documentElement.removeAttribute('data-darkreader-mode')
      document.documentElement.removeAttribute('data-darkreader-scheme')
      document.head?.querySelectorAll('meta[name="darkreader"]').forEach((node) => node.remove())
      document
        .querySelectorAll(
          [
            '.darkreader',
            'style.darkreader',
            'style.darkreader--fallback',
            'style.darkreader--user-agent',
            'style.darkreader--text',
            'style.darkreader--invert',
            'style.darkreader--inline',
            'style.darkreader--override',
            'style.darkreader--variables',
            'style.darkreader--root-vars',
          ].join(','),
        )
        .forEach((node) => node.remove())
    } catch {
      // ignore
    }
  }
}

export function setStoredDarkMode(enabled: boolean) {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(DARK_MODE_STORAGE_KEY, enabled ? '1' : '0')
    } catch {
      // ignore
    }
    applyDarkMode(enabled)
    window.dispatchEvent(new CustomEvent<boolean>(DARK_MODE_EVENT, { detail: enabled }))
  } else {
    applyDarkMode(enabled)
  }
}

export function subscribeDarkMode(onChange: (enabled: boolean) => void) {
  if (typeof window === 'undefined') return () => {}

  const notify = (enabled: boolean) => {
    applyDarkMode(enabled)
    onChange(enabled)
  }

  const onCustomEvent = (event: Event) => {
    const custom = event as CustomEvent<boolean>
    notify(Boolean(custom.detail))
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key && event.key !== DARK_MODE_STORAGE_KEY) return
    notify(getStoredDarkMode())
  }

  window.addEventListener(DARK_MODE_EVENT, onCustomEvent)
  window.addEventListener('storage', onStorage)

  return () => {
    window.removeEventListener(DARK_MODE_EVENT, onCustomEvent)
    window.removeEventListener('storage', onStorage)
  }
}
