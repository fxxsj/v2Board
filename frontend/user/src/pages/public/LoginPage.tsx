import type { AxiosError } from 'axios'
import { message } from 'antd'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { loginWithPassword, token2Login } from '@/api/auth'
import { AUTH_TOKEN_STORAGE_KEY, useAuthStore } from '@/stores/auth'
import { useEffect, useState } from 'react'
import AuthShell from '@/components/AuthShell'
import i18n from '@/i18n'

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const setToken = useAuthStore((state) => state.setToken)
  const token = useAuthStore((state) => state.token)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  useEffect(() => {
    const verify = searchParams.get('verify')
    const redirect = searchParams.get('redirect') || 'dashboard'

    if (!verify) {
      if (token) {
        navigate(`/${redirect.replace(/^\//, '')}`, { replace: true })
      }
      return
    }

    const run = async () => {
      try {
        const response = await token2Login({ verify, redirect })
        localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, response.auth_data)
        setToken(response.auth_data)
        message.success(i18n.t('登录成功'))
        navigate(`/${redirect.replace(/^\//, '')}`)
      } catch (error) {
        const axiosError = error as AxiosError<{ message?: string }>
        const errorMessage = axiosError.response?.data?.message || axiosError.message || i18n.t('登录失败')
        message.error(errorMessage)
      }
    }

    void run()
  }, [navigate, searchParams, setToken, token])

  const handleLogin = async () => {
    if (loginLoading) return
    try {
      const redirect = searchParams.get('redirect')
      if (!email.trim()) {
        message.error(i18n.t('请输入邮箱'))
        return
      }
      if (!password.trim()) {
        message.error(i18n.t('请输入密码'))
        return
      }
      setLoginLoading(true)
      const response = await loginWithPassword({ email: email.trim(), password })
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, response.auth_data)
      setToken(response.auth_data)
      message.success(i18n.t('登录成功'))
      if (redirect) {
        navigate(`/${redirect.replace(/^\//, '')}`)
        return
      }
      navigate('/dashboard')
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>
      const errorMessage = axiosError.response?.data?.message || axiosError.message || i18n.t('登录失败')
      message.error(errorMessage)
    } finally {
      setLoginLoading(false)
    }
  }

  return (
    <AuthShell
      footerLeft={
        <>
          <Link to="/register" className="font-size-sm text-muted">
            {i18n.t('注册')}
          </Link>
          <span className="link-divider" />
          <Link to="/forgetpassword" className="font-size-sm text-muted">
            {i18n.t('忘记密码')}
          </Link>
        </>
      }
    >
        <div className="form-group">
          <input
            type="text"
            className="form-control form-control-alt"
            placeholder={i18n.t('邮箱')}
            value={email}
            onChange={(event) => setEmail((event.target as HTMLInputElement).value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void handleLogin()
            }}
            autoComplete="email"
          />
        </div>
        <div className="form-group">
          <input
            type="password"
            className="form-control form-control-alt"
            placeholder={i18n.t('密码')}
            value={password}
            onChange={(event) => setPassword((event.target as HTMLInputElement).value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void handleLogin()
            }}
            autoComplete="current-password"
          />
        </div>
        <div className="form-group mb-0">
          <button
            disabled={loginLoading}
            type="button"
            className="btn btn-block btn-primary font-w400"
            onClick={() => void handleLogin()}
          >
            {loginLoading ? (
              <div className="spinner-grow text-white" role="status" aria-label="Loading">
                <span className="sr-only">{i18n.t('加载中...')}</span>
              </div>
            ) : (
              <span>
                <i className="si si-login mr-1" />
                {i18n.t('登入')}
              </span>
            )}
          </button>
        </div>
      </AuthShell>
  )
}
