import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getAdminOverview,
  getOrderStats,
  getQueueMonitorStatus,
  getServerLastRank,
  getServerTodayRank,
  getSiteConfig,
  getUserLastRank,
  getUserTodayRank,
  type OrderStatItem,
  type OverviewStats,
  type ServerRankItem,
  type UserRankItem,
} from '@/api/admin'

type DashboardState = {
  overview: OverviewStats | null
  currency: string
  queueStatus: string | null
  orderStats: OrderStatItem[]
  serverTodayRank: ServerRankItem[]
  serverLastRank: ServerRankItem[]
  userTodayRank: UserRankItem[]
  userLastRank: UserRankItem[]
}

function formatMoney(value: number | null | undefined, currency: string) {
  return `${((value ?? 0) / 100).toFixed(2)} ${currency}`
}

function formatTraffic(value: unknown) {
  return `${Number(value ?? 0).toFixed(2)} GB`
}

function RankChartCard({
  title,
  rows,
  nameKey,
}: {
  title: string
  rows: Array<Record<string, unknown>>
  nameKey: string
}) {
  const maxTotal = Math.max(...rows.map((row) => Number(row.total ?? 0)), 0)

  return (
    <div className="block border-bottom v2board-dashboard-rank-card">
      <div className="block-header block-header-default">
        <h3 className="block-title">{title}</h3>
      </div>
      <div className="block-content">
        {rows.length ? (
          <div className="v2board-dashboard-chart-panel">
            <div className="v2board-rank-list">
              {rows.map((row, index) => {
                const total = Number(row.total ?? 0)
                const percent = maxTotal > 0 ? Math.max((total / maxTotal) * 100, 8) : 8

                return (
                  <div key={`${String(row[nameKey] ?? index)}-${index}`} className="v2board-rank-item">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="font-w600 text-truncate pr-3">{String(row[nameKey] ?? '-')}</div>
                      <div className="text-muted text-nowrap">{formatTraffic(total)}</div>
                    </div>
                    <div className="v2board-rank-progress">
                      <div className="v2board-rank-progress-bar" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="v2board-dashboard-empty">暂无数据</div>
        )}
      </div>
    </div>
  )
}

function OrderTrendChart({
  rows,
  currency,
}: {
  rows: Array<Record<string, number | string>>
  currency: string
}) {
  const maxIncome = Math.max(...rows.map((row) => Number(row['收款金额'] ?? 0)), 0)

  return (
    <div className="v2board-order-chart v2board-dashboard-chart-panel">
      <div className="v2board-order-chart-legend">
        <span>收款金额 ({currency})</span>
        <span>收款笔数 / 注册人数</span>
      </div>
      <div className="v2board-order-chart-bars">
        {rows.map((row) => {
          const income = Number(row['收款金额'] ?? 0)
          const percent = maxIncome > 0 ? Math.max((income / maxIncome) * 100, income > 0 ? 6 : 0) : 0

          return (
            <div key={String(row.date)} className="v2board-order-chart-bar-item">
              <div className="v2board-order-chart-value">{income.toFixed(2)}</div>
              <div className="v2board-order-chart-bar-wrap">
                <div className="v2board-order-chart-bar" style={{ height: `${percent}%` }} />
              </div>
              <div className="v2board-order-chart-meta">
                <div>{Number(row['收款笔数'] ?? 0)} 单</div>
                <div>{Number(row['注册人数'] ?? 0)} 人</div>
              </div>
              <div className="v2board-order-chart-label">{String(row.date).slice(5)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [state, setState] = useState<DashboardState>({
    overview: null,
    currency: 'CNY',
    queueStatus: null,
    orderStats: [],
    serverTodayRank: [],
    serverLastRank: [],
    userTodayRank: [],
    userLastRank: [],
  })

  useEffect(() => {
    let active = true

    async function bootstrap() {
      setLoading(true)
      const [
        overviewResult,
        configResult,
        orderResult,
        serverTodayResult,
        serverLastResult,
        userTodayResult,
        userLastResult,
        queueMonitorResult,
      ] = await Promise.allSettled([
        getAdminOverview(),
        getSiteConfig(),
        getOrderStats(),
        getServerTodayRank(),
        getServerLastRank(),
        getUserTodayRank(),
        getUserLastRank(),
        getQueueMonitorStatus(),
      ])

      if (!active) {
        return
      }

      setState({
        overview: overviewResult.status === 'fulfilled' ? overviewResult.value : null,
        currency:
          configResult.status === 'fulfilled' ? configResult.value.site?.currency ?? 'CNY' : 'CNY',
        orderStats: orderResult.status === 'fulfilled' ? orderResult.value : [],
        serverTodayRank: serverTodayResult.status === 'fulfilled' ? serverTodayResult.value : [],
        serverLastRank: serverLastResult.status === 'fulfilled' ? serverLastResult.value : [],
        userTodayRank: userTodayResult.status === 'fulfilled' ? userTodayResult.value : [],
        userLastRank: userLastResult.status === 'fulfilled' ? userLastResult.value : [],
        queueStatus:
          queueMonitorResult.status === 'fulfilled' ? queueMonitorResult.value?.status ?? null : null,
      })
      setLoading(false)
    }

    bootstrap()

    return () => {
      active = false
    }
  }, [])

  const orderChartRows = useMemo(() => {
    const grouped = new Map<string, Record<string, number | string>>()

    state.orderStats.forEach((item) => {
      const current = grouped.get(item.date) ?? { date: item.date }
      current[item.type] = item.value
      grouped.set(item.date, current)
    })

    return Array.from(grouped.values()).slice(-10).reverse()
  }, [state.orderStats])

  if (loading) {
    return (
      <div className="content content-full v2board-page-loading">
        <div className="spinner-grow text-primary" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    )
  }

  const overview = state.overview

  return (
    <>
      {state.queueStatus && state.queueStatus !== 'running' ? (
        <div className="row v2board-dashboard-alert-row">
          <div className="col-lg-12">
            <div className="alert alert-danger v2board-dashboard-alert" role="alert">
              <p className="mb-0">当前队列服务运行异常，可能会导致业务无法使用。</p>
            </div>
          </div>
        </div>
      ) : null}

      {overview?.ticket_pending_total ? (
        <div className="alert alert-danger v2board-dashboard-alert" role="alert">
          <p className="mb-0">
            有 {overview.ticket_pending_total} 条工单等待处理，
            <button type="button" className="v2board-link-button alert-link ml-1" onClick={() => navigate('/ticket')}>
              立即处理
            </button>
          </p>
        </div>
      ) : null}

      {overview?.commission_pending_total ? (
        <div className="alert alert-danger v2board-dashboard-alert" role="alert">
          <p className="mb-0">
            有 {overview.commission_pending_total} 笔佣金等待确认，
            <button
              type="button"
              className="v2board-link-button alert-link ml-1"
              onClick={() => navigate('/order?status=3&commission_status=0&commission_balance=0&commission_balance_condition=%3E&is_commission=1')}
            >
              立即处理
            </button>
          </p>
        </div>
      ) : null}

      <div className="mb-0 block border-bottom js-classic-nav d-none d-sm-block v2board-dashboard-shortcuts">
        <div className="block-content block-content-full">
          <div className="row no-gutters border">
            {[
              ['系统设置', 'si si-equalizer', '/config/system'],
              ['订单管理', 'si si-list', '/order'],
              ['订阅管理', 'si si-bag', '/plan'],
              ['用户管理', 'si si-users', '/user'],
            ].map(([title, icon, href]) => (
              <div key={href} className="col-sm-6 col-xl-3 js-appear-enabled animated" data-toggle="appear">
                <button
                  type="button"
                  className="block block-bordered block-link-pop text-center mb-0 w-100 v2board-plain-button v2board-dashboard-shortcut"
                  onClick={() => navigate(href)}
                >
                  <div className="block-content block-content-full text-center">
                    <span className="v2board-dashboard-shortcut-icon">
                      <i className={`fa-2x ${icon} text-primary d-none d-sm-inline-block`} />
                    </span>
                    <div className="font-w600 text-uppercase">{title}</div>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="row no-gutters">
        <div className="col-lg-12 js-appear-enabled animated" data-toggle="appear">
          <div className="block border-bottom mb-0 v2board-stats-bar v2board-dashboard-stats">
            <div className="block-content">
              <div className="v2board-dashboard-stats-track">
                <div className="pr-4 pr-sm-5 pl-0 pl-sm-3 v2board-dashboard-stat v2board-dashboard-stat-card">
                  <i className="fa fa-users fa-2x text-gray-light float-right" />
                  <div className="text-muted mb-1" style={{ width: 120 }}>
                    在线人数
                  </div>
                  <div className="display-4 text-black font-w300 mb-2">{overview?.online_user ?? 0}</div>
                </div>
                <div className="pr-4 pr-sm-5 pl-0 pl-sm-3 v2board-dashboard-stat v2board-dashboard-stat-card">
                  <i className="fa fa-chart-line fa-2x text-gray-light float-right" />
                  <p className="text-muted w-75 mb-1">今日收入</p>
                  <p className="display-4 text-black font-w300 mb-2">
                    {formatMoney(overview?.day_income, state.currency)}
                  </p>
                </div>
                <div className="pr-4 pr-sm-5 pl-0 pl-sm-3 v2board-dashboard-stat v2board-dashboard-stat-card">
                  <i className="fa fa-user fa-2x text-gray-light float-right" />
                  <div className="text-muted mb-1" style={{ width: 120 }}>
                    实时注册
                  </div>
                  <div className="display-4 text-black font-w300 mb-2">{overview?.day_register_total ?? 0}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-12 js-appear-enabled animated" data-toggle="appear">
          <div className="block border-bottom mb-0 v2board-stats-bar v2board-dashboard-summary">
            <div className="block-content block-content-full">
              <div className="v2board-dashboard-summary-track">
                <div className="pr-4 pr-sm-5 pl-0 pl-sm-3 v2board-dashboard-summary-item">
                  <p className="fs-3 text-dark mb-0">{formatMoney(overview?.month_income, state.currency)}</p>
                  <p className="text-muted mb-0">本月收入</p>
                </div>
                <div className="px-4 px-sm-5 border-start v2board-dashboard-summary-item">
                  <p className="fs-3 text-dark mb-0">{formatMoney(overview?.last_month_income, state.currency)}</p>
                  <p className="text-muted mb-0">上月收入</p>
                </div>
                <div className="px-4 px-sm-5 border-start v2board-dashboard-summary-item">
                  <p className="fs-3 text-dark mb-0">
                    {formatMoney(overview?.commission_last_month_payout, state.currency)}
                  </p>
                  <p className="text-muted mb-0">上月佣金支出</p>
                </div>
                <div className="px-4 px-sm-5 border-start v2board-dashboard-summary-item">
                  <p className="fs-3 text-dark mb-0">{overview?.month_register_total ?? '-'}</p>
                  <p className="text-muted mb-0">本月新增用户</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-12 js-appear-enabled animated" data-toggle="appear">
          <div className="block border-bottom mb-0">
            <div className="block-header block-header-default">
              <h3 className="block-title">近 10 日订单统计</h3>
            </div>
            <div className="block-content">
              {orderChartRows.length ? (
                <OrderTrendChart rows={orderChartRows} currency={state.currency} />
              ) : (
                <div className="v2board-dashboard-empty">暂无数据</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row mt-xl-3">
        <div className="col-lg-6 js-appear-enabled animated pr-xl-1" data-toggle="appear">
          <RankChartCard title="今日节点流量排行" rows={state.serverTodayRank} nameKey="server_name" />
        </div>
        <div className="col-lg-6 js-appear-enabled animated" data-toggle="appear">
          <RankChartCard title="昨日节点流量排行" rows={state.serverLastRank} nameKey="server_name" />
        </div>
        <div className="col-lg-6 js-appear-enabled animated pr-xl-1" data-toggle="appear">
          <RankChartCard title="今日用户流量排行" rows={state.userTodayRank} nameKey="email" />
        </div>
        <div className="col-lg-6 js-appear-enabled animated" data-toggle="appear">
          <RankChartCard title="昨日用户流量排行" rows={state.userLastRank} nameKey="email" />
        </div>
      </div>
    </>
  )
}
