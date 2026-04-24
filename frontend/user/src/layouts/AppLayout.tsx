import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { logout } from '@/api/auth'
import { AUTH_TOKEN_STORAGE_KEY, useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'
import { MEDIA_QUERIES } from '@/config/responsive'
import i18n, { DEFAULT_LANGUAGE, supportedLanguages, type SupportedLanguage } from '@/i18n'
import { useUserInfo } from '@/hooks/useUserInfo'
import { getStoredDarkMode, setStoredDarkMode, subscribeDarkMode } from '@/theme/darkMode'

const routeMeta: Record<string, { titleId: string }> = {
  '/dashboard': {
    titleId: '仪表盘',
  },
  '/knowledge': {
    titleId: '使用文档',
  },
  '/plan': {
    titleId: '购买订阅',
  },
  '/plan/': {
    titleId: '配置订阅',
  },
  '/node': {
    titleId: '节点状态',
  },
  '/order': {
    titleId: '我的订单',
  },
  '/order/': {
    titleId: '订单详情',
  },
  '/invite': {
    titleId: '我的邀请',
  },
  '/profile': {
    titleId: '个人中心',
  },
  '/ticket': {
    titleId: '我的工单',
  },
  '/traffic': {
    titleId: '流量明细',
  },
}

const navItems: Array<
  | {
      type: 'heading'
      titleId: string
    }
  | {
      type: 'item'
      titleId: string
      href: string
      icon?: ReactNode
    }
> = [
  {
    type: 'item',
    titleId: '仪表盘',
    href: '/dashboard',
    icon: <i className="si si-speedometer nav-main-link-icon" />,
  },
  {
    type: 'item',
    titleId: '使用文档',
    href: '/knowledge',
    icon: <i className="si si-book-open nav-main-link-icon" />,
  },
  {
    type: 'heading',
    titleId: '订阅',
  },
  {
    type: 'item',
    titleId: '购买订阅',
    href: '/plan',
    icon: <i className="si si-bag nav-main-link-icon" />,
  },
  {
    type: 'item',
    titleId: '节点状态',
    href: '/node',
    icon: <i className="si si-check nav-main-link-icon" />,
  },
  {
    type: 'heading',
    titleId: '财务',
  },
  {
    type: 'item',
    titleId: '我的订单',
    href: '/order',
    icon: <i className="si si-list nav-main-link-icon" />,
  },
  {
    type: 'item',
    titleId: '我的邀请',
    href: '/invite',
    icon: <i className="si si-users nav-main-link-icon" />,
  },
  {
    type: 'heading',
    titleId: '用户',
  },
  {
    type: 'item',
    titleId: '个人中心',
    href: '/profile',
    icon: <i className="si si-user nav-main-link-icon" />,
  },
  {
    type: 'item',
    titleId: '我的工单',
    href: '/ticket',
    icon: <i className="si si-support nav-main-link-icon" />,
  },
  {
    type: 'item',
    titleId: '流量明细',
    href: '/traffic',
    icon: <i className="si si-bar-chart nav-main-link-icon" />,
  },
]

const normalizePathname = (pathname: string) => pathname

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  'zh-CN': '简体中文',
  'en-US': 'English',
  'ja-JP': '日本語',
  'vi-VN': 'Tiếng Việt',
  'ko-KR': '한국어',
  'zh-TW': '繁體中文',
  'fa-IR': 'فارسی',
}

const getAppTitle = () => {
  if (typeof window === 'undefined') return 'V2Board'
  const legacyTitle = (window as any)?.settings?.title
  if (legacyTitle && typeof legacyTitle === 'string') return legacyTitle
  const appName = (window as any)?.__APP_CONFIG__?.appName
  if (appName && typeof appName === 'string') return appName
  return 'V2Board'
}

const getLegacyTheme = () => {
  if (typeof window === 'undefined') return null
  const theme = (window as any)?.settings?.theme
  return theme && typeof theme === 'object' ? theme : null
}

const getLanguageItems = (): SupportedLanguage[] => {
  if (typeof window === 'undefined') return [...supportedLanguages]
  const languages = (window as any)?.settings?.i18n
  if (!Array.isArray(languages)) return [...supportedLanguages]
  const filtered = languages.filter((code: string): code is SupportedLanguage =>
    (supportedLanguages as readonly string[]).includes(code)
  )
  return filtered.length ? [...filtered].sort() : [...supportedLanguages]
}

const getRouteMeta = (pathname: string) => {
  const normalized = normalizePathname(pathname)
  let best: { titleId: string } | null = null
  let bestLen = -1

  for (const [key, meta] of Object.entries(routeMeta)) {
    if (normalized.startsWith(key) && key.length > bestLen) {
      best = meta
      bestLen = key.length
    }
  }

  return best ?? routeMeta['/dashboard']
}

