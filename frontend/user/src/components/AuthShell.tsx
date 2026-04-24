import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import i18n, { DEFAULT_LANGUAGE, supportedLanguages, type SupportedLanguage } from '@/i18n'

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  'zh-CN': '简体中文',
  'en-US': 'English',
  'ja-JP': '日本語',
  'vi-VN': 'Tiếng Việt',
  'ko-KR': '한국어',
  'zh-TW': '繁體中文',
  'fa-IR': 'فارسی',
}

function getLegacySettings() {
  if (typeof window === 'undefined') return null
  const settings = (window as any)?.settings
  return settings && typeof settings === 'object' ? settings : null
}

function getAppTitle() {
  const settings = getLegacySettings()
  if (settings?.title && typeof settings.title === 'string') return settings.title
  const appName = (typeof window !== 'undefined' ? (window as any)?.__APP_CONFIG__?.appName : null) as unknown
  if (typeof appName === 'string' && appName) return appName
  return 'V2Board'
}

function getAppLogo() {
  const settings = getLegacySettings()
  if (settings?.logo && typeof settings.logo === 'string') return settings.logo
  return null
}

function getAppDescription() {
  const settings = getLegacySettings()
  if (settings?.description && typeof settings.description === 'string') return settings.description
  return null
}

function getBackgroundUrl() {
  const settings = getLegacySettings()
  if (settings?.background_url && typeof settings.background_url === 'string') return settings.background_url
  return null
}

function getCurrentLanguage(): SupportedLanguage {
  const current = i18n.resolvedLanguage ?? i18n.language
  return (supportedLanguages as readonly string[]).includes(current)
    ? (current as SupportedLanguage)
    : DEFAULT_LANGUAGE
}

function getLanguageItems(): SupportedLanguage[] {
  if (typeof window === 'undefined') return [...supportedLanguages]
  const languages = (window as any)?.settings?.i18n
  if (!Array.isArray(languages)) return [...supportedLanguages]
  const filtered = languages.filter((code: string): code is SupportedLanguage =>
    (supportedLanguages as readonly string[]).includes(code)
  )
  return filtered.length ? [...filtered].sort() : [...supportedLanguages]
}

export interface AuthShellProps {
  children: ReactNode
  footerLeft?: ReactNode
}

