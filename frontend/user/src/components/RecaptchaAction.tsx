import { cloneElement, useCallback, useEffect, useRef, useState, type ReactElement } from 'react'

declare global {
  interface Window {
    grecaptcha?: {
      render: (
        container: HTMLElement,
        params: {
          sitekey: string
          size?: 'invisible'
          callback: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
        }
      ) => number
      execute: (widgetId?: number) => void
      reset: (widgetId?: number) => void
    }
  }
}

let scriptPromise: Promise<void> | null = null

function loadRecaptchaScript() {
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') {
      resolve()
      return
    }
    if (window.grecaptcha) {
      resolve()
      return
    }
    const existing = document.querySelector<HTMLScriptElement>('script[data-recaptcha="true"]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Failed to load reCAPTCHA')))
      return
    }
    const script = document.createElement('script')
    script.src = 'https://www.google.com/recaptcha/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.dataset.recaptcha = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load reCAPTCHA'))
    document.head.appendChild(script)
  })
  return scriptPromise
}

export interface RecaptchaActionProps {
  enabled: boolean
  siteKey: string | null | undefined
  onToken: (token?: string) => void | Promise<void>
  children: ReactElement<{
    onClick?: () => void
    disabled?: boolean
    loading?: boolean
  }>
}

export default function RecaptchaAction({ enabled, siteKey, onToken, children }: RecaptchaActionProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<number | null>(null)
  const resolverRef = useRef<((token: string) => void) | null>(null)
  const rejecterRef = useRef<((error: Error) => void) | null>(null)
  const [recaptchaLoading, setRecaptchaLoading] = useState(false)

  const ensureWidget = useCallback(async () => {
    if (!enabled || !siteKey) return
    await loadRecaptchaScript()
    if (!containerRef.current || !window.grecaptcha) return

    if (widgetIdRef.current != null) {
      window.grecaptcha.reset(widgetIdRef.current)
      return
    }

    widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
      sitekey: siteKey,
      size: 'invisible',
      callback: (token: string) => {
        resolverRef.current?.(token)
        resolverRef.current = null
        rejecterRef.current = null
        if (widgetIdRef.current != null) {
          window.grecaptcha?.reset(widgetIdRef.current)
        }
      },
      'expired-callback': () => {
        rejecterRef.current?.(new Error('reCAPTCHA expired'))
        resolverRef.current = null
        rejecterRef.current = null
      },
      'error-callback': () => {
        rejecterRef.current?.(new Error('reCAPTCHA error'))
        resolverRef.current = null
        rejecterRef.current = null
      },
    })
  }, [enabled, siteKey])

  useEffect(() => {
    // reset on toggles
    resolverRef.current = null
    rejecterRef.current = null
  }, [enabled, siteKey])

  const run = useCallback(async () => {
    if (!enabled || !siteKey) {
      await onToken(undefined)
      return
    }

    setRecaptchaLoading(true)
    try {
      await ensureWidget()
      if (!window.grecaptcha || widgetIdRef.current == null) {
        await onToken(undefined)
        return
      }

      const token = await new Promise<string>((resolve, reject) => {
        resolverRef.current = resolve
        rejecterRef.current = reject
        window.grecaptcha?.execute(widgetIdRef.current ?? undefined)
      })

      await onToken(token)
    } finally {
      setRecaptchaLoading(false)
    }
  }, [enabled, ensureWidget, onToken, siteKey])

  const disabled = Boolean(children.props.disabled) || recaptchaLoading
  const loading = Boolean(children.props.loading) || recaptchaLoading

  return (
    <>
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          width: 0,
          height: 0,
          overflow: 'hidden',
          opacity: 0,
          pointerEvents: 'none',
        }}
      />
      {cloneElement(children, {
        disabled,
        loading,
        onClick: () => {
          void run().catch(() => {
            // Silently ignore reCAPTCHA failures; the caller can show a toast if needed.
          })
        },
      })}
    </>
  )
}
