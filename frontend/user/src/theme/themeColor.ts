export type ThemeColorKey = 'default' | 'darkblue' | 'black' | 'green'

const THEME_PRIMARY: Record<ThemeColorKey, string> = {
  darkblue: '#3b5998',
  black: '#343a40',
  default: '#0665d0',
  green: '#319795',
}

const clampByte = (value: number) => Math.max(0, Math.min(255, Math.round(value)))

const hexToRgb = (hex: string) => {
  const normalized = hex.replace('#', '').trim()
  if (normalized.length !== 6) return null
  const r = Number.parseInt(normalized.slice(0, 2), 16)
  const g = Number.parseInt(normalized.slice(2, 4), 16)
  const b = Number.parseInt(normalized.slice(4, 6), 16)
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null
  return { r, g, b }
}

const rgbToHex = (rgb: { r: number; g: number; b: number }) =>
  `#${clampByte(rgb.r).toString(16).padStart(2, '0')}${clampByte(rgb.g).toString(16).padStart(2, '0')}${clampByte(rgb.b)
    .toString(16)
    .padStart(2, '0')}`

const mix = (a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }, amount: number) => {
  const t = Math.max(0, Math.min(1, amount))
  return {
    r: a.r * (1 - t) + b.r * t,
    g: a.g * (1 - t) + b.g * t,
    b: a.b * (1 - t) + b.b * t,
  }
}

const rgba = (rgb: { r: number; g: number; b: number }, alpha: number) =>
  `rgba(${clampByte(rgb.r)}, ${clampByte(rgb.g)}, ${clampByte(rgb.b)}, ${Math.max(0, Math.min(1, alpha))})`

export function getThemeColorKey(): ThemeColorKey {
  if (typeof window === 'undefined') return 'default'
  const key =
    ((window as any)?.settings?.theme?.color as unknown) ??
    ((window as any)?.__APP_CONFIG__?.theme?.color as unknown) ??
    'default'
  if (key === 'darkblue' || key === 'black' || key === 'green' || key === 'default') return key
  return 'default'
}

export function getThemePrimaryColorHex(key: ThemeColorKey): string {
  return THEME_PRIMARY[key] ?? THEME_PRIMARY.default
}

function getThemeStylesheetHref(key: ThemeColorKey): string | null {
  if (typeof window === 'undefined') return null
  const assetsPath = (window as any)?.settings?.assets_path
  if (!assetsPath || typeof assetsPath !== 'string') return null
  return `${assetsPath}/theme/${key}.css`
}

export function applyThemeColorStylesheet(key: ThemeColorKey) {
  if (typeof document === 'undefined') return

  const href = getThemeStylesheetHref(key)
  if (!href) return

  const id = 'v2board-theme-color-css'
  const existing = document.getElementById(id) as HTMLLinkElement | null
  if (existing) {
    if (existing.href !== href) {
      existing.href = href
    }
    return
  }

  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = href
  document.head.appendChild(link)
}

export function applyThemeColorVariables(key: ThemeColorKey) {
  if (typeof document === 'undefined') return
  const primary = getThemePrimaryColorHex(key)
  const rgb = hexToRgb(primary)
  if (!rgb) return

  const strong = rgbToHex(mix(rgb, { r: 0, g: 0, b: 0 }, 0.18))
  const gradientTo = rgbToHex(mix(rgb, { r: 255, g: 255, b: 255 }, 0.35))

  const rootStyle = document.documentElement.style
  rootStyle.setProperty('--brand', primary)
  rootStyle.setProperty('--brand-rgb', `${clampByte(rgb.r)}, ${clampByte(rgb.g)}, ${clampByte(rgb.b)}`)
  rootStyle.setProperty('--brand-strong', strong)
  rootStyle.setProperty('--brand-soft', rgba(rgb, 0.12))
  rootStyle.setProperty('--brand-gradient-to', gradientTo)
}
