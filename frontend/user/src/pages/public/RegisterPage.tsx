import type { AxiosError } from 'axios'
import { message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { register, sendEmailVerify } from '@/api/auth'
import { useBootstrapStore } from '@/stores/bootstrap'
import { AUTH_TOKEN_STORAGE_KEY, useAuthStore } from '@/stores/auth'
import AuthShell from '@/components/AuthShell'
import RecaptchaAction from '@/components/RecaptchaAction'
import i18n from '@/i18n'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const setToken = useAuthStore((state) => state.setToken)
  const guestConfig = useBootstrapStore((state) => state.guestConfig)

  const isInviteForce = Boolean(guestConfig?.is_invite_force)
  const isEmailVerify = Boolean(guestConfig?.is_email_verify)
  const isRecaptcha = Boolean(guestConfig?.is_recaptcha)
  const siteKey = guestConfig?.recaptcha_site_key ?? null
  const tosUrl = guestConfig?.tos_url ?? null

  const [sending, setSending] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  const emailWhitelistSuffixes = useMemo(() => {
    const suffixes = guestConfig?.email_whitelist_suffix
    return Array.isArray(suffixes) ? suffixes.filter((item) => typeof item === 'string' && item) : []
  }, [guestConfig?.email_whitelist_suffix])
  const emailWhitelistEnabled = emailWhitelistSuffixes.length > 0

  const initialInvite = searchParams.get('code') || searchParams.get('invite_code') || ''
  const inviteLocked = Boolean(searchParams.get('code'))

  const [email, setEmail] = useState('')
  const [emailLocal, setEmailLocal] = useState('')
  const [emailSuffix, setEmailSuffix] = useState(emailWhitelistSuffixes[0] ?? '')
  const [emailCode, setEmailCode] = useState('')
  const [password, setPassword] = useState('')
  const [rePassword, setRePassword] = useState('')
  const [inviteCode, setInviteCode] = useState(initialInvite)
  const [tosChecked, setTosChecked] = useState(false)

  useEffect(() => {
    setInviteCode(initialInvite)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialInvite])

  useEffect(() => {
    if (!emailWhitelistEnabled) return
    if (emailSuffix) return
    setEmailSuffix(emailWhitelistSuffixes[0] ?? '')
  }, [emailSuffix, emailWhitelistEnabled, emailWhitelistSuffixes])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setInterval(() => {
      setCooldown((prev) => Math.max(prev - 1, 0))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  const getEmailValue = () => {
    if (emailWhitelistEnabled) {
      const local = emailLocal.trim()
      const suffix = (emailSuffix || emailWhitelistSuffixes[0] || '').trim()
      return local && suffix ? `${local}@${suffix}` : ''
    }
    return email.trim()
  }

  const validateEmail = () => {
    const value = getEmailValue()
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
        isforget: 0,
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

  const handleRegister = async (recaptchaToken?: string) => {
    if (submitLoading) return

    const value = validateEmail()
    if (!value) return

    if (isEmailVerify && !emailCode.trim()) {
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

    if (isInviteForce && !inviteCode.trim()) {
      message.error(i18n.t('请输入邀请码'))
      return
    }

    if (tosUrl && !tosChecked) {
      message.error(i18n.t('请同意服务条款'))
      return
    }

    setSubmitLoading(true)
    try {
      const response = await register({
        email: value,
        password,
        invite_code: inviteCode.trim() || undefined,
        email_code: isEmailVerify ? emailCode.trim() : undefined,
        recaptcha_data: isRecaptcha && siteKey ? recaptchaToken : undefined,
      })
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, response.auth_data)
      setToken(response.auth_data)
      message.success(i18n.t('注册成功'))
      navigate('/dashboard')
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>
      message.error(axiosError.response?.data?.message || i18n.t('注册失败'))
    } finally {
      setSubmitLoading(false)
    }
  }

  return (
    <AuthShell
      footerLeft={
        <Link to="/login" className="font-size-sm text-muted">
          {i18n.t('返回登入')}
        </Link>
      }
    >
      <div>
        <div className={`form-group ${emailWhitelistEnabled ? 'v2board-email-whitelist-enable' : ''}`}>
          {emailWhitelistEnabled ? (
            <>
              <input
                type="text"
                className="form-control form-control-alt"
                placeholder={i18n.t('邮箱')}
                value={emailLocal}
                onChange={(event) => setEmailLocal((event.target as HTMLInputElement).value)}
                autoComplete="email"
              />
              <select
                className="form-control form-control-alt"
                value={emailSuffix}
                onChange={(event) => setEmailSuffix((event.target as HTMLSelectElement).value)}
              >
                {emailWhitelistSuffixes.map((suffix) => (
                  <option key={suffix} value={suffix}>
                    @{suffix}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <input
              type="text"
              className="form-control form-control-alt"
              placeholder={i18n.t('邮箱')}
              value={email}
              onChange={(event) => setEmail((event.target as HTMLInputElement).value)}
              autoComplete="email"
            />
          )}
        </div>

        {isEmailVerify ? (
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
        ) : null}

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

        <div className="form-group">
          <input
            type="text"
            className="form-control form-control-alt"
            placeholder={isInviteForce ? i18n.t('邀请码') : i18n.t('邀请码(选填)')}
            value={inviteCode}
            disabled={inviteLocked}
            onChange={(event) => setInviteCode((event.target as HTMLInputElement).value)}
          />
        </div>

        {tosUrl ? (
          <div className="form-group">
            <div className="custom-control custom-checkbox custom-control-primary">
              <input
                id="tos-agree"
                type="checkbox"
                className="custom-control-input"
                checked={tosChecked}
                onChange={(event) => setTosChecked(Boolean((event.target as HTMLInputElement).checked))}
              />
              <label className="custom-control-label" htmlFor="tos-agree">
                {i18n.t('我已阅读并同意')}{' '}
                <a href={tosUrl} target="_blank" rel="noreferrer">
                  {i18n.t('服务条款')}
                </a>
              </label>
            </div>
          </div>
        ) : null}

        <div className="form-group mb-0">
          <RecaptchaAction
            enabled={Boolean(isRecaptcha) && Boolean(siteKey)}
            siteKey={siteKey}
            onToken={async (token) => {
              await handleRegister(token)
            }}
          >
            <button type="button" className="btn btn-block btn-primary font-w400" disabled={submitLoading}>
              {submitLoading ? (
                <div className="spinner-grow text-white" role="status" aria-label="Loading">
                  <span className="sr-only">{i18n.t('加载中...')}</span>
                </div>
              ) : (
                <span>
                  <i className="si si-emoticon-smile mr-1" />
                  {i18n.t('注册')}
                </span>
              )}
            </button>
          </RecaptchaAction>
        </div>
      </div>
    </AuthShell>
  )
}