export default function AuthShell({ children, footerLeft }: AuthShellProps) {
  const backgroundUrl = getBackgroundUrl()
  const logoUrl = getAppLogo()
  const title = getAppTitle()
  const description = getAppDescription()
  const [language, setLanguage] = useState<SupportedLanguage>(() => getCurrentLanguage())
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false)
  const [langMenuStyle, setLangMenuStyle] = useState<CSSProperties | undefined>(undefined)
  const langTriggerRef = useRef<HTMLAnchorElement | null>(null)
  const langMenuRef = useRef<HTMLDivElement | null>(null)

  const languageItems = useMemo(() => getLanguageItems(), [])

  const handleLanguageSelect = (code: SupportedLanguage) => {
    setIsLangMenuOpen(false)
    localStorage.setItem('i18n', code)
    localStorage.setItem('umi_locale', code)
    setLanguage(code)
    if ((i18n.resolvedLanguage ?? i18n.language) === code) {
      return
    }
    window.location.reload()
  }

  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      if ((supportedLanguages as readonly string[]).includes(lng)) {
        setLanguage(lng as SupportedLanguage)
      } else {
        setLanguage(DEFAULT_LANGUAGE)
      }
    }

    i18n.on('languageChanged', handleLanguageChanged)
    return () => {
      i18n.off('languageChanged', handleLanguageChanged)
    }
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    if (!isLangMenuOpen) return

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (langTriggerRef.current?.contains(target)) return
      if (langMenuRef.current?.contains(target)) return
      setIsLangMenuOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [isLangMenuOpen])

  useLayoutEffect(() => {
    if (!isLangMenuOpen) return
    if (typeof window === 'undefined') return

    const trigger = langTriggerRef.current
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    setLangMenuStyle({
      position: 'fixed',
      left: rect.left + rect.width / 2,
      top: rect.top,
      transform: 'translate(-50%, -100%)',
      zIndex: 20000,
    })
  }, [isLangMenuOpen])

  useLayoutEffect(() => {
    if (!isLangMenuOpen) return
    if (typeof window === 'undefined') return

    const trigger = langTriggerRef.current
    const menu = langMenuRef.current
    if (!trigger || !menu) return

    const rect = trigger.getBoundingClientRect()
    const menuRect = menu.getBoundingClientRect()

    let left = rect.left + rect.width / 2
    let top = rect.top
    let transformX = '-50%'
    let transformY = '-100%'

    // If there's not enough space above, open downwards.
    if (rect.top < menuRect.height + 12) {
      top = rect.bottom
      transformY = '0%'
    }

    if (left - menuRect.width / 2 < 8) {
      left = rect.left
      transformX = '0%'
    } else if (left + menuRect.width / 2 > window.innerWidth - 8) {
      left = rect.right
      transformX = '-100%'
    }

    // Clamp within viewport (best-effort).
    left = Math.min(Math.max(left, 8), window.innerWidth - 8)
    top = Math.min(Math.max(top, 8), window.innerHeight - 8)

    setLangMenuStyle({
      position: 'fixed',
      left,
      top,
      transform: `translate(${transformX}, ${transformY})`,
      zIndex: 20000,
    })
  }, [isLangMenuOpen])

  const languageMenuPortal =
    isLangMenuOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={langMenuRef}
            className="dropdown-menu p-0 show"
            style={langMenuStyle}
            role="menu"
          >
            {languageItems.map((code) => (
              <div
                key={code}
                className="v2board-lang-item"
                role="menuitem"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation()
                  handleLanguageSelect(code)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    event.stopPropagation()
                    handleLanguageSelect(code)
                  }
                }}
              >
                {LANGUAGE_LABELS[code] ?? code}
              </div>
            ))}
          </div>,
          document.body,
        )
      : null

  return (
    <div id="page-container">
      <main id="main-container">
        <div
          className="v2board-background"
          style={backgroundUrl ? { backgroundImage: `url(${backgroundUrl})` } : undefined}
        />

        <div className="no-gutters v2board-auth-box">
          <div
            style={{
              maxWidth: 450,
              width: '100%',
              margin: 'auto',
            }}
          >
            <div className="mx-2 mx-sm-0">
              <div
                className="block block-rounded block-transparent block-fx-pop w-100 mb-0 overflow-hidden bg-image"
                style={{ boxShadow: '0 0.5rem 2rem #0000000d' }}
              >
                <div className="row no-gutters">
                  <div className="col-md-12 order-md-1 bg-white">
                    <div className="block-content block-content-full px-lg-4 py-md-4 py-lg-4">
                      <div className="mb-3 text-center">
                        <a className="font-size-h1" href="javascript:void(0);">
                          {logoUrl ? (
                            <img className="v2board-logo mb-3" src={logoUrl} alt={title} />
                          ) : (
                            <span className="text-dark">{title}</span>
                          )}
                        </a>
                        {description ? <p className="font-size-sm text-muted mb-3">{description}</p> : null}
                      </div>

                      {children}
                    </div>
                  </div>
                </div>

                <div className="text-left bg-gray-lighter p-3 px-4">
                  {footerLeft}
                  <div className="float-right">
                    <a
                      ref={langTriggerRef}
                      className="v2board-login-i18n-btn"
                      style={{ float: 'none', display: 'inline-flex', alignItems: 'center' }}
                      href="javascript:void(0);"
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        setIsLangMenuOpen((prev) => !prev)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          event.stopPropagation()
                          setIsLangMenuOpen((prev) => !prev)
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <i className="si si-globe pr-1" />
                      <span className="font-size-sm text-muted" style={{ verticalAlign: 'text-bottom' }}>
                        {LANGUAGE_LABELS[language] ?? language}
                      </span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      {languageMenuPortal}
    </div>
  )
}
