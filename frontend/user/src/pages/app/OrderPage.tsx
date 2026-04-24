import type { AxiosError } from 'axios'
import { Badge, Divider, Modal, Table, message, Tag } from 'antd'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { cancelOrder, fetchOrders, type Order } from '@/api/order'
import type { ColumnsType } from 'antd/es/table'
import i18n from '@/i18n'
import { MEDIA_QUERIES } from '@/config/responsive'

const STATUS_TEXT: Record<number, string> = {
  0: '待支付',
  1: '开通中',
  2: '已取消',
  3: '已完成',
}

const STATUS_BADGE: Record<number, 'error' | 'processing' | 'default' | 'success'> = {
  0: 'error',
  1: 'processing',
  2: 'default',
  3: 'success',
  4: 'default',
}

const PERIOD_MAP: Record<string, string> = {
  month_price: '月付',
  quarter_price: '季付',
  half_year_price: '半年付',
  year_price: '年付',
  two_year_price: '两年付',
  three_year_price: '三年付',
  onetime_price: '一次性',
  reset_price: '流量重置包',
}

const formatDateTime = (value: number | null | undefined) => {
  if (!value) return '-'
  const date = new Date(value * 1000)
  const pad2 = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

const formatDateTimeFull = (value: number | null | undefined) => {
  if (!value) return '-'
  const date = new Date(value * 1000)
  const pad2 = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`
}

export default function OrderPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelLoading, setCancelLoading] = useState<string | null>(null)
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(MEDIA_QUERIES.tabletDown).matches
  })

  const loadOrders = async () => {
    setLoading(true)
    try {
      const data = await fetchOrders()
      setOrders(data)
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>
      message.error(axiosError.response?.data?.message || axiosError.message || i18n.t('请求失败'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadOrders()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

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
    const tradeNo = searchParams.get('trade_no')
    if (!tradeNo) return
    navigate(`/order/${tradeNo}`, { replace: true })
  }, [navigate, searchParams])

  const handleCancelOrder = async (tradeNo: string) => {
    setCancelLoading(tradeNo)
    try {
      await cancelOrder(tradeNo)
      message.success(i18n.t('已取消'))
      await loadOrders()
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>
      message.error(axiosError.response?.data?.message || i18n.t('请求失败'))
    } finally {
      setCancelLoading(null)
    }
  }

  const columns: ColumnsType<Order> = [
    {
      title: i18n.t('# 订单号'),
      dataIndex: 'trade_no',
      key: 'trade_no',
      render: (tradeNo: string) => (
        <a
          href="javascript:void(0);"
          onClick={(event) => {
            event.preventDefault()
            navigate(`/order/${tradeNo}`)
          }}
        >
          {tradeNo}
        </a>
      ),
    },
      {
        title: i18n.t('周期'),
        dataIndex: 'period',
        key: 'period',
        align: 'center',
        render: (_: unknown, record: Order) => (
          <Tag>{i18n.t(PERIOD_MAP[record.period] || record.period)}</Tag>
        ),
      },
    {
      title: i18n.t('订单金额'),
      dataIndex: 'total_amount',
      key: 'total_amount',
      align: 'right',
      render: (amount: number) => (amount / 100).toFixed(2),
    },
    {
      title: i18n.t('订单状态'),
      dataIndex: 'status',
      key: 'status',
      render: (status: number) => {
        const label = STATUS_TEXT[status] ?? '订单状态'
        return (
          <span>
            <Badge status={STATUS_BADGE[status] ?? 'default'} /> {i18n.t(label)}
          </span>
        )
      },
    },
    {
      title: i18n.t('创建时间'),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (ts: number) => formatDateTime(ts),
    },
    {
      title: i18n.t('操作'),
      key: 'actions',
      align: 'right',
      render: (_: unknown, record: Order) => (
        <div>
          <a
            href="javascript:void(0);"
            onClick={(event) => {
              event.preventDefault()
              navigate(`/order/${record.trade_no}`)
            }}
          >
            {i18n.t('查看详情')}
          </a>
          <Divider type="vertical" />
          <a
            href="javascript:void(0);"
            onClick={(event) => {
              event.preventDefault()
              Modal.confirm({
                title: i18n.t('注意'),
                content: i18n.t('如果你已经付款，取消订单可能会导致支付失败，确定取消订单吗？'),
                okText: i18n.t('关闭订单'),
                okType: 'default',
                okButtonProps: { loading: cancelLoading === record.trade_no },
                onOk: async () => {
                  await handleCancelOrder(record.trade_no)
                },
              })
            }}
          >
            {i18n.t('取消')}
          </a>
        </div>
      ),
    },
  ]

  return (
    <>
      <div className={`block block-rounded js-appear-enabled ${loading ? 'block-mode-loading' : ''}`}>
        <div className="bg-white">
          {isMobileViewport ? (
            <div className="am-list">
              <div className="am-list-body">
                {orders.map((order) => {
                  const planName = order.plan?.name ?? ''
                  const status = order.status
                  return (
                    <div
                      key={order.trade_no}
                      className="am-list-item am-list-item-middle"
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/order/${order.trade_no}`)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          navigate(`/order/${order.trade_no}`)
                        }
                      }}
                    >
                      <div className="am-list-line am-list-line-multiple">
                        <div className="am-list-content">
                          {planName}
                          <div className="am-list-brief">{formatDateTimeFull(order.created_at)}</div>
                        </div>
                        <div className="am-list-extra">
                          <div>
                            {(order.total_amount / 100).toFixed(2)}
                          </div>
                          <div>
                            <Badge status={STATUS_BADGE[status] ?? 'default'} /> {i18n.t(STATUS_TEXT[status] ?? '订单状态')}
                          </div>
                        </div>
                        <div className="am-list-arrow am-list-arrow-horizontal" aria-hidden="true" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <Table
              tableLayout="auto"
              columns={columns}
              dataSource={orders}
              rowKey="trade_no"
              pagination={false}
              scroll={{ x: 900 }}
            />
          )}
        </div>
      </div>
    </>
  )
}
