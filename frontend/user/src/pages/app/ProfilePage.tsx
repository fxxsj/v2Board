import type { AxiosError } from 'axios'
import { Button, Modal, Switch, message } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'
import { cloneElement, useEffect, useState, type ReactElement } from 'react'
import { useNavigate } from 'react-router-dom'
import { createOrder } from '@/api/order'
import i18n from '@/i18n'
import {
  changePassword,
  getTelegramBotInfo,
  getUserConfig,
  getUserInfo,
  getUserSubscribe,
  redeemGiftcard,
  resetSecurity,
  unbindTelegram,
  updateUser,
  type UserConfig,
  type UserInfo,
  type UserSubscribe,
} from '@/api/user'

interface ProfileData {
  config: UserConfig
  info: UserInfo
  subscribe: UserSubscribe
}

const copyToClipboard = async (text: string) => {
  try {
    if (window.isSecureContext && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // ignore
  }
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', 'true')
    textarea.style.position = 'fixed'
    textarea.style.top = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}

function TelegramBindModal({ subscribeUrl, children }: { subscribeUrl: string; children: ReactElement }) {
  const [visible, setVisible] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    const next = !visible
    setVisible(next)
    if (!next) return
    setLoading(true)
    try {
      const info = await getTelegramBotInfo()
      setUsername(info?.username ?? null)
    } catch {
      setUsername(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {cloneElement(children, {
        onClick: () => {
          void toggle()
        },
      })}
      <Modal
        open={visible}
        onCancel={() => void toggle()}
        onOk={() => void toggle()}
        okText={i18n.t('我知道了')}
        cancelButtonProps={{ hidden: true }}
        title={i18n.t('绑定Telegram')}
      >
        {username ? (
          <>
            <h2 className="content-heading pt-1">
              <i className="fa fa-arrow-right text-info mr-1" /> {i18n.t('第一步')}
            </h2>
            <div>
              {i18n.t('打开Telegram搜索')}
              <a href={`https://t.me/${username}`}>@{username}</a>
            </div>
            <h2 className="content-heading">
              <i className="fa fa-arrow-right text-info mr-1" /> {i18n.t('第二步')}
            </h2>
            <div>
              {i18n.t('向机器人发送你的')}
              <br />
              <code
                onClick={() => {
                  void (async () => {
                    const ok = await copyToClipboard(`/bind ${subscribeUrl}`)
                    if (ok) message.success(i18n.t('复制成功'))
                    else message.error(i18n.t('复制失败'))
                  })()
                }}
                style={{ cursor: 'pointer' }}
              >
                /bind {subscribeUrl}
              </code>
            </div>
          </>
        ) : loading ? (
          <LoadingOutlined style={{ fontSize: 16 }} />
        ) : (
          <LoadingOutlined style={{ fontSize: 16 }} />
        )}
      </Modal>
    </>
  )
}

const formatCurrency = (value: number | null | undefined, config: UserConfig | null) => {
  if (value == null) return '--.--'
  void config
  return (value / 100).toFixed(2)
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [giftcardValue, setGiftcardValue] = useState('')
  const [giftcardLoading, setGiftcardLoading] = useState(false)

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [rePassword, setRePassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  const [preferenceLoading, setPreferenceLoading] = useState<string | null>(null)

  const loadProfile = async () => {
    const [config, info, subscribe] = await Promise.all([getUserConfig(), getUserInfo(), getUserSubscribe()])
    setData({ config, info, subscribe })
  }

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      setLoading(true)
      setError(null)
      try {
        await loadProfile()
      } catch (e) {
        const axiosError = e as AxiosError<{ message?: string }>
        if (!cancelled) setError(axiosError.response?.data?.message || axiosError.message || i18n.t('加载失败'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void init()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleToggle = async (key: 'auto_renewal' | 'remind_expire' | 'remind_traffic', checked: boolean) => {
    if (!data) return
    setPreferenceLoading(key)
    try {
      await updateUser({ [key]: checked ? 1 : 0 })
      setData({
        ...data,
        info: {
          ...data.info,
          [key]: checked ? 1 : 0,
        },
      })
    } catch (e) {
      const axiosError = e as AxiosError<{ message?: string }>
      message.error(axiosError.response?.data?.message || i18n.t('更新失败'))
    } finally {
      setPreferenceLoading(null)
    }
  }

  const handleDeposit = () => {
    if (!data) return
    const currency = data.config.currency ?? ''
    let depositAmountCents = 0

    Modal.confirm({
      title: (
        <input
          className="form-control"
          placeholder={`${i18n.t('请输入充值金额')}${currency}`}
          onChange={(event) => {
            const amount = Number((event.target as HTMLInputElement).value)
            depositAmountCents = Number.isFinite(amount) ? Math.round(amount * 100) : 0
          }}
          autoComplete="one-time-code"
          type="number"
        />
      ),
      okText: i18n.t('确认'),
      cancelText: i18n.t('取消'),
      onOk: async () => {
        const tradeNo = await createOrder(0, 'deposit', undefined, depositAmountCents)
        navigate(`/order?trade_no=${encodeURIComponent(tradeNo)}`)
      },
    })
  }

  const handleRedeemGiftcard = async () => {
    if (!giftcardValue.length) {
      message.error(i18n.t('请输入礼品卡'))
      return
    }
    setGiftcardLoading(true)
    try {
      await redeemGiftcard(giftcardValue)
      message.success(i18n.t('兑换成功'))
      setGiftcardValue('')
      await loadProfile()
    } catch (e) {
      const axiosError = e as AxiosError<{ message?: string }>
      message.error(axiosError.response?.data?.message || i18n.t('兑换失败'))
    } finally {
      setGiftcardLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPassword !== rePassword) {
      message.error(i18n.t('两次新密码输入不同'))
      return
    }

    setPasswordLoading(true)
    try {
      await changePassword({ old_password: oldPassword, new_password: newPassword })
      message.success(i18n.t('密码修改成功'))
      setOldPassword('')
      setNewPassword('')
      setRePassword('')
    } catch (e) {
      const axiosError = e as AxiosError<{ message?: string }>
      message.error(axiosError.response?.data?.message || i18n.t('修改失败'))
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleResetSecurity = async () => {
    Modal.confirm({
      title: i18n.t('确定要重置订阅信息？'),
      content: i18n.t('如果你的订阅地址或信息泄露可以进行此操作。重置后你的UUID及订阅将会变更，需要重新进行订阅。'),
      okText: i18n.t('确认'),
      cancelText: i18n.t('取消'),
      onOk: async () => {
        await resetSecurity()
        message.success(i18n.t('重置成功'))
        await loadProfile()
      },
    })
  }

  const handleUnbindTelegram = async () => {
    Modal.confirm({
      title: i18n.t('确定要解除绑定Telegram？'),
      content: i18n.t('如果你的Telegram ID已失效可以进行此操作。重置后你需要重新进行绑定。'),
      okText: i18n.t('确认'),
      cancelText: i18n.t('取消'),
      onOk: async () => {
        await unbindTelegram()
        message.success(i18n.t('重置成功'))
        await loadProfile()
      },
    })
  }

  const currency = data?.config.currency ?? ''
  const discussLink = data?.config.telegram_discuss_link ?? null
  const canTelegram = Boolean(data?.config.is_telegram)
  const subscribeUrl = data?.subscribe.subscribe_url ?? null

  return (
    <>
      {loading ? (
        <div className="spinner-grow text-primary" role="status" aria-label="Loading">
          <span className="sr-only">{i18n.t('加载中...')}</span>
        </div>
      ) : null}
      {!loading && error ? (
        <div className="alert alert-danger" role="alert">
          <p className="mb-0">{error}</p>
        </div>
      ) : null}

      {!loading && !error && data ? (
        <>
          {/* 钱包 */}
          <div className="row mb-3 mb-md-0">
            <div className="col-lg-12">
              <div className="block">
                <div className="block-content pb-3">
                  <i className="fa fa-wallet fa-2x text-gray-light float-right" />
                  <div className="pb-sm-3">
                    <p className="text-muted w-75">{i18n.t('我的钱包(仅消费)')}</p>
                    <p className="display-4 text-black font-w300 mb-2">
                      {formatCurrency(data.info.balance, data.config)}
                      <span className="font-size-h5 text-muted ml-4">{currency}</span>
                    </p>
                    <span className="text-muted" style={{ cursor: 'pointer' }}>
                      {i18n.t('自动续费')}{' '}
                      <Switch
                        checked={Boolean(data.info.auto_renewal)}
                        loading={preferenceLoading === 'auto_renewal'}
                        onChange={(checked) => void handleToggle('auto_renewal', checked)}
                      />
                    </span>
                    <div className="pt-3">
                      <Button type="primary" onClick={handleDeposit}>
                        {i18n.t('充值')}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 礼品卡 */}
          <div className="row mb-3 mb-md-0">
            <div className="col-md-12">
              <div className="block block-rounded">
                <div className="block-header block-header-default">
                  <h3 className="block-title">{i18n.t('礼品卡')}</h3>
                </div>
                <div className="block-content">
                  <div className="row push">
                    <div className="col-lg-8 col-xl-5">
                      <div className="form-group">
                        <input
                          className="form-control"
                          value={giftcardValue}
                          onChange={(event) => setGiftcardValue((event.target as HTMLInputElement).value)}
                          placeholder={i18n.t('请输入礼品卡')}
                          autoComplete="one-time-code"
                        />
                      </div>
                      <Button type="primary" onClick={() => void handleRedeemGiftcard()} loading={giftcardLoading}>
                        {i18n.t('兑换')}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 修改密码 */}
          <div className="row mb-3 mb-md-0">
            <div className="col-md-12">
              <div className="block block-rounded">
                <div className="block-header block-header-default">
                  <h3 className="block-title">{i18n.t('修改密码')}</h3>
                  <div className="block-options" />
                </div>
                <div className="block-content">
                  <div className="row push">
                    <div className="col-lg-8 col-xl-5">
                      <div className="form-group">
                        <label>{i18n.t('旧密码')}</label>
                        <input
                          type="password"
                          className="form-control"
                          placeholder={i18n.t('请输入旧密码')}
                          value={oldPassword}
                          onChange={(event) => setOldPassword((event.target as HTMLInputElement).value)}
                          autoComplete="current-password"
                        />
                      </div>
                      <div className="form-group">
                        <label>{i18n.t('新密码')}</label>
                        <input
                          type="password"
                          className="form-control"
                          placeholder={i18n.t('请输入新密码')}
                          value={newPassword}
                          onChange={(event) => setNewPassword((event.target as HTMLInputElement).value)}
                          autoComplete="new-password"
                        />
                      </div>
                      <div className="form-group">
                        <label>{i18n.t('新密码')}</label>
                        <input
                          type="password"
                          className="form-control"
                          placeholder={i18n.t('请输入新密码')}
                          value={rePassword}
                          onChange={(event) => setRePassword((event.target as HTMLInputElement).value)}
                          autoComplete="new-password"
                        />
                      </div>
                      <Button type="primary" onClick={() => void handleChangePassword()} loading={passwordLoading}>
                        {i18n.t('保存')}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 通知 */}
          <div className="row mb-3 mb-md-0">
            <div className="col-md-12">
              <div className="block block-rounded">
                <div className="block-header block-header-default">
                  <h3 className="block-title">{i18n.t('通知')}</h3>
                </div>
                <div className="block-content">
                  <div className="row">
                    <div className="col-lg-8 col-xl-5">
                      <div className="form-group">
                        <label>{i18n.t('到期邮件提醒')}</label>
                        <div>
                          <Switch
                            checked={Boolean(data.info.remind_expire)}
                            loading={preferenceLoading === 'remind_expire'}
                            onChange={(checked) => void handleToggle('remind_expire', checked)}
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>{i18n.t('流量邮件提醒')}</label>
                        <div>
                          <Switch
                            checked={Boolean(data.info.remind_traffic)}
                            loading={preferenceLoading === 'remind_traffic'}
                            onChange={(checked) => void handleToggle('remind_traffic', checked)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Telegram */}
          {canTelegram ? (
            <div className="row mb-3 mb-md-0">
              <div className="col-md-12">
                {!data.info.telegram_id ? (
                  <div className="block block-rounded bind_telegram">
                    <div className="block-header block-header-default">
                      <h3 className="block-title">{i18n.t('绑定Telegram')}</h3>
                      <div className="block-options">
                        {subscribeUrl ? (
                          <TelegramBindModal subscribeUrl={subscribeUrl}>
                            <button type="button" className="btn btn-primary btn-sm btn-primary btn-rounded px-3">
                              {i18n.t('立即开始')}
                            </button>
                          </TelegramBindModal>
                        ) : (
                          <button type="button" className="btn btn-primary btn-sm btn-primary btn-rounded px-3" disabled>
                            {i18n.t('立即开始')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="block block-rounded unbind_telegram">
                    <div className="block-header block-header-default">
                      <h3 className="block-title">{i18n.t('绑定Telegram')}</h3>
                      <div className="block-options">
                        <button
                          type="button"
                          className="btn btn-danger btn-sm btn-rounded px-3"
                          onClick={() => void handleUnbindTelegram()}
                        >
                          {i18n.t('解除绑定')}
                        </button>
                      </div>
                      <div className="block-options">{i18n.t('Telegram ID: {id}', { id: String(data.info.telegram_id) })}</div>
                    </div>
                  </div>
                )}

                {discussLink ? (
                  <div className="block block-rounded join_telegram_disscuss">
                    <div className="block-header block-header-default">
                      <h3 className="block-title">{i18n.t('Telegram 讨论组')}</h3>
                      <div className="block-options">
                        <a
                          href={discussLink}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-primary btn-sm btn-primary btn-rounded px-3"
                        >
                          {i18n.t('立即加入')}
                        </a>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* 重置订阅信息 */}
          <div className="row mb-3 mb-md-0">
            <div className="col-md-12">
              <div className="block block-rounded">
                <div className="block-header block-header-default">
                  <h3 className="block-title">{i18n.t('重置订阅信息')}</h3>
                  <div className="block-options" />
                </div>
                <div className="block-content">
                  <div className="row push">
                    <div className="col-md-12">
                      <div className="alert alert-warning mb-3" role="alert">
                        {i18n.t('重置订阅提示信息')}
                      </div>
                      <button type="button" className="btn btn-danger btn-sm btn-rounded px-3" onClick={() => void handleResetSecurity()}>
                        {i18n.t('重置')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  )
}
