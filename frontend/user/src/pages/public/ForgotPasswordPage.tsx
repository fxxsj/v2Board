import type { AxiosError } from 'axios'
import { message } from 'antd'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { resetPassword, sendEmailVerify } from '@/api/auth'
import { useBootstrapStore } from '@/stores/bootstrap'
import AuthShell from '@/components/AuthShell'
import RecaptchaAction from '@/components/RecaptchaAction'
import i18n from '@/i18n'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const guestConfig = useBootstrapStore((state) => state.guestConfig)
  const isRecaptcha = Boolean(guestConfig?.is_recaptcha)
  const siteKey = guestConfig?.recaptcha_site_key ?? null

  const [email, setEmail] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [password, setPassword] = useState('')
  const [rePassword, setRePassword] = useState('')

  const [sending, setSending] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setInterval(() => {
      setCooldown((prev) => Math.max(prev - 1, 0))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  const validateEmail = () => {
    const value = email.trim()
    if (!value) {
      message.error(i18n.t('请输入邮箱'))
      return null
    }
    if (!value.includes('@') || value.startsWith('@') || value.endsWith('@')) {
      message.error(i18n.t('邮箱格式不正确'))
      return null
    }
    return value
  }

  const handleSendCode = async (recaptchaToken?: string) => {
    const value = validateEmail()
    if (!value) return
    if (sending) return
    setSending(true)
    try {
      await sendEmailVerify({
        email: value,
        isforget: 1,
        recaptcha_data: isRecaptcha && siteKey ? recaptchaToken : undefined,
      })
      message.success(i18n.t('验证码已发送'))
      setCooldown(60)
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>
      message.error(axiosError.response?.data?.message || axiosError.message || i18n.t('发送失败'))
    } finally {
      setSending(false)
    }
  }

  const handleReset = async () => {
    if (submitLoading) return
    const value = validateEmail()
    if (!value) return

    if (!emailCode.trim()) {
      message.error(i18n.t('请输入邮箱验证码'))
      return
    }

    if (!password.trim()) {
      message.error(i18n.t('请输入密码'))
      return
    }

    if (!rePassword.trim()) {
      message.error(i18n.t('请输入密码'))
      return
    }

    if (password !== rePassword) {
      message.error(i18n.t('两次密码输入不同'))
      return
    }

    setSubmitLoading(true)
    try {
      await resetPassword({
        email: value,
        password,
        email_code: emailCode.trim(),
      })
      message.success(i18n.t('密码已重置，请重新登录'))
      navigate('/login')
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>
      message.error(axiosError.response?.data?.message || i18n.t('重置失败'))
    } finally {
      setSubmitLoading(false)
    }
  }

  return (
    <AuthShell
      footerLeft={
        <>
          <Link to="/login" className="font-size-sm text-muted">
            {i18n.t('返回登入')}
          </Link>
          <span className="link-divider" />
          <Link to="/register" className="font-size-sm text-muted">
            {i18n.t('注册')}
          </Link>
        </>
      }
    >
      <div>
        <div className="form-group">
          <input
            type="text"
            className="form-control form-control-alt"
            placeholder={i18n.t('邮箱')}
            value={email}
            onChange={(event) => setEmail((event.target as HTMLInputElement).value)}
            autoComplete="email"
          />
        </div>

        <div className="form-group form-row">
          <div className="col-9">
            <input
              type="text"
              className="form-control form-control-alt"
              placeholder={i18n.t('邮箱验证码')}
              value={emailCode}
              onChange={(event) => setEmailCode((event.target as HTMLInputElement).value)}
              autoComplete="one-time-code"
            />
          </div>
          <div className="col-3">
            <RecaptchaAction
              enabled={Boolean(isRecaptcha) && Boolean(siteKey)}
              siteKey={siteKey}
              onToken={async (token) => {
                await handleSendCode(token)
              }}
            >
              <button
                type="button"
                disabled={cooldown > 0 || sending}
                className="btn btn-block btn-primary font-w400"
              >
                {cooldown > 0 ? `${cooldown}s` : sending ? '...' : i18n.t('发送')}
              </button>
            </RecaptchaAction>
          </div>
        </div>

        <div className="form-group">
          <input
            type="password"
            className="form-control form-control-alt"
            placeholder={i18n.t('密码')}
            value={password}
            onChange={(event) => setPassword((event.target as HTMLInputElement).value)}
            autoComplete="new-password"
          />
        </div>

        <div className="form-group">
          <input
            type="password"
            className="form-control form-control-alt"
            placeholder={i18n.t('密码')}
            value={rePassword}
            onChange={(event) => setRePassword((event.target as HTMLInputElement).value)}
            autoComplete="new-password"
          />
        </div>

        <div className="form-group mb-0">
          <button type="button" className="btn btn-block btn-primary font-w400" disabled={submitLoading} onClick={() => void handleReset()}>
            {submitLoading ? (
              <div className="spinner-grow text-white" role="status" aria-label="Loading">
                <span className="sr-only">{i18n.t('加载中...')}</span>
              </div>
            ) : (
              <span>
                <i className="si si-support mr-1" />
                {i18n.t('重置密码')}
              </span>
            )}
          </button>
        </div>
      </div>
    </AuthShell>
  )
}
