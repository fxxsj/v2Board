import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { appConfig } from '@/config/app'
import { navItems, routeTitles } from '@/config/nav'
import { isDarkModeEnabled, setDarkModeEnabled } from '@/config/theme'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

function Sidebar() {
  const location = useLocation()
  const closeNav = useUiStore((state) => state.closeNav)
  const sidebarHeaderClass =
    appConfig.theme.sidebar === 'dark'
      ? 'bg-header-dark'
      : 'bg-header-light border-bottom'
  const sidebarBrandClass =
    appConfig.theme.sidebar === 'dark'
      ? 'text-white'
      : 'text-dual'
  const sidebarBrandCopyClass =
    appConfig.theme.sidebar === 'dark'
      ? 'text-white-75'
      : 'text-muted'
  const isActiveNavItem = (href: string) => {
    if (location.pathname === href) return true
    return href === '/ticket' && location.pathname.startsWith('/ticket/')
  }

  return (
    <nav id="sidebar" aria-label="主导航">
      <div className={`smini-hidden ${sidebarHeaderClass}`}>
        <div className="content-header justify-content-lg-center">
          <a className={`link-fx font-size-lg v2board-sidebar-brand ${sidebarBrandClass}`} href="/">
            {appConfig.logo ? (
              <img src={appConfig.logo} alt={appConfig.appName} className="v2board-sidebar-brand-logo" />
            ) : null}
            <span className={`${sidebarBrandCopyClass} text-truncate`}>{appConfig.appName}</span>
          </a>
          <div className="d-lg-none">
            <button className={`ml-2 v2board-plain-button ${sidebarBrandClass}`} type="button" onClick={closeNav}>
              <i className="fa fa-times-circle" />
            </button>
          </div>
        </div>
      </div>
      <div className="content-side content-side-full v2board-sidebar-scroll">
        <ul className="nav-main">
          {navItems.map((item, index) => {
            if (item.type === 'heading') {
              return (
                <li key={`${item.title}-${index}`} className="nav-main-heading">
                  {item.title}
                </li>
              )
            }

            return (
              <li key={item.href} className="nav-main-item">
                <NavLink
                  to={item.href}
                  className={`nav-main-link ${isActiveNavItem(item.href) ? 'active' : ''}`}
                  onClick={closeNav}
                >
                  <i className={`nav-main-link-icon ${item.icon}`} />
                  <span className="nav-main-link-name">{item.title}</span>
                </NavLink>
              </li>
            )
          })}
        </ul>
      </div>
      <div className="v2board-copyright">
        {appConfig.appName} v{appConfig.version}
      </div>
    </nav>
  )
}

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const showNav = useUiStore((state) => state.showNav)
  const toggleNav = useUiStore((state) => state.toggleNav)
  const closeNav = useUiStore((state) => state.closeNav)
  const logout = useAuthStore((state) => state.logout)
  const userInfo = useAuthStore((state) => state.userInfo)
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(isDarkModeEnabled())
  const avatarRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(event.target as Node)) {
        setAvatarMenuOpen(false)
      }
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  const title = useMemo(() => {
    if (routeTitles.has(location.pathname)) {
      return routeTitles.get(location.pathname) ?? '管理中心'
    }
    if (location.pathname.startsWith('/ticket/')) {
      return '工单管理'
    }
    return '管理中心'
  }, [location.pathname])

  const pageContainerClass = [
    'v2board-admin-shell',
    'sidebar-o',
    appConfig.theme.sidebar === 'dark' ? 'sidebar-dark' : 'sidebar-light',
    appConfig.theme.header === 'dark' ? 'page-header-dark' : 'page-header-light',
    'side-scroll',
    'page-header-fixed',
    'main-content-boxed',
    'side-trans-enabled',
    showNav ? 'sidebar-o-xs' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const headerButtonClass = 'btn btn-sm btn-dual v2board-header-button'
  const titleClass = `v2board-container-title ${appConfig.theme.header === 'dark' ? 'text-white' : 'text-dual'}`

  return (
    <div id="page-container" className={pageContainerClass}>
      <div
        className="v2board-nav-mask"
        style={{ display: showNav ? 'block' : 'none' }}
        onClick={closeNav}
      />

      <Sidebar />

      <header id="page-header">
        <div className="content-header">
          <div className="content-header-section flex-shrink-0">
            <button type="button" className={`${headerButtonClass} mr-1 d-lg-none`} onClick={toggleNav}>
              <i className="fa fa-fw fa-bars" />
            </button>
          </div>

          <div className="content-header-section flex-grow-1 overflow-hidden">
            <div className={titleClass}>{title}</div>
          </div>

          <div className="content-header-section flex-shrink-0">
            <div className="v2board-header-actions">
              <button
                type="button"
                className={headerButtonClass}
                onClick={() => {
                  const nextValue = !darkMode
                  setDarkModeEnabled(nextValue)
                  setDarkMode(nextValue)
                }}
              >
                {darkMode ? <i className="far fa fa-moon" /> : <i className="far fa fa-sun" />}
              </button>

              <div className="dropdown d-inline-block" ref={avatarRef}>
                <button
                  type="button"
                  className={headerButtonClass}
                  id="page-header-user-dropdown"
                  aria-haspopup="true"
                  aria-expanded={avatarMenuOpen}
                  onClick={() => setAvatarMenuOpen((value) => !value)}
                >
                  {userInfo?.avatar_url ? (
                    <img className="v2board-admin-avatar" src={String(userInfo.avatar_url)} alt={userInfo.email} />
                  ) : (
                    <i className="far fa fa-user-circle" />
                  )}
                  <span className="d-none d-lg-inline ml-1">{userInfo?.email}</span>
                  <i className="fa fa-fw fa-angle-down ml-1" />
                </button>

                <div
                  className={`dropdown-menu dropdown-menu-right dropdown-menu-lg p-0 font-size-sm ${
                    avatarMenuOpen ? 'show' : ''
                  }`}
                  aria-labelledby="page-header-user-dropdown"
                >
                  <div className="p-2">
                    <div className="dropdown-header text-left px-2 pt-1 pb-2">
                      <div className="font-w600 text-black">{userInfo?.email ?? '管理员'}</div>
                    </div>
                    <button
                      type="button"
                      className="dropdown-item d-flex justify-content-between align-items-center"
                      onClick={() => {
                        logout()
                        closeNav()
                        navigate('/login', { replace: true })
                      }}
                    >
                      <span>登出</span>
                      <i className="fa fa-fw fa-sign-out-alt text-danger ml-1" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main id="main-container">
        <div className="content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
