import type { AxiosError } from 'axios'
import { Modal, Result, message } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  cancelOrder,
  checkOrderStatus,
  checkoutOrder,
  getOrderDetail,
  getPaymentMethods,
  type OrderDetail,
  type PaymentMethod,
} from '@/api/order'
import { getStripePublicKey, getUserConfig, type UserConfig } from '@/api/user'
import QrCode from '@/components/QrCode'
import StripeCardForm from '@/components/StripeCardForm'
import i18n from '@/i18n'

const PERIOD_MAP: Record<string, string> = {
  month_price: '月付',
  quarter_price: '季付',
  half_year_price: '半年付',
  year_price: '年付',
  two_year_price: '两年付',
  three_year_price: '三年付',
  onetime_price: '一次性',
  reset_price: '流量重置包',
  deposit: '充值',
}

function pad2(value: number) {
  return String(value).padStart(2, '0')
}

function formatDateTime(value: number | null | undefined) {
  if (!value) return '-'
  const date = new Date(value * 1000)
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(
    date.getMinutes()
  )}:${pad2(date.getSeconds())}`
}

function calculatePreHandlingAmount(totalAmount: number, method: PaymentMethod) {
  const fixed = typeof method.handling_fee_fixed === 'number' ? method.handling_fee_fixed : 0
  const percent = typeof method.handling_fee_percent === 'number' ? method.handling_fee_percent : 0
  if (!totalAmount) return 0
  if (!fixed && !percent) return 0
  const raw = totalAmount * (percent / 100) + fixed
  return Number.isFinite(raw) ? raw : 0
}

function getResultProps(status: number) {
  switch (status) {
    case 1:
      return {
        status: 'info' as const,
        title: i18n.t('开通中'),
        subTitle: i18n.t('订单系统正在进行处理，请稍等1-3分钟。'),
      }
    case 2:
      return {
        status: 'warning' as const,
        title: i18n.t('已取消'),
        subTitle: i18n.t('订单由于超时支付已被取消。'),
      }
    case 3:
    case 4:
      return {
        status: 'success' as const,
        title: i18n.t('已完成'),
        subTitle: i18n.t('订单已支付并开通。'),
        extra: (
          <button
            type="button"
            className="btn btn-primary btn-sm btn-danger btn-rounded px-3"
            onClick={() => {
              window.location.hash = '#/knowledge'
            }}
          >
            <i className="nav-main-link-icon si si-book-open mr-1" />
            {i18n.t('查看使用教程')}
          </button>
        ),
      }
    default:
      return {
        status: 'info' as const,
        title: i18n.t('订单状态'),
        subTitle: i18n.t('请刷新后重试。'),
      }
  }
}

export default function OrderDetailPage() {
  const params = useParams<{ trade_no: string }>()
  const tradeNo = params.trade_no
  const navigate = useNavigate()

  const [config, setConfig] = useState<UserConfig | null>(null)
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null)

  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)

  const [qrVisible, setQrVisible] = useState(false)
  const [payUrl, setPayUrl] = useState<string | null>(null)

  const [stripePk, setStripePk] = useState<string | null>(null)
  const [stripeTokenId, setStripeTokenId] = useState<string | null>(null)

  const pollTimerRef = useRef<number | null>(null)

  const selectedMethod = useMemo(
    () => paymentMethods.find((method) => method.id === selectedMethodId) ?? null,
    [paymentMethods, selectedMethodId]
  )

  const fetchData = useCallback(async () => {
    if (!tradeNo) return
    setLoading(true)
    try {
      const [detail, methods, userConfig] = await Promise.all([
        getOrderDetail(tradeNo),
        getPaymentMethods(),
        getUserConfig(),
      ])
      setOrder(detail)
      setPaymentMethods(methods)
      setConfig(userConfig)
      setSelectedMethodId(methods?.[0]?.id ?? null)
      setStripePk(null)
      setStripeTokenId(null)
      setQrVisible(false)
      setPayUrl(null)
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>
      message.error(axiosError.response?.data?.message || axiosError.message || i18n.t('加载订单失败'))
      navigate('/order', { replace: true })
    } finally {
      setLoading(false)
    }
  }, [navigate, tradeNo])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!selectedMethod) return
    setStripeTokenId(null)

    if (selectedMethod.payment !== 'StripeCredit') {
      setStripePk(null)
      return
    }

    let cancelled = false

    const run = async () => {
      try {
        if (config?.stripe_pk) {
          if (!cancelled) setStripePk(config.stripe_pk)
          return
        }
        const pk = await getStripePublicKey(selectedMethod.id)
        if (!cancelled) setStripePk(pk)
      } catch (err) {
        const axiosError = err as AxiosError<{ message?: string }>
        message.error(axiosError.response?.data?.message || i18n.t('获取 Stripe PK 失败'))
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [config?.stripe_pk, selectedMethod])

  useEffect(() => {
    if (!order || !selectedMethod) return
    const nextAmount = calculatePreHandlingAmount(order.total_amount, selectedMethod)
    const current = typeof order.pre_handling_amount === 'number' ? order.pre_handling_amount : 0
    if (current === nextAmount) return
    setOrder((prev) => (prev ? { ...prev, pre_handling_amount: nextAmount } : prev))
  }, [
    order?.total_amount,
    order?.pre_handling_amount,
    selectedMethodId,
    selectedMethod?.handling_fee_fixed,
    selectedMethod?.handling_fee_percent,
  ])

  const stopPolling = () => {
    if (pollTimerRef.current != null) {
      window.clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }

  useEffect(() => {
    stopPolling()
    if (!order || order.status !== 0) return

    let cancelled = false

    const tick = async () => {
      try {
        const status = await checkOrderStatus(order.trade_no)
        if (cancelled) return
        if (status !== 0) {
          setQrVisible(false)
          setPayUrl(null)
          await fetchData()
          return
        }
      } catch {
        // ignore
      }

      pollTimerRef.current = window.setTimeout(() => {
        void tick()
      }, 3000)
    }

    pollTimerRef.current = window.setTimeout(() => {
      void tick()
    }, 3000)

    return () => {
      cancelled = true
      stopPolling()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.trade_no, order?.status])

  const handleCancel = async () => {
    if (!order) return
    Modal.confirm({
      title: i18n.t('注意'),
      content: i18n.t('如果你已经付款，取消订单可能会导致支付失败，确定取消订单吗？'),
      okText: i18n.t('关闭订单'),
      okType: 'default',
      okButtonProps: { loading: cancelLoading },
      onOk: async () => {
        setCancelLoading(true)
        try {
          await cancelOrder(order.trade_no)
          message.success(i18n.t('订单已取消'))
          await fetchData()
        } catch (err) {
          const axiosError = err as AxiosError<{ message?: string }>
          message.error(axiosError.response?.data?.message || i18n.t('取消订单失败'))
        } finally {
          setCancelLoading(false)
        }
      },
    })
  }

  const handleCheckout = async () => {
    if (!order || !selectedMethod) return
    if (selectedMethod.payment === 'StripeCredit' && !stripeTokenId) {
      message.error(i18n.t('请检查信用卡支付信息'))
      return
    }

    setCheckoutLoading(true)
    try {
      const res = await checkoutOrder(order.trade_no, selectedMethod.id, stripeTokenId ?? undefined)
      if (selectedMethod.payment === 'StripeCredit') {
        message.loading(i18n.t('请稍等，我们正在验证该笔支付'), 5)
        return
      }
      if (res.type === 0) {
        setPayUrl(String(res.data ?? ''))
        setQrVisible(true)
        return
      }
      if (res.type === 1) {
        const url = String(res.data ?? '')
        if (url) {
          window.location.href = url
          message.info(i18n.t('正在前往收银台'))
        }
        return
      }
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>
      message.error(axiosError.response?.data?.message || i18n.t('发起支付失败'))
    } finally {
      setCheckoutLoading(false)
    }
  }

  const plan = order?.plan as any
  const planId = typeof plan?.id === 'number' ? plan.id : order?.plan_id
  const planPrice = typeof plan?.[order?.period ?? ''] === 'number' ? (plan[order?.period ?? ''] as number) : null
  const bonus = (order as any)?.bonus_amount ?? (order as any)?.bounus
  const getAmount = (order as any)?.get_amount
  const currencySymbol = config?.currency_symbol ?? ''
  const currency = config?.currency ?? ''
  const preHandlingAmount = typeof order?.pre_handling_amount === 'number' ? order.pre_handling_amount : 0

  return (
    <>
      {loading ? (
        <div className="spinner-grow text-primary" role="status" aria-label="Loading">
          <span className="sr-only">{i18n.t('加载中...')}</span>
        </div>
      ) : !order ? null : (
        <div className="row" id="cashier">
          <div className={order.status === 0 ? 'col-md-8 col-sm-12' : 'col-12'}>
            {order.status !== 0 ? (
              <div className="block block-rounded">
                <div className="block-content pt-0">
                  <Result className="py-4" {...getResultProps(order.status)} />
                </div>
              </div>
            ) : null}

            <div className="block block-rounded">
              <div className="block-header block-header-default">
                <h3 className="block-title v2board-trade-no">{i18n.t('商品信息')}</h3>
              </div>
              <div className="block-content pb-4">
                <div className="v2board-order-info">
                  <div>
                    <span>{i18n.t('产品名称')}</span>
                    <span>{planId === 0 ? i18n.t('充值') : plan?.name ?? '-'}</span>
                  </div>
                  {planId !== 0 ? (
                    <>
                      <div>
                        <span>{i18n.t('类型/周期')}</span>
                        <span>{i18n.t(PERIOD_MAP[order.period] || order.period)}</span>
                      </div>
                      <div>
                        <span>{i18n.t('产品流量')}</span>
                        <span>{typeof plan?.transfer_enable === 'number' ? `${plan.transfer_enable} GB` : '-'}</span>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="block block-rounded">
              <div className="block-header block-header-default">
                <h3 className="block-title v2board-trade-no">{i18n.t('订单信息')}</h3>
                {order.status === 0 ? (
                  <div className="block-options">
                    <button
                      disabled={cancelLoading}
                      type="button"
                      className="btn btn-primary btn-sm btn-danger btn-rounded px-3"
                      onClick={() => void handleCancel()}
                    >
                      {cancelLoading ? <span className="spinner-border spinner-border-sm mr-1" role="status" /> : null}
                      {i18n.t('关闭订单')}
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="block-content pb-4">
                <div className="v2board-order-info">
                  <div>
                    <span>{i18n.t('订单号')}</span>
                    <span>{order.trade_no}</span>
                  </div>
                  {order.discount_amount ? (
                    <div>
                      <span>{i18n.t('优惠金额')}</span>
                      <span>{(order.discount_amount / 100).toFixed(2)}</span>
                    </div>
                  ) : null}
                  {order.surplus_amount ? (
                    <div>
                      <span>{i18n.t('旧订阅折抵金额')}</span>
                      <span>{(order.surplus_amount / 100).toFixed(2)}</span>
                    </div>
                  ) : null}
                  {order.refund_amount ? (
                    <div>
                      <span>{i18n.t('退款金额')}</span>
                      <span>{(order.refund_amount / 100).toFixed(2)}</span>
                    </div>
                  ) : null}
                  {order.balance_amount ? (
                    <div>
                      <span>{i18n.t('余额支付')}</span>
                      <span>{(order.balance_amount / 100).toFixed(2)}</span>
                    </div>
                  ) : null}
                  {preHandlingAmount ? (
                    <div>
                      <span>{i18n.t('支付手续费')}</span>
                      <span>{(preHandlingAmount / 100).toFixed(2)}</span>
                    </div>
                  ) : null}
                  <div>
                    <span>{i18n.t('创建时间')}</span>
                    <span>{formatDateTime(order.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>

            {order.status === 0 ? (
              <>
                <div className="block block-rounded js-appear-enabled">
                  <div className="block-header block-header-default">
                    <h3 className="block-title">{i18n.t('支付方式')}</h3>
                    <div className="block-options" />
                  </div>
                  <div className="block-content p-0">
                    {paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className={`v2board-select ${selectedMethodId === method.id ? 'active border-primary' : ''}`}
                        onClick={() => setSelectedMethodId(method.id)}
                      >
                        <div style={{ flex: 1, paddingTop: 4 }}>
                          <span
                            className={`v2board-select-radio ${selectedMethodId === method.id ? 'checked' : ''}`}
                          />
                          {method.name}
                        </div>
                        {method.icon ? (
                          <div style={{ flex: 1, textAlign: 'right' }}>
                            <img src={method.icon} height={30} alt={method.name} />
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                {selectedMethod?.payment === 'StripeCredit' && stripePk ? (
                  <>
                    <h3 className="font-w300 mt-5 mb-3">{i18n.t('填写信用卡支付信息')}</h3>
                    <StripeCardForm
                      pk={stripePk}
                      onToken={(tokenId) => {
                        setStripeTokenId(tokenId)
                        message.success(i18n.t('信用卡信息已确认'))
                      }}
                    />
                    <div style={{ fontSize: 12 }} className="mt-3 mb-5">
                      <i className="fa fa-user-shield" style={{ marginRight: 5, color: '#7cb305' }} />
                      {i18n.t('您的信用卡信息只会被用作当次扣款，系统并不会保存，这是我们认为最安全的。')}
                    </div>
                  </>
                ) : null}
              </>
            ) : null}
          </div>

          {order.status === 0 ? (
            <div className="col-md-4 col-sm-12">
              <div
                className="block block-link-pop block-rounded  px-3 py-3 text-light"
                style={{ background: '#35383D' }}
              >
                <h5 className="text-light mb-3">{i18n.t('订单总额')}</h5>

                {planId === 0 ? (
                  <>
                    <div>
                      <div className="pt-3">
                        {i18n.t('充值奖励')}
                        <div className="text-right">
                          {currencySymbol}
                          {((typeof bonus === 'number' ? bonus : 0) / 100).toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="pt-3">
                        {i18n.t('实际到账')}
                        <div className="text-right">
                          {currencySymbol}
                          {((typeof getAmount === 'number' ? getAmount : 0) / 100).toFixed(2)}
                        </div>
                      </div>
                      <div className="row no-gutters py-3" style={{ borderBottom: '1px solid #646669' }} />
                    </div>
                  </>
                ) : (
                  <div className="row no-gutters pb-3" style={{ borderBottom: '1px solid #646669' }}>
                    <div className="col-8">
                      {plan?.name ?? '-'} x {i18n.t(PERIOD_MAP[order.period] || order.period)}
                    </div>
                    <div className="col-4 text-right">
                      {currencySymbol}
                      {planPrice != null ? (planPrice / 100).toFixed(2) : '-'}
                    </div>
                  </div>
                )}

                {order.discount_amount ? (
                  <div>
                    <div className="pt-3" style={{ color: '#646669' }}>
                      {i18n.t('折扣')}
                    </div>
                    <div className="row no-gutters py-3" style={{ borderBottom: '1px solid #646669' }}>
                      <div className="col-8" />
                      <div className="col-4 text-right">
                        {currencySymbol}
                        {(order.discount_amount / 100).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ) : null}

                {order.surplus_amount ? (
                  <div>
                    <div className="pt-3" style={{ color: '#646669' }}>
                      {i18n.t('折抵')}
                    </div>
                    <div className="row no-gutters py-3" style={{ borderBottom: '1px solid #646669' }}>
                      <div className="col-8" />
                      <div className="col-4 text-right">
                        {currencySymbol}
                        {(order.surplus_amount / 100).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ) : null}

                {order.refund_amount ? (
                  <div>
                    <div className="pt-3" style={{ color: '#646669' }}>
                      {i18n.t('退款')}
                    </div>
                    <div className="row no-gutters py-3" style={{ borderBottom: '1px solid #646669' }}>
                      <div className="col-8" />
                      <div className="col-4 text-right">
                        - {currencySymbol}
                        {(order.refund_amount / 100).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ) : null}

                {preHandlingAmount ? (
                  <div>
                    <div className="pt-3" style={{ color: '#646669' }}>
                      {i18n.t('支付手续费')}
                    </div>
                    <div className="row no-gutters py-3" style={{ borderBottom: '1px solid #646669' }}>
                      <div className="col-8" />
                      <div className="col-4 text-right">+ {(preHandlingAmount / 100).toFixed(2)}</div>
                    </div>
                  </div>
                ) : null}

                <div className="pt-3" style={{ color: '#646669' }}>
                  {i18n.t('总计')}
                </div>
                <h1 className="text-light mt-3 mb-3">
                  {currencySymbol} {((order.total_amount + (preHandlingAmount || 0)) / 100).toFixed(2)} {currency}
                </h1>

                <button
                  type="button"
                  className="btn btn-block btn-primary"
                  disabled={checkoutLoading || (selectedMethod?.payment === 'StripeCredit' && !stripeTokenId)}
                  onClick={() => void handleCheckout()}
                >
                  {checkoutLoading ? (
                    <i className="fa fa-spinner fa-spin" />
                  ) : (
                    <span>
                      <i className="far fa-check-circle mr-1" /> {i18n.t('结账')}
                    </span>
                  )}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <Modal
        className="v2board-payment-qrcode"
        open={qrVisible}
        onCancel={() => {
          setQrVisible(false)
          setPayUrl(null)
        }}
        footer={<div style={{ textAlign: 'center' }}>{i18n.t('等待支付中')}</div>}
        width={300}
        centered
        closable={false}
        maskClosable
      >
        {payUrl ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 8 }}>
            <QrCode value={payUrl} size={250} />
          </div>
        ) : null}
      </Modal>
    </>
  )
}
