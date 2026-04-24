import { Alert, Button } from 'antd'
import { useEffect, useRef, useState } from 'react'
import i18n from '@/i18n'

declare global {
  interface Window {
    Stripe?: (pk: string) => {
      elements: () => {
        create: (type: 'card', options?: Record<string, unknown>) => {
          mount: (el: HTMLElement) => void
          unmount: () => void
          destroy: () => void
        }
      }
      createToken: (card: unknown) => Promise<{ token?: { id: string }; error?: { message?: string } }>
    }
  }
}

let stripeScriptPromise: Promise<void> | null = null

function loadStripeScript() {
  if (stripeScriptPromise) return stripeScriptPromise
  stripeScriptPromise = new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') {
      resolve()
      return
    }
    if (window.Stripe) {
      resolve()
      return
    }
    const existing = document.querySelector<HTMLScriptElement>('script[data-stripe="true"]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error(i18n.t('Stripe.js 未加载'))))
      return
    }
    const script = document.createElement('script')
    script.src = 'https://js.stripe.com/v3/'
    script.async = true
    script.dataset.stripe = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(i18n.t('Stripe.js 未加载')))
    document.head.appendChild(script)
  })
  return stripeScriptPromise
}

export interface StripeCardFormProps {
  pk: string
  onToken: (tokenId: string) => void
}

export default function StripeCardForm({ pk, onToken }: StripeCardFormProps) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const cardRef = useRef<{ unmount: () => void; destroy: () => void } | null>(null)
  const stripeRef = useRef<ReturnType<NonNullable<typeof window.Stripe>> | null>(null)

  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoadError(null)
    setReady(false)

    const init = async () => {
      try {
        await loadStripeScript()
        if (cancelled) return
        if (!window.Stripe) throw new Error(i18n.t('Stripe.js 未加载'))
        if (!mountRef.current) return

        const stripe = window.Stripe(pk)
        stripeRef.current = stripe
        const elements = stripe.elements()
        const card = elements.create('card')
        card.mount(mountRef.current)
        cardRef.current = card
        setReady(true)
      } catch (e) {
        if (!cancelled) setLoadError((e as Error).message || i18n.t('Stripe 初始化失败'))
      }
    }

    void init()

    return () => {
      cancelled = true
      try {
        cardRef.current?.unmount()
        cardRef.current?.destroy()
      } catch {
      }
      cardRef.current = null
      stripeRef.current = null
    }
  }, [pk])

  const handleTokenize = async () => {
    if (!stripeRef.current || !cardRef.current) return
    setLoading(true)
    try {
      const result = await stripeRef.current.createToken(cardRef.current)
      if (result.error) {
        throw new Error(result.error.message || i18n.t('信用卡信息有误'))
      }
      const tokenId = result.token?.id
      if (!tokenId) throw new Error(i18n.t('未获取到 Stripe token'))
      onToken(tokenId)
    } catch (e) {
      setLoadError((e as Error).message || i18n.t('信用卡信息有误'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {loadError ? <Alert type="error" showIcon message={loadError} style={{ marginBottom: 12 }} /> : null}
      <div
        ref={mountRef}
        style={{
          border: '1px solid var(--surface-border)',
          borderRadius: 8,
          padding: '10px 12px',
          minHeight: 44,
          background: 'var(--surface-strong)',
          color: 'var(--text-primary)',
          marginBottom: 12,
        }}
      />
      <Button type="primary" block onClick={() => void handleTokenize()} disabled={!ready} loading={loading}>
        {i18n.t('确认信用卡信息')}
      </Button>
    </div>
  )
}