function AppSidebar({
  pathname,
  onNavigate,
  onClose,
  showClose,
  dark,
}: {
  pathname: string
  onNavigate?: () => void
  onClose?: () => void
  showClose?: boolean
  dark?: boolean
}) {
  const normalizedPathname = normalizePathname(pathname)
  const legacyVersion = typeof window !== 'undefined' ? (window as any)?.settings?.version : null
  const versionSuffix = legacyVersion && typeof legacyVersion === 'string' ? ` v${legacyVersion}` : ''

  return (
    <>
      <div className="smini-hidden bg-header-dark">
        <div className="content-header justify-content-lg-center bg-white-10">
          <Link to="/" className="font-size-lg text-white" onClick={onNavigate}>
            <span className="text-white-75">{getAppTitle()}</span>
          </Link>
          {showClose ? (
            <div className="d-lg-none">
              <a
                className="text-white ml-2"
                href="javascript:void(0);"
                onClick={() => onClose?.()}
              >
                <i className="fa fa-times-circle" />
              </a>
            </div>
          ) : null}
        </div>
      </div>

      <div className="content-side content-side-full">
        <ul className="nav-main">
          {navItems.map((item, index) => {
            if (item.type === 'heading') {
              return (
                <li key={`heading-${index}`} className="nav-main-heading">
                  {i18n.t(item.titleId)}
                </li>
              )
            }

            const isActive = normalizedPathname === item.href
            return (
              <li key={item.href} className="nav-main-item">
                <Link
                  className={`nav-main-link${isActive ? ' active' : ''}`}
                  to={item.href}
                  onClick={() => onNavigate?.()}
                >
                  {item.icon}
                  <span className="nav-main-link-name">{i18n.t(item.titleId)}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="v2board-copyright">
        {getAppTitle()}
        {versionSuffix}
      </div>
    </>
  )
}

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const setToken = useAuthStore((state) => state.setToken)
  const clearUserInfo = useUserStore((state) => state.clearUserInfo)
  const [isTabletViewport, setIsTabletViewport] = useState(false)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false)
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false)
  const [langMenuStyle, setLangMenuStyle] = useState<CSSProperties | undefined>(undefined)
  const { userInfo } = useUserInfo()
  const currentMeta = getRouteMeta(location.pathname)
  const [language, setLanguage] = useState<SupportedLanguage>(() => {
    const stored =
      (typeof window !== 'undefined' ? window.localStorage.getItem('umi_locale') : null) ||
      (typeof window !== 'undefined' ? window.localStorage.getItem('i18n') : null)
    const current = stored ?? i18n.resolvedLanguage ?? i18n.language
    return (supportedLanguages as readonly string[]).includes(current) ? (current as SupportedLanguage) : DEFAULT_LANGUAGE
  })
  const [darkMode, setDarkMode] = useState(() => getStoredDarkMode())
  const languageItems = getLanguageItems()
  const avatarTriggerRef = useRef<HTMLButtonElement | null>(null)
  const avatarMenuRef = useRef<HTMLDivElement | null>(null)
  const langTriggerRef = useRef<HTMLButtonElement | null>(null)
  const langMenuRef = useRef<HTMLDivElement | null>(null)

  const closeMenus = () => {
    setIsAvatarMenuOpen(false)
    setIsLangMenuOpen(false)
  }

  const handleLogout = async () => {
    await logout()
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
    setToken(null)
    clearUserInfo()
    navigate('/login')
  }

  const handleLanguageSelect = (code: SupportedLanguage) => {
    closeMenus()
    setLanguage(code)
    localStorage.setItem('i18n', code)
    localStorage.setItem('umi_locale', code)
    if ((i18n.resolvedLanguage ?? i18n.language) === code) {
      return
    }
    window.location.reload()
  }

  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      if ((supportedLanguages as readonly string[]).includes(lng)) {
        setLanguage(lng as SupportedLanguage)
      }
    }

    i18n.on('languageChanged', handleLanguageChanged)
    return () => {
      i18n.off('languageChanged', handleLanguageChanged)
    }
  }, [])

  useEffect(() => {
    return subscribeDarkMode(setDarkMode)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia(MEDIA_QUERIES.tabletDown)
    const handleViewportChange = (event: MediaQueryList | MediaQueryListEvent) => {
      const matches = 'matches' in event ? event.matches : mediaQuery.matches
      setIsTabletViewport(matches)
      if (!matches) {
        setIsMobileNavOpen(false)
      }
    }

    handleViewportChange(mediaQuery)
    mediaQuery.addEventListener('change', handleViewportChange)

    return () => {
      mediaQuery.removeEventListener('change', handleViewportChange)
    }
  }, [])

  useEffect(() => {
    setIsMobileNavOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (typeof document === 'undefined') return
    if (!isAvatarMenuOpen && !isLangMenuOpen) return

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (avatarTriggerRef.current?.contains(target)) return
      if (avatarMenuRef.current?.contains(target)) return
      if (langTriggerRef.current?.contains(target)) return
      if (langMenuRef.current?.contains(target)) return
      closeMenus()
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [isAvatarMenuOpen, isLangMenuOpen])

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

  const legacyTheme = getLegacyTheme()
  const sidebarTheme =
    legacyTheme?.sidebar && typeof legacyTheme.sidebar === 'string' ? legacyTheme.sidebar.trim().toLowerCase() : ''
  const headerTheme =
    legacyTheme?.header && typeof legacyTheme.header === 'string' ? legacyTheme.header.trim().toLowerCase() : ''
  const sidebarDark = sidebarTheme === 'dark'
  const headerDark = headerTheme === 'dark'
  const localeClass = typeof window !== 'undefined' ? window.localStorage.getItem('umi_locale') || '' : ''
  const sidebarVisible = isTabletViewport && isMobileNavOpen
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
                onClick={(event) => {
                  event.stopPropagation()
                  handleLanguageSelect(code)
                }}
                role="menuitem"
                tabIndex={0}
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
    <div
      id="page-container"
      className={`${localeClass} sidebar-o ${sidebarDark ? 'sidebar-dark' : ''} ${headerDark ? 'page-header-dark' : ''} side-scroll page-header-fixed main-content-boxed side-trans-enabled ${sidebarVisible ? 'sidebar-o-xs' : ''}`}
    >
      <nav id="sidebar" aria-label="Sidebar">
        <AppSidebar
          pathname={location.pathname}
          onNavigate={() => {
            setIsMobileNavOpen(false)
          }}
          onClose={() => setIsMobileNavOpen(false)}
          showClose={isTabletViewport}
          dark={sidebarDark}
        />
      </nav>

      <header id="page-header">
        <div className="content-header">
          <div className="sidebar-toggle">
            <button
              type="button"
              className={headerDark ? 'btn btn-primary mr-1 d-lg-none' : 'btn mr-1 d-lg-none'}
              onClick={() => {
                closeMenus()
                setIsMobileNavOpen((prev) => !prev)
              }}
              aria-label="Open navigation menu"
            >
              <i className="fa fa-fw fa-bars" />
            </button>
          </div>

          <div className={headerDark ? 'v2board-container-title text-white' : 'v2board-container-title text-black'}>
            {i18n.t(currentMeta.titleId)}
          </div>

          <div>
            <div className="dropdown d-inline-block">
              <button
                type="button"
                className={headerDark ? 'btn btn-primary mr-1' : 'btn mr-1'}
                onClick={() => setStoredDarkMode(!darkMode)}
              >
                {darkMode ? <i className="far fa fa-moon" /> : <i className="far fa fa-sun" />}
              </button>
            </div>

            <div className="dropdown d-inline-block">
              <button
                ref={langTriggerRef}
                type="button"
                className={headerDark ? 'btn btn-primary mr-1' : 'btn mr-1'}
                title={LANGUAGE_LABELS[language] ?? language}
                onClick={(event) => {
                  event.stopPropagation()
                  setIsAvatarMenuOpen(false)
                  setIsLangMenuOpen((prev) => !prev)
                }}
              >
                <i className="far fa fa-language" />
              </button>
            </div>

            {!userInfo?.email ? (
              <div className="spinner-grow text-primary" />
            ) : (
              <div className="dropdown d-inline-block">
                <button
                  ref={avatarTriggerRef}
                  type="button"
                  className={headerDark ? 'btn btn-primary' : 'btn'}
                  onClick={(event) => {
                    event.stopPropagation()
                    setIsLangMenuOpen(false)
                    setIsAvatarMenuOpen((prev) => !prev)
                  }}
                >
                  <i className="far fa fa-user-circle" />
                  <span className="d-none d-lg-inline ml-1">{userInfo.email}</span>
                  <i className="fa fa-fw fa-angle-down ml-1" />
                </button>
                <div
                  ref={avatarMenuRef}
                  className={`dropdown-menu dropdown-menu-right p-0 ${isAvatarMenuOpen ? 'show' : ''}`}
                  role="menu"
                >
                  <div className="p-2">
                    <a
                      className="dropdown-item"
                      href="javascript:void(0);"
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        setIsAvatarMenuOpen(false)
                        navigate('/profile')
                      }}
                    >
                      <i className="far fa-fw fa-user mr-1" /> {i18n.t('个人中心')}
                    </a>
                    <a
                      className="dropdown-item"
                      href="javascript:void(0);"
                      onClick={async (event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        setIsAvatarMenuOpen(false)
                        await handleLogout()
                      }}
                    >
                      <i className="far fa-fw fa-arrow-alt-circle-left mr-1" /> {i18n.t('登出')}
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main id="main-container">
        <div className="content content-full">
          <Outlet />
        </div>
      </main>

      <div
        className="v2board-nav-mask"
        style={{ display: sidebarVisible ? 'block' : 'none' }}
        onClick={() => {
          setIsMobileNavOpen(false)
        }}
        aria-hidden="true"
      />
      {languageMenuPortal}
    </div>
  )
}
