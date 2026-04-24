import { useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'

export default function HomePage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const legacyHomepage = useMemo(() => {
    if (typeof window === 'undefined') {
      return null
    }

    const raw = (window as any)?.settings?.homepage
    if (!raw || typeof raw !== 'string') {
      return null
    }

    try {
      return decodeURI(window.atob(raw))
    } catch {
      return null
    }
  }, [])

  if (!legacyHomepage) {
    return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />
  }

  return <div dangerouslySetInnerHTML={{ __html: legacyHomepage }} />
}
