import { useEffect, useRef, useState } from 'react'

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

export interface RecaptchaWidgetProps {
  siteKey: string
  onChange: (token: string | null) => void
}

export default function RecaptchaWidget({ siteKey, onChange }: RecaptchaWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<number | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoadError(null)
    onChange(null)

    const init = async () => {
      try {
        await loadRecaptchaScript()
        if (cancelled) return
        if (!containerRef.current || !window.grecaptcha) return
        if (widgetIdRef.current != null) {
          window.grecaptcha.reset(widgetIdRef.current)
        } else {
          widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
            sitekey: siteKey,
            callback: (token: string) => onChange(token),
            'expired-callback': () => onChange(null),
          })
        }
      } catch (e) {
        if (!cancelled) setLoadError((e as Error).message || 'Failed to load reCAPTCHA')
      }
    }

    void init()

    return () => {
      cancelled = true
    }
  }, [siteKey, onChange])

  if (loadError) {
    return <div style={{ color: '#ff4d4f' }}>{loadError}</div>
  }

  return <div ref={containerRef} />
}
