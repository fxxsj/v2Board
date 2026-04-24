export function buildHashUrl(hashPath: string) {
  const base =
    typeof window !== 'undefined' && typeof (window as any).routerBase === 'string'
      ? (window as any).routerBase
      : '/'
  const normalizedBase = base.startsWith('/') ? base : `/${base}`
  const pathname = normalizedBase.endsWith('/') ? normalizedBase : `${normalizedBase}/`
  const url = new URL(pathname, window.location.origin)
  url.hash = hashPath.startsWith('#') ? hashPath.slice(1) : hashPath
  return url.toString()
}
