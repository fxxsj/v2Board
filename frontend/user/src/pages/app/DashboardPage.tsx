import type { AxiosError } from 'axios'
import { Button, Carousel, Drawer, Modal, message } from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchNotices, type Notice } from '@/api/notice'
import { createOrder } from '@/api/order'
import QrCode from '@/components/QrCode'
import i18n from '@/i18n'
import { MEDIA_QUERIES } from '@/config/responsive'
import {
  getUserConfig,
  getUserInfo,
  getUserStat,
  getUserSubscribe,
  newPeriod,
  type UserConfig,
  type UserInfo,
  type UserStat,
  type UserSubscribe,
} from '@/api/user'

interface DashboardData {
  config: UserConfig
  info: UserInfo
  subscribe: UserSubscribe
  stat: UserStat
  notices: Notice[]
}

const ONE_CLICK_SUBSCRIBE_CLASSES = {
  oneClickSubscribe: 'oneClickSubscribe___2t9Xg',
  item: 'item___yrtOv',
} as const

const formatCurrency = (value: number | null | undefined, config: UserConfig | null) => {
  if (value == null) {
    return '-'
  }

  const symbol = config?.currency_symbol ?? ''
  return `${symbol}${(value / 100).toFixed(2)}`
}

const formatBytes = (value: number | null | undefined) => {
  if (value == null) {
    return '-'
  }

  const kb = 1024
  const mb = 1024 * 1024
  const gb = 1024 * 1024 * 1024
  if (value >= gb) return `${(value / gb).toFixed(2)} GB`
  if (value >= mb) return `${(value / mb).toFixed(2)} MB`
  if (value >= kb) return `${(value / kb).toFixed(2)} KB`
  return `${value.toFixed(2)} B`
}

const isExpired = (expiredAt: number | null | undefined) => {
  if (!expiredAt) return false
  return expiredAt < Math.floor(Date.now() / 1000)
}

const formatNoticeDate = (value: number | null | undefined) => {
  if (!value) return '-'
  const date = new Date(value * 1000)
  const pad2 = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

const formatDateSlash = (value: number | null | undefined) => {
  if (!value) return '-'
  const date = new Date(value * 1000)
  const pad2 = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}`
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

const getAppTitle = () => (window as any)?.settings?.title ?? 'V2Board'

const getSubscribeDeepLinks = (subscribeUrl: string) => {
  const title = getAppTitle()
  const list: Array<{ title: string; onClick: () => void }> = []

  const urlSafeBase64 = (value: string) =>
    window
      .btoa(value)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

  const ua = typeof navigator === 'undefined' ? '' : (navigator.userAgent || '').toLowerCase()
  const isIphoneOrIpad = ua.includes('iphone') || ua.includes('ipad')
  const isMacTouch = Boolean(navigator.userAgent.match(/Mac/)) && Boolean(navigator.maxTouchPoints && navigator.maxTouchPoints > 2)
  const isIOS = isIphoneOrIpad || isMacTouch
  const isAndroid = ua.includes('android')
  const isMacintosh = ua.includes('macintosh')
  const isWindows = ua.includes('windows')

  list.push({
    title: 'Hiddify',
    onClick: () => {
      window.location.href = `hiddify://import/${subscribeUrl}&flag=sing#${title}`
    },
  })
  list.push({
    title: 'Sing-box',
    onClick: () => {
      window.location.href = `sing-box://import-remote-profile?url=${encodeURIComponent(subscribeUrl)}#${title}`
    },
  })

  if (isIOS) {
    list.push({
      title: 'Shadowrocket',
      onClick: () => {
        const payload = urlSafeBase64(`${subscribeUrl}&flag=shadowrocket`)
        window.location.href = `shadowrocket://add/sub://${payload}?remark=${title}`
      },
    })
    list.push({
      title: 'QuantumultX',
      onClick: () => {
        const remoteResource = encodeURI(
          JSON.stringify({
            server_remote: [`${subscribeUrl}, tag=${title}`],
          }),
        )
        window.location.href = `quantumult-x:///update-configuration?remote-resource=${remoteResource}`
      },
    })
    list.push({
      title: 'Surge',
      onClick: () => {
        window.location.href = `surge:///install-config?url=${encodeURIComponent(subscribeUrl)}&name=${title}`
      },
    })
    list.push({
      title: 'Stash',
      onClick: () => {
        window.location.href = `stash://install-config?url=${encodeURIComponent(subscribeUrl)}&name=${title}`
      },
    })
  }

  if (isMacintosh) {
    list.push({
      title: 'ClashX',
      onClick: () => {
        window.location.href = `clash://install-config?url=${encodeURIComponent(subscribeUrl)}&name=${title}`
      },
    })
  }

  if (isWindows) {
    list.push({
      title: 'ClashMeta',
      onClick: () => {
        window.location.href = `clash://install-config?url=${encodeURIComponent(`${subscribeUrl}&flag=meta`)}&name=${title}`
      },
    })
  }

  if (isAndroid) {
    list.push({
      title: 'NekoBox For Android',
      onClick: () => {
        window.location.href = `clash://install-config?url=${encodeURIComponent(`${subscribeUrl}&flag=meta`)}&name=${title}`
      },
    })
    list.push({
      title: 'ClashMeta For Android',
      onClick: () => {
        window.location.href = `clash://install-config?url=${encodeURIComponent(`${subscribeUrl}&flag=meta`)}&name=${title}`
      },
    })
    list.push({
      title: 'Surfboard',
      onClick: () => {
        window.location.href = `surge:///install-config?url=${encodeURIComponent(subscribeUrl)}&name=${title}`
      },
    })
  }

  return list
}

