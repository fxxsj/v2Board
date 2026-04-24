import { LoadingOutlined } from '@ant-design/icons'
import type { AxiosError } from 'axios'
import { Button, Modal, Result, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { checkCoupon, type Coupon } from '@/api/coupon'
import { cancelOrder, createOrder, fetchOrders } from '@/api/order'
import { fetchPlanById, fetchPlans, type Plan } from '@/api/plan'
import { getUserConfig, getUserInfo, getUserSubscribe, type UserConfig, type UserInfo, type UserSubscribe } from '@/api/user'
import i18n from '@/i18n'

const PERIOD_LABELS: Record<string, string> = {
  month_price: '月付',
  quarter_price: '季付',
  half_year_price: '半年付',
  year_price: '年付',
  two_year_price: '两年付',
  three_year_price: '三年付',
  onetime_price: '一次性',
  reset_price: '流量重置包',
}

const LIST_TABS = [
  { key: 0, labelId: '全部' },
  { key: 1, labelId: '按周期' },
  { key: 2, labelId: '按流量' },
] as const

const isSoldOut = (plan: Plan) => plan.capacity_limit != null && plan.capacity_limit <= 0
const isAlmostSoldOut = (plan: Plan) => plan.capacity_limit != null && plan.capacity_limit >= 1 && plan.capacity_limit <= 5

const pickUnitPrice = (plan: Plan) => {
  const keys = [
    'reset_price',
    'onetime_price',
    'three_year_price',
    'two_year_price',
    'year_price',
    'half_year_price',
    'quarter_price',
    'month_price',
  ]
  let picked: { key: string; price: number } | null = null
  for (const key of keys) {
    if (key === 'reset_price') continue
    const value = plan[key]
    if (typeof value === 'number') {
      picked = { key, price: value }
    }
  }
  return picked
}

type ParsedFeature = { feature: string; support: boolean }

const parsePlanContent = (content: string | null | undefined): ParsedFeature[] | null => {
  if (!content) return null
  try {
    const parsed = JSON.parse(content) as unknown
    if (!Array.isArray(parsed)) return null
    const items = parsed
      .map((item) => {
        if (!item || typeof item !== 'object') return null
        const feature = (item as any).feature
        const support = (item as any).support
        if (typeof feature !== 'string') return null
        return { feature, support: Boolean(support) } satisfies ParsedFeature
      })
      .filter(Boolean) as ParsedFeature[]
    return items.length ? items : null
  } catch {
    return null
  }
}

export default function PlanPage() {
  const params = useParams<{ plan_id?: string }>()
  const navigate = useNavigate()
  const planId = params.plan_id ? Number(params.plan_id) : null

  const [tab, setTab] = useState<(typeof LIST_TABS)[number]['key']>(0)
  const [plans, setPlans] = useState<Plan[]>([])
  const [planLoading, setPlanLoading] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)
  const [config, setConfig] = useState<UserConfig | null>(null)

  const [couponCode, setCouponCode] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [coupon, setCoupon] = useState<Coupon | null>(null)
  const [selectPeriod, setSelectPeriod] = useState<string>('month_price')
  const [detailPlan, setDetailPlan] = useState<Plan | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [subscribe, setSubscribe] = useState<UserSubscribe | null>(null)
  const [ordering, setOrdering] = useState(false)

  const periodKeys = useMemo(() => {
    if (!detailPlan) return []
    const keys = Object.keys(PERIOD_LABELS).filter((key) => key !== 'reset_price')
    return keys.filter((key) => typeof detailPlan[key] === 'number')
  }, [detailPlan])

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return '--'
    const symbol = config?.currency_symbol ?? ''
    return `${symbol}${(value / 100).toFixed(2)}`
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setPlanLoading(true)
      setPlanError(null)
      try {
        const [list, cfg] = await Promise.all([fetchPlans(), getUserConfig()])
        if (cancelled) return
        setPlans(list || [])
        setConfig(cfg)
      } catch (e) {
        const axiosError = e as AxiosError<{ message?: string }>
        if (!cancelled) setPlanError(axiosError.response?.data?.message || axiosError.message || i18n.t('加载套餐失败'))
      } finally {
        if (!cancelled) setPlanLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!planId) {
      setDetailPlan(null)
      setDetailError(null)
      setCoupon(null)
      setCouponCode('')
      return
    }

    let cancelled = false
    const loadDetail = async () => {
      setDetailLoading(true)
      setDetailError(null)
      try {
        const [plan, cfg, info, sub] = await Promise.all([
          fetchPlanById(planId),
          getUserConfig(),
          getUserInfo(),
          getUserSubscribe(),
        ])
        if (cancelled) return
        setDetailPlan(plan)
        setConfig(cfg)
        setUserInfo(info)
        setSubscribe(sub)
        const defaultKey =
          (Object.keys(PERIOD_LABELS).find((k) => k !== 'reset_price' && typeof plan[k] === 'number') as string) ?? 'month_price'
        setSelectPeriod(defaultKey)
      } catch (e) {
        const axiosError = e as AxiosError<{ message?: string }>
        if (!cancelled) setDetailError(axiosError.response?.data?.message || axiosError.message || i18n.t('加载套餐失败'))
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    }

    void loadDetail()
    return () => {
      cancelled = true
    }
  }, [planId])

  const handleCheckCoupon = async () => {
    if (!couponCode) {
      setCoupon(null)
      return
    }
    setCouponLoading(true)
    try {
      const result = await checkCoupon(couponCode, planId ?? undefined)
      setCoupon(result)
    } catch (e) {
      const axiosError = e as AxiosError<{ message?: string }>
      setCoupon(null)
      message.error(axiosError.response?.data?.message || i18n.t('优惠券不可用'))
    } finally {
      setCouponLoading(false)
    }
  }

  const computeDiscount = (base: number, coupon: Coupon | null) => {
    if (!coupon) return 0
    const value = typeof coupon.value === 'number' ? coupon.value : 0
    if (coupon.type === 1) return value
    if (coupon.type === 2) return Math.round(base * (value / 100))
    return 0
  }

  const totalAmount = useMemo(() => {
    if (!detailPlan) return null
    const base = typeof detailPlan[selectPeriod] === 'number' ? (detailPlan[selectPeriod] as number) : null
    if (base == null) return null
    let total = base - computeDiscount(base, coupon)
    if (total < 0) total = 0
    return { base, total }
  }, [coupon, detailPlan, selectPeriod])

  const doCreateOrder = async () => {
    if (!detailPlan) return
    if (!totalAmount) return

    setOrdering(true)
    try {
      const tradeNo = await createOrder(detailPlan.id, selectPeriod, coupon?.code)
      navigate(`/order?trade_no=${encodeURIComponent(tradeNo)}`)
    } catch (e) {
      const axiosError = e as AxiosError<{ message?: string }>
      message.error(axiosError.response?.data?.message || i18n.t('创建订单失败'))
    } finally {
      setOrdering(false)
    }
  }

  const preOrder = async () => {
    if (!detailPlan) return
    if (!userInfo || !subscribe) {
      await doCreateOrder()
      return
    }

    const currentPlanId = userInfo.plan_id
    const hasActiveSubscribe = subscribe.expired_at != null && subscribe.expired_at > Math.floor(Date.now() / 1000)

    const proceed = async () => {
      const orders = await fetchOrders()
      const pending = orders?.[0]
      if (!pending) {
        await doCreateOrder()
        return
      }
      if (pending.status !== 0 && pending.status !== 1) {
        await doCreateOrder()
        return
      }
      Modal.confirm({
        title: i18n.t('注意'),
        content: i18n.t('你还有未完成的订单，购买前需要先进行取消，确定取消先前的订单吗？'),
        okText: i18n.t('确定取消'),
        cancelText: i18n.t('返回我的订单'),
        onOk: async () => {
          await cancelOrder(pending.trade_no)
          await doCreateOrder()
        },
        onCancel: () => navigate('/order'),
      })
    }

    if (currentPlanId && currentPlanId !== detailPlan.id && hasActiveSubscribe) {
      Modal.confirm({
        title: i18n.t('注意'),
        content: i18n.t('变更订阅会导致当前订阅被新订阅覆盖，请注意。'),
        okText: i18n.t('继续下单'),
        cancelText: i18n.t('取消'),
        onOk: () => void proceed(),
      })
      return
    }

    await proceed()
  }

  const filteredPlans = useMemo(() => {
    const list = plans || []
    if (tab === 0) return list
    if (tab === 1) {
      return list.filter(
        (p) =>
          p.month_price ||
          p.quarter_price ||
          p.half_year_price ||
          p.year_price ||
          p.two_year_price ||
          p.three_year_price,
      )
    }
    if (tab === 2) {
      return list.filter((p) => p.onetime_price)
    }
    return list
  }, [plans, tab])

  const renderPlanCardContent = (content: string | null | undefined) => {
    if (!content) return null
    const features = parsePlanContent(content)
    if (features && Array.isArray(features)) {
      return (
        <div className="mb-3">
          {features.map((item) => (
            <div
              key={item.feature}
              style={{
                textAlign: 'left',
                marginBottom: 8,
                opacity: item.support ? 1 : 0.3,
              }}
            >
              {item.support ? (
                <i className="si si-check text-primary" style={{ fontSize: 21, verticalAlign: 'sub' }} />
              ) : (
                <i className="si si-close text-primary" style={{ fontSize: 21, verticalAlign: 'sub' }} />
              )}
              <span style={{ paddingLeft: 8 }}>{item.feature}</span>
            </div>
          ))}
        </div>
      )
    }
    return <div className="mb-3" dangerouslySetInnerHTML={{ __html: content }} />
  }

  const renderPlanDetailContent = (content: string | null | undefined) => {
    if (!content) return null
    const features = parsePlanContent(content)
    if (features && Array.isArray(features)) {
      return (
        <div className="v2board-plan-content px-3">
          {features.map((item) => (
            <div
              key={item.feature}
              style={{
                textAlign: 'left',
                marginBottom: 8,
                opacity: item.support ? 1 : 0.3,
              }}
            >
              {item.support ? (
                <i className="si si-check text-primary" style={{ fontSize: 21, verticalAlign: 'sub' }} />
              ) : (
                <i className="si si-close text-primary" style={{ fontSize: 21, verticalAlign: 'sub' }} />
              )}
              <span style={{ paddingLeft: 8 }}>{item.feature}</span>
            </div>
          ))}
        </div>
      )
    }
    return <div className="v2board-plan-content" dangerouslySetInnerHTML={{ __html: content }} />
  }

  const renderSpinner = () => (
    <div className="spinner-grow text-primary" role="status" aria-label="Loading">
      <span className="sr-only">{i18n.t('加载中...')}</span>
    </div>
  )

  return (
    <>
      {planId ? (
        <>
          {detailLoading ? renderSpinner() : null}
          {detailError ? (
            <div className="alert alert-danger" role="alert">
              <p className="mb-0">{detailError}</p>
            </div>
          ) : null}

          {!detailLoading && !detailError && detailPlan ? (
            userInfo?.plan_id === detailPlan.id && !detailPlan.renew ? (
                <div className="block block-rounded">
                  <div className="block-content">
                    <Result
                      status="info"
                      title={i18n.t('该订阅无法续费，仅允许新用户购买')}
                      subTitle={
                        <Button className="mt-3" type="primary" onClick={() => navigate('/plan')}>
                          {i18n.t('选择其他订阅')}
                        </Button>
                      }
                    />
                  </div>
                </div>
            ) : (
              <div className="row" id="cashier">
                <div className="col-md-8 col-sm-12">
                  <div className="block block-link-pop block-rounded py-3" style={{ backgroundColor: '#fff' }}>
                    <h4 className="mb-0 px-3">{detailPlan.name}</h4>
                    {renderPlanDetailContent(detailPlan.content ?? null)}
                  </div>

                    <div className="block block-rounded js-appear-enabled">
                    <div className="block-header block-header-default">
                      <h3 className="block-title">{i18n.t('付款周期')}</h3>
                      <div className="block-options" />
                    </div>
                    <div className="block-content p-0">
                      {periodKeys.map((key) => (
                        <div
                          key={key}
                          className={`v2board-select ${selectPeriod === key ? 'active border-primary' : ''}`}
                          onClick={() => setSelectPeriod(key)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') setSelectPeriod(key)
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <span className={`v2board-select-radio ${selectPeriod === key ? 'checked' : ''}`} />
                            {i18n.t(PERIOD_LABELS[key] ?? key)}
                          </div>
                          <div style={{ flex: 1, textAlign: 'right' }}>
                            <span className="price">
                              {formatCurrency(typeof detailPlan[key] === 'number' ? (detailPlan[key] as number) : null)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="col-md-4 col-sm-12">
                  <div
                    className="block block-link-pop block-rounded  px-3 py-3 mb-2 text-light"
                    style={{ background: '#35383D' }}
                  >
                    <input
                      type="text"
                      className="form-control v2board-input-coupon p-0"
                      placeholder={i18n.t('有优惠券？')}
                      value={couponCode}
                      onChange={(e) => setCouponCode((e.target as HTMLInputElement).value)}
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ position: 'absolute', right: 30, top: 17 }}
                      onClick={() => void handleCheckCoupon()}
                      disabled={couponLoading}
                    >
                      <i className="fa fa-fw fa-ticket-alt mr-2" />
                      {i18n.t('验证')}
                    </button>
                  </div>

                  <div
                    className="block block-link-pop block-rounded  px-3 py-3 text-light"
                    style={{ background: '#35383D' }}
                  >
                    <h5 className="text-light mb-3">{i18n.t('订单总额')}</h5>

                    <div className="row no-gutters pb-3" style={{ borderBottom: '1px solid #646669' }}>
                      <div className="col-8">
                        {detailPlan.name} x {i18n.t(PERIOD_LABELS[selectPeriod] ?? selectPeriod)}
                      </div>
                      <div className="col-4 text-right">
                        {config?.currency_symbol ?? ''}
                        {totalAmount ? (totalAmount.base / 100).toFixed(2) : '--'}
                      </div>
                    </div>

                    {coupon && totalAmount ? (
                      <div>
                        <div className="pt-3" style={{ color: '#646669' }}>
                          {i18n.t('折扣')}
                        </div>
                        <div className="row no-gutters py-3" style={{ borderBottom: '1px solid #646669' }}>
                          <div className="col-8">{coupon.name || coupon.code}</div>
                          <div className="col-4 text-right">
                            - {config?.currency_symbol ?? ''}
                            {(computeDiscount(totalAmount.base, coupon) / 100).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="pt-3" style={{ color: '#646669' }}>
                      {i18n.t('总计')}
                    </div>
                    <h1 className="text-light mt-3 mb-3">
                      {config?.currency_symbol ?? ''} {totalAmount ? (totalAmount.total / 100).toFixed(2) : '--'} {config?.currency ?? ''}
                    </h1>
                    <button
                      type="button"
                      className="btn btn-block btn-primary"
                      disabled={ordering}
                      onClick={() => void preOrder()}
                    >
                      {ordering ? <LoadingOutlined /> : (
                        <span>
                          <i className="far fa-check-circle" /> {i18n.t('下单')}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          ) : null}
        </>
      ) : (
        <>
          <h2 className="font-weight-normal mb-4 m-3 mx-xl-0 mt-xl-0 mt-4">{i18n.t('选择最适合你的计划')}</h2>

          <div className="mb-3 font-size-sm mt-3 m-3 mx-xl-0">
            <span className="v2board-plan-tabs border-primary text-primary">
              {LIST_TABS.map((t) => (
                <span
                  key={t.key}
                  className={tab === t.key ? 'active bg-primary' : ''}
                  onClick={() => setTab(t.key)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') setTab(t.key)
                  }}
                >
                  {i18n.t(t.labelId)}
                </span>
              ))}
            </span>
		          </div>

	          {planError ? (
	            <div className="alert alert-danger" role="alert">
	              <p className="mb-0">{planError}</p>
	            </div>
	          ) : null}
	          {planLoading || (!planError && plans.length <= 0) ? renderSpinner() : null}

	          {!planLoading && !planError && plans.length > 0 ? (
	            <div className="row">
              {filteredPlans.map((plan) => {
                const unit = pickUnitPrice(plan)
                if (!unit) return null
                const soldOut = isSoldOut(plan)
                const almost = isAlmostSoldOut(plan)

                return (
                  <div key={plan.id} className="col-md-12 col-xl-4">
                    <a
                      className="block block-link-pop block-rounded m-3 mx-xl-0"
                      href="javascript:void(0);"
                      onClick={(event) => {
                        event.preventDefault()
                        if (soldOut) return
                        navigate(`/plan/${plan.id}`)
                      }}
                    >
                      <div className="block-header plan">
                        <h3 className="block-title">{plan.name}</h3>
                        {almost ? <span className="v2board-sold-out-tag">{i18n.t('即将售罄')}</span> : null}
                      </div>
                      <div className="block-content bg-gray-light">
                        <div className="py-2">
                          <p className="h1 mb-2">
                            {config?.currency_symbol ?? ''} {(unit.price / 100).toFixed(2)}
                          </p>
                          <p className="h6 text-muted">{i18n.t(PERIOD_LABELS[unit.key] ?? unit.key)}</p>
                        </div>
	                      </div>
	                      <div className="block-content py-3">
	                        {renderPlanCardContent(plan.content ?? null)}
	                        <button type="button" disabled={soldOut} className="btn btn-sm btn-alt-primary">
	                          {soldOut ? i18n.t('已售罄') : i18n.t('立即订阅')}
	                        </button>
	                      </div>
	                    </a>
	                  </div>
	                )
	              })}
	            </div>
	          ) : null}
	        </>
	      )}
    </>
  )
}
