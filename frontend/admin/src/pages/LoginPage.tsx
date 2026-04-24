import { useEffect, useState } from 'react'
import { Modal } from 'antd'
import { useNavigate } from 'react-router-dom'
import { appConfig } from '@/config/app'
import { useAuthStore } from '@/stores/auth'

export function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const bootstrap = useAuthStore((state) => state.bootstrap)
  const loginLoading = useAuthStore((state) => state.loginLoading)
  const authenticated = useAuthStore((state) => state.authenticated)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    bootstrap().then((ok) => {
      if (ok) {
        navigate('/dashboard', { replace: true })
      }
    })
  }, [bootstrap, navigate])

  useEffect(() => {
    if (authenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [authenticated, navigate])

  const submit = async () => {
    const success = await login(email, password)
    if (success) {
      navigate('/dashboard', { replace: true })
    }
  }

  return (
    <div id="page-container">
      <main id="main-container">
        <div
          className="v2board-background"
          style={{
            backgroundImage: appConfig.backgroundUrl ? `url(${appConfig.backgroundUrl})` : undefined,
          }}
        />

        <div className="no-gutters v2board-auth-box">
          <div style={{ maxWidth: 450, width: '100%', margin: 'auto' }}>
            <div className="mx-2 mx-sm-0">
              <div
                className="block block-rounded block-transparent block-fx-pop w-100 mb-0 overflow-hidden bg-image"
                style={{ boxShadow: '0 0.5rem 2rem #0000000d' }}
              >
                <div className="row no-gutters">
                  <div className="col-md-12 order-md-1 bg-white">
                    <div className="block-content block-content-full px-lg-4 py-md-4 py-lg-4">
                      <div className="mb-3 text-center">
                        <a className="font-size-h1" href="javascript:void(0);">
                          {appConfig.logo ? (
                            <img className="v2board-logo mb-3" src={appConfig.logo} alt={appConfig.appName} />
                          ) : (
                            <span className="text-dark">{appConfig.appName}</span>
                          )}
                        </a>
                        <p className="font-size-sm text-muted mb-3">登录到管理中心</p>
                      </div>

                      <div className="form-group">
                        <input
                          type="text"
                          className="form-control form-control-alt"
                          placeholder="邮箱"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          onKeyDown={(event) => event.key === 'Enter' && submit()}
                        />
                      </div>

                      <div className="form-group">
                        <input
                          type="password"
                          className="form-control form-control-alt"
                          placeholder="密码"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          onKeyDown={(event) => event.key === 'Enter' && submit()}
                        />
                      </div>

                      <div className="form-group mb-0">
                        <button
                          disabled={loginLoading}
                          type="button"
                          className="btn btn-block btn-primary font-w400"
                          onClick={submit}
                        >
                          {loginLoading ? (
                            <span className="spinner-border spinner-border-sm" />
                          ) : (
                            <span>
                              <i className="si si-login mr-1" />
                              登录
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center bg-gray-lighter p-3 px-4">
                  <button
                    type="button"
                    className="v2board-link-button"
                    onClick={() =>
                      Modal.info({
                        title: '忘记密码',
                        content: (
                          <div>
                            <div>在站点目录下执行命令找回密码</div>
                            <code>php artisan reset:password 管理员邮箱</code>
                          </div>
                        ),
                        centered: true,
                        okText: '我知道了',
                      })
                    }
                  >
                    忘记密码
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
