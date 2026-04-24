import { useEffect, useMemo, useState } from 'react'
import { BREAKPOINTS } from '@/config/responsive'

export function useResponsive() {
  const getWidth = () => (typeof window === 'undefined' ? BREAKPOINTS.desktop : window.innerWidth)

  const [width, setWidth] = useState<number>(getWidth)

  useEffect(() => {
    const handler = () => setWidth(getWidth())
    handler()
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  return useMemo(() => {
    const isMobile = width <= BREAKPOINTS.mobile
    const isTablet = width <= BREAKPOINTS.tablet
    const isDesktop = width > BREAKPOINTS.tablet
    return { width, isMobile, isTablet, isDesktop }
  }, [width])
}
