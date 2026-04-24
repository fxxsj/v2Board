import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import zhCN from '@/locales/zh-CN.json'
import enUS from '@/locales/en-US.json'
import jaJP from '@/locales/ja-JP.json'
import viVN from '@/locales/vi-VN.json'
import koKR from '@/locales/ko-KR.json'
import zhTW from '@/locales/zh-TW.json'
import faIR from '@/locales/fa-IR.json'

export const supportedLanguages = [
  'zh-CN',
  'en-US',
  'ja-JP',
  'vi-VN',
  'ko-KR',
  'zh-TW',
  'fa-IR',
] as const

export type SupportedLanguage = (typeof supportedLanguages)[number]

export const DEFAULT_LANGUAGE: SupportedLanguage = 'zh-CN'

type TranslationDict = Record<string, string>

function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return typeof value === 'string' && (supportedLanguages as readonly string[]).includes(value)
}

function getLegacyTranslations(language: SupportedLanguage): TranslationDict | null {
  if (typeof window === 'undefined') return null
  const settings = (window as any)?.settings
  const store = settings?.i18n
  if (!store) return null
  const value = store?.[language]
  if (!value || typeof value !== 'object') return null
  return value as TranslationDict
}

function inferLanguageFromBrowser(value: string): SupportedLanguage | null {
  const lower = value.toLowerCase()
  if (lower.startsWith('zh')) {
    return lower.includes('tw') || lower.includes('hk') ? 'zh-TW' : 'zh-CN'
  }
  if (lower.startsWith('en')) return 'en-US'
  if (lower.startsWith('ja')) return 'ja-JP'
  if (lower.startsWith('vi')) return 'vi-VN'
  if (lower.startsWith('ko')) return 'ko-KR'
  if (lower.startsWith('fa')) return 'fa-IR'
  return null
}

function getInitialLanguage(): SupportedLanguage {
  if (typeof window !== 'undefined') {
    // Keep compatibility with the original v2Board frontend's storage keys.
    const umiStored = window.localStorage.getItem('umi_locale')
    if (isSupportedLanguage(umiStored)) return umiStored

    const stored = window.localStorage.getItem('i18n')
    if (isSupportedLanguage(stored)) return stored

    const browser = window.navigator.language
    const inferred = browser ? inferLanguageFromBrowser(browser) : null
    if (inferred) return inferred
  }

  return DEFAULT_LANGUAGE
}

const bundledResources: Record<SupportedLanguage, TranslationDict> = {
  'zh-CN': zhCN,
  'en-US': enUS,
  'ja-JP': jaJP,
  'vi-VN': viVN,
  'ko-KR': koKR,
  'zh-TW': zhTW,
  'fa-IR': faIR,
}

const resources = supportedLanguages.reduce(
  (acc, lang) => {
    const legacy = getLegacyTranslations(lang)
    acc[lang] = { translation: legacy ?? bundledResources[lang] }
    return acc
  },
  {} as Record<SupportedLanguage, { translation: TranslationDict }>,
)

void i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  keySeparator: false,
  nsSeparator: false,
  // The original theme uses `{var}` placeholders (not i18next's default `{{var}}`).
  interpolation: { escapeValue: false, prefix: '{', suffix: '}' },
})

export default i18n