function NoticeCard({ notice, onOpen }: { notice: Notice; onOpen: (notice: Notice) => void }) {
  const imageUrl = (notice as any)?.img_url as string | undefined
  const style = imageUrl
    ? {
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: 'cover',
      }
    : undefined

  return (
    <a
      className="block block-rounded bg-image mb-0 v2board-bg-pixels"
      style={style}
      href="javascript:void(0)"
      onClick={(event) => {
        event.preventDefault()
        onOpen(notice)
      }}
    >
      <div className="block-content bg-black-50">
        <div className="mb-5 mb-sm-7 d-sm-flex justify-content-sm-between align-items-sm-center">
          <p>
            <span className="badge badge-danger p-2 text-uppercase">{i18n.t('公告')}</span>
          </p>
        </div>
        <p className="font-size-lg text-white mb-1">{notice.title}</p>
        <p className="font-w600 text-white-75">{formatNoticeDate(notice.created_at)}</p>
      </div>
    </a>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [noticeModalOpen, setNoticeModalOpen] = useState(false)
  const [activeNotice, setActiveNotice] = useState<Notice | null>(null)
  const [subscribeModalOpen, setSubscribeModalOpen] = useState(false)
  const [qrSubscribeOpen, setQrSubscribeOpen] = useState(false)
  const subscribeBoxRef = useRef<HTMLDivElement | null>(null)
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(MEDIA_QUERIES.tabletDown).matches
  })
  const [subscribeDrawerHeight, setSubscribeDrawerHeight] = useState<number | undefined>(undefined)

  const openSubscribeModal = () => {
    if (!data?.subscribe.subscribe_url) {
      message.warning(i18n.t('暂无订阅地址'))
      return
    }
    setSubscribeModalOpen(true)
  }

  useEffect(() => {
    if (!subscribeModalOpen || !isMobileViewport) {
      setSubscribeDrawerHeight(undefined)
      return
    }
    const timer = window.setTimeout(() => {
      const height = subscribeBoxRef.current?.offsetHeight
      if (height) {
        setSubscribeDrawerHeight(height)
      }
    }, 100)
    return () => window.clearTimeout(timer)
  }, [subscribeModalOpen, isMobileViewport, qrSubscribeOpen])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia(MEDIA_QUERIES.tabletDown)
    const handleViewportChange = (event: MediaQueryList | MediaQueryListEvent) => {
      const matches = 'matches' in event ? event.matches : mediaQuery.matches
      setIsMobileViewport(matches)
    }
    handleViewportChange(mediaQuery)
    mediaQuery.addEventListener('change', handleViewportChange)
    return () => mediaQuery.removeEventListener('change', handleViewportChange)
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadDashboard = async () => {
      setLoading(true)
      setError(null)

      try {
        const [config, info, subscribe, stat, noticesRes] = await Promise.all([
          getUserConfig(),
          getUserInfo(),
          getUserSubscribe(),
          getUserStat(),
          fetchNotices(1, 5),
        ])

        if (!cancelled) {
          setData({
            config,
            info,
            subscribe,
            stat,
            notices: noticesRes.data ?? [],
          })
        }
      } catch (error) {
        const axiosError = error as AxiosError<{ message?: string }>
        const nextError =
          axiosError.response?.data?.message || axiosError.message || i18n.t('请求失败')

        if (!cancelled) {
          setError(nextError)
          setData(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadDashboard()

    return () => {
      cancelled = true
    }
  }, [])

  const usage = useMemo(() => {
    const total = data?.subscribe.transfer_enable ?? 0
    const used = (data?.subscribe.u ?? 0) + (data?.subscribe.d ?? 0)
    const remaining = Math.max(total - used, 0)
    const percentRaw = total > 0 ? (used / total) * 100 : 0
    const percent = Math.round(percentRaw * 100) / 100
    const percentForBar = Math.min(Math.max(percentRaw, 0), 100)
    return { total, used, remaining, percent, percentForBar }
  }, [data?.subscribe.d, data?.subscribe.transfer_enable, data?.subscribe.u])

  const progressVariant = usage.percent >= 100 ? 'danger' : usage.percent >= 80 ? 'warning' : 'success'

  const loadLatest = async () => {
    const [config, info, subscribe, stat, noticesRes] = await Promise.all([
      getUserConfig(),
      getUserInfo(),
      getUserSubscribe(),
      getUserStat(),
      fetchNotices(1, 5),
    ])
    setData({
      config,
      info,
      subscribe,
      stat,
      notices: noticesRes.data ?? [],
    })
  }

  useEffect(() => {
    if (!data?.notices?.length) return
    const popup = data.notices.find((notice) => {
      const tags = (notice as any)?.tags
      if (Array.isArray(tags)) return tags.includes('弹窗')
      if (typeof tags === 'string') return tags.includes('弹窗')
      return false
    })
    if (!popup) return
    setActiveNotice(popup)
    setNoticeModalOpen(true)
  }, [data?.notices])

  const openNotice = (notice: Notice) => {
    setActiveNotice(notice)
    setNoticeModalOpen(true)
  }

  const handleBuyResetPackage = async () => {
    const subscribe = data?.subscribe
    if (!subscribe?.plan_id) return
    Modal.confirm({
      title: i18n.t('确定重置当前已用流量？'),
      content: i18n.t('点击「确定」将会跳转到收银台，支付订单后系统将会清空您当月已使用流量。'),
      okText: i18n.t('确定'),
      cancelText: i18n.t('取消'),
      onOk: async () => {
        const tradeNo = await createOrder(subscribe.plan_id as number, 'reset_price')
        navigate(`/order?trade_no=${encodeURIComponent(tradeNo)}`)
      },
    })
  }

  const handleNewPeriod = async () => {
    Modal.confirm({
      maskClosable: true,
      title: i18n.t('确定开启下一个流量周期？'),
      content: i18n.t(
        '点击「确定」将会扣除当前流量周期剩余订阅时长（按月重置时扣除本周期剩余订阅时长，每月1号重置时扣除整月时间30天，年周期同理），系统将会重置您的已使用流量。'
      ),
      okText: i18n.t('确定'),
      cancelText: i18n.t('取消'),
      onOk: async () => {
        await newPeriod()
        await loadLatest()
      },
    })
  }

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
          {data.stat?.[0] ? (
            <div className="alert alert-danger" role="alert">
              <p className="mb-0">
                {i18n.t('还有没支付的订单')}{' '}
                <a
                  className="alert-link"
                  href="javascript:void(0)"
                  onClick={(event) => {
                    event.preventDefault()
                    navigate('/order')
                  }}
                >
                  {i18n.t('立即支付')}
                </a>
              </p>
            </div>
          ) : null}
          {data.stat?.[1] ? (
            <div className="alert alert-warning" role="alert">
              <p className="mb-0">
                <strong>{data.stat[1]}</strong> {i18n.t('条工单正在处理中')}{' '}
                <a
                  className="alert-link"
                  href="javascript:void(0)"
                  onClick={(event) => {
                    event.preventDefault()
                    navigate('/ticket')
                  }}
                >
                  {i18n.t('立即查看')}
                </a>
              </p>
            </div>
          ) : null}
          {usage.percent >= 80 && usage.percent < 100 && !isExpired(data.subscribe.expired_at) ? (
            <div className="alert alert-info" role="alert">
              <p className="mb-0">
                {i18n.t('当前已使用流量达{rate}%', { rate: usage.percent })}{' '}
                {(data.subscribe.plan as any)?.reset_price ? (
                  <a
                    href="javascript:void(0)"
                    onClick={(event) => {
                      event.preventDefault()
                      void handleBuyResetPackage()
                    }}
                  >
                    <strong>{i18n.t('购买流量重置包')}</strong>
                  </a>
                ) : null}
              </p>
            </div>
          ) : null}

          {data.notices.length ? (
            <div className="row mb-3 mb-md-0">
              <div className="col-12 mb-sm-4">
                {data.notices.length > 1 ? (
                  <Carousel autoplay>
                    {data.notices.map((notice) => (
                      <div key={notice.id}>
                        <NoticeCard notice={notice} onOpen={openNotice} />
                      </div>
                    ))}
                  </Carousel>
                ) : (
                  <NoticeCard notice={data.notices[0]} onOpen={openNotice} />
                )}
              </div>
            </div>
          ) : null}

          <div className="row mb-3 mb-md-0">
            <div className="col-xl-12">
              <div className="block block-rounded js-appear-enabled">
                <div className="block-header block-header-default">
                  <h3 className="block-title">{i18n.t('我的订阅')}</h3>
                </div>
                <div className="block-content">
                  {data.subscribe.email ? (
                    data.subscribe.plan_id ? (
                      <div>
                        <div>
                          <div className="justify-content-md-between align-items-md-center">
                            <div>
                              <h3 className="h4 mb-3">{data.subscribe.plan?.name ?? '-'}</h3>

                              {data.subscribe.expired_at == null ? (
                                <p className="font-size-sm text-muted">{i18n.t('该订阅长期有效')}</p>
                              ) : (
                                <p className="font-size-sm text-muted">
                                  {isExpired(data.subscribe.expired_at) ? (
                                    <a className="font-w600 text-danger" href="javascript:void(0);">
                                      {i18n.t('已过期')}
                                    </a>
                                  ) : (
                                    <span>
                                      {i18n.t('于 {date} 到期，距离到期还有 {day} 天。', {
                                        date: formatDateSlash(data.subscribe.expired_at),
                                        day: (
                                          ((data.subscribe.expired_at as number) - Math.floor(Date.now() / 1000)) /
                                          86400
                                        ).toFixed(0),
                                      })}
                                      {data.subscribe.reset_day != null
                                        ? data.subscribe.reset_day !== 0
                                          ? i18n.t('已用流量将在 {reset_day} 日后重置', { reset_day: data.subscribe.reset_day })
                                          : i18n.t('已用流量已在今日重置')
                                        : ''}
                                    </span>
                                  )}
                                </p>
                              )}

                              <div className="mb-0">
                                <div className="progress mb-1" style={{ height: 6 }}>
                                  <div
                                    className={`progress-bar progress-bar-striped progress-bar-animated bg-${progressVariant}`}
                                    role="progressbar"
                                    style={{ width: `${Math.min(Math.max(usage.percentForBar, 0), 100)}%` }}
                                  />
                                </div>
                                <p className="font-size-sm font-w600 mb-3">
                                  <span className="font-w700">
                                    {i18n.t('已用 {used} / 总计 {total}', {
                                      used: formatBytes(usage.used),
                                      total: formatBytes(usage.total),
                                    })}
                                  </span>
                                  <span className="font-w700"> </span>
                                  <span className="font-w700">
                                    {i18n.t('在线设备 {alive_ip}/{device_limit}', {
                                      alive_ip: data.subscribe.alive_ip ?? '-',
                                      device_limit: data.subscribe.device_limit == null ? '∞' : data.subscribe.device_limit,
                                    })}
                                  </span>
                                </p>
                              </div>

                              {usage.percent >= 80 &&
                              !isExpired(data.subscribe.expired_at) &&
                              (data.subscribe.plan as any)?.reset_price ? (
                                <div className="mb-4">
                                  <Button type="primary" onClick={() => void handleBuyResetPackage()}>
                                    {i18n.t('购买流量重置包')}
                                  </Button>
                                </div>
                              ) : null}

                              {data.subscribe.allow_new_period &&
                              usage.percent >= 100 &&
                              !isExpired(data.subscribe.expired_at) ? (
                                <div className="mb-4">
                                  <Button type="primary" onClick={() => void handleNewPeriod()}>
                                    {i18n.t('提前开启流量周期')}
                                  </Button>
                                </div>
                              ) : null}

                              {isExpired(data.subscribe.expired_at) ? (
                                <div className="mb-4">
                                  <Button
                                    type="primary"
                                    onClick={() => {
                                      const canRenew = Boolean(data.subscribe.plan_id)
                                      navigate(canRenew ? `/plan/${data.subscribe.plan_id}` : '/plan')
                                    }}
                                  >
                                    {i18n.t(Boolean(data.subscribe.plan_id) ? '续费订阅' : '购买订阅')}
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <a
                        href="javascript:void(0);"
                        onClick={(event) => {
                          event.preventDefault()
                          navigate('/plan')
                        }}
                      >
                        <div>
                          <div className="text-center">
                            <div>
                              <i className="fa fa-plus fa-2x" />
                            </div>
                            <div className="font-size-sm text-uppercase text-muted pt-2 pb-3">{i18n.t('购买订阅')}</div>
                          </div>
                        </div>
                      </a>
                    )
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="row mb-3 mb-md-0">
            <div className="col-xl-12">
                <div className="block block-rounded js-appear-enabled">
                <div className="block-header block-header-default">
                  <h3 className="block-title">{i18n.t('捷径')}</h3>
                </div>
                <div className="block-content p-0">
                  <div className="justify-content-md-between align-items-md-center">
                    <div className="mb-3">
                      <div className="v2board-shortcuts-item" onClick={() => navigate('/knowledge')}>
                        <div>{i18n.t('查看教程')}</div>
                        <div className="description">
                          {i18n.t('学习如何使用')} {(window as any)?.settings?.title ?? 'V2Board'}
                        </div>
                        <i style={{ float: 'right' }} className="nav-main-link-icon si si-book-open" />
                      </div>

                      <div className="v2board-shortcuts-item" onClick={openSubscribeModal}>
                        <div>{i18n.t('一键订阅')}</div>
                        <div className="description">{i18n.t('快速将节点导入对应客户端进行使用')}</div>
                        <i style={{ float: 'right' }} className="nav-main-link-icon si si-feed" />
                      </div>

                      <div
                        className="v2board-shortcuts-item"
                        onClick={() => {
                          const canRenew = Boolean(data.subscribe.plan_id)
                          navigate(canRenew ? `/plan/${data.subscribe.plan_id}` : '/plan')
                        }}
                      >
                        <div>{i18n.t(Boolean(data.subscribe.plan_id) ? '续费订阅' : '购买订阅')}</div>
                        <div className="description">
                          {i18n.t(Boolean(data.subscribe.plan_id) ? '对您当前的订阅进行续费' : '对您当前的订阅进行购买')}
                        </div>
                        <i
                          style={{ float: 'right' }}
                          className={`nav-main-link-icon si si-${Boolean(data.subscribe.plan_id) ? 'clock' : 'bag'}`}
                        />
                      </div>

                      <div className="v2board-shortcuts-item" onClick={() => navigate('/ticket')}>
                        <div>{i18n.t('遇到问题')}</div>
                        <div className="description">{i18n.t('遇到问题可以通过工单与我们沟通')}</div>
                        <i style={{ float: 'right' }} className="nav-main-link-icon si si-support" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      <Modal
        title={activeNotice?.title || i18n.t('公告')}
        open={noticeModalOpen}
        footer={null}
        maskClosable
        onCancel={() => {
          setNoticeModalOpen(false)
          setActiveNotice(null)
        }}
      >
        <div
          className="notice-content"
          dangerouslySetInnerHTML={{ __html: String((activeNotice as any)?.content ?? '') }}
        />
      </Modal>

      {isMobileViewport ? (
        <Drawer
          placement="bottom"
          open={subscribeModalOpen}
          closable={false}
          height={subscribeDrawerHeight}
          maskClosable
          onClose={() => {
            setSubscribeModalOpen(false)
            setQrSubscribeOpen(false)
          }}
          styles={{ body: { padding: 0 } }}
        >
          <div ref={subscribeBoxRef}>{renderSubscribeBox()}</div>
        </Drawer>
      ) : (
        <Modal
          open={subscribeModalOpen}
          centered
          width={300}
          footer={null}
          closable={false}
          maskClosable
          onCancel={() => {
            setSubscribeModalOpen(false)
            setQrSubscribeOpen(false)
          }}
          bodyStyle={{ padding: 0 }}
        >
          <div ref={subscribeBoxRef}>{renderSubscribeBox()}</div>
        </Modal>
      )}

      <Modal
        open={qrSubscribeOpen}
        centered
        width={300}
        footer={null}
        closable={false}
        maskClosable
        onCancel={() => setQrSubscribeOpen(false)}
        zIndex={2000}
        style={{ textAlign: 'center' }}
      >
        {data?.subscribe.subscribe_url ? <QrCode value={data.subscribe.subscribe_url} renderAs="canvas" /> : null}
        <div style={{ marginTop: 10 }}>{i18n.t('使用支持扫码的客户端进行订阅')}</div>
      </Modal>
    </>
  )

  function renderSubscribeBox() {
    const subscribeUrl = data?.subscribe.subscribe_url
    const iconBase = `${(window as any)?.settings?.assets_path ?? ''}/./images/icon/`
    const deepLinks = subscribeUrl ? getSubscribeDeepLinks(subscribeUrl) : []
    const toSlug = (title: string) => title.split(' ').join('-').toLowerCase()

    return (
      <div className={ONE_CLICK_SUBSCRIBE_CLASSES.oneClickSubscribe}>
        <div
          key="copy"
          className={`${ONE_CLICK_SUBSCRIBE_CLASSES.item} subsrcibe-for-link`}
          onClick={async () => {
            if (!subscribeUrl) return
            const ok = await copyToClipboard(subscribeUrl)
            if (ok) message.success(i18n.t('复制成功'))
            else message.error(i18n.t('复制失败'))
          }}
        >
          <div>
            <i className="fa fa-copy mr-2" />
          </div>
          <div>{i18n.t('复制订阅地址')}</div>
        </div>

        <div
          key="qr"
          className={`${ONE_CLICK_SUBSCRIBE_CLASSES.item} subscribe-for-qrcode`}
          onClick={() => {
            if (!subscribeUrl) return
            setQrSubscribeOpen(true)
          }}
        >
          <div>
            <i className="fa fa-qrcode mr-2" />
          </div>
          <div>{i18n.t('扫描二维码订阅')}</div>
        </div>

        {deepLinks.map((item) => (
          <div
            key={item.title}
            className={`${ONE_CLICK_SUBSCRIBE_CLASSES.item} ${toSlug(item.title)}`}
            onClick={() => {
              try {
                item.onClick()
              } catch {
                message.error(i18n.t('请求失败'))
              }
            }}
          >
            <div>
              <img src={`${iconBase}${item.title}.png`} alt={item.title} />
            </div>
            <div>
              {i18n.t('导入到')} {item.title}
            </div>
          </div>
        ))}

        <div style={{ padding: 10 }}>
          <Button size="large" block type="primary" onClick={() => navigate('/knowledge')}>
            {i18n.t('不会使用，查看使用教程')}
          </Button>
        </div>
      </div>
    )
  }
}
