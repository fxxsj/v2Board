export const BREAKPOINTS = {
  desktop: 1200,
  tablet: 991,
  mobile: 768,
} as const

export const MEDIA_QUERIES = {
  desktopDown: `(max-width: ${BREAKPOINTS.desktop}px)`,
  tabletDown: `(max-width: ${BREAKPOINTS.tablet}px)`,
  mobileDown: `(max-width: ${BREAKPOINTS.mobile}px)`,
} as const
