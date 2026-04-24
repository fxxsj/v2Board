import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Drawer, Dropdown, Input, Tooltip, message, Modal, Select } from 'antd'
import type { MenuProps } from 'antd'
import {
  assignOrder,
  cancelOrder,
  getAdminPlans,
  getAdminUserInfoById,
  getOrderDetail,
  getOrders,
  paidOrder,
  updateOrder,
  type AdminOrder,
  type AdminOrderDetail,
  type AdminPlan,
  type AdminUserProfile,
} from '@/api/admin'

type FilterCondition = '>' | '<' | '=' | '>=' | '<=' | '模糊' | '!='

type OrderFilter = {
  key: string
  condition: FilterCondition
  value: string
}

type FilterField = {
  key: string
  title: string
  conditions: FilterCondition[]
  type?: 'select' | 'text'
  options?: Array<{ label: string; value: string }>
}

const periodText: Record<string, string> = {
  month_price: '月付',
  quarter_price: '季付',
  half_year_price: '半年付',
  year_price: '年付',
  two_year_price: '两年付',
  three_year_price: '三年付',
  onetime_price: '一次性',
  reset_price: '流量重置包',
}

const orderStatusText: Record<number, string> = {
  0: '待支付',
  1: '开通中',
  2: '已取消',
  3: '已完成',
  4: '已折抵',
}

const commissionStatusText: Record<number, string> = {
  0: '待确认',
  1: '发放中',
  2: '已发放',
  3: '已驳回',
}

const orderTypeText: Record<number, string> = {
  1: '新购',
  2: '续费',
  3: '变更',
  4: '流量包',
  9: '充值',
}

const orderStatusBadgeClass: Record<number, string> = {
  0: 'badge-danger',
  1: 'badge-primary',
  2: 'badge-secondary',
  3: 'badge-success',
  4: 'badge-secondary',
}

const commissionStatusBadgeClass: Record<number, string> = {
  0: 'badge-secondary',
  1: 'badge-primary',
  2: 'badge-success',
  3: 'badge-danger',
}

const filterFields: FilterField[] = [
  { key: 'email', title: '邮箱', conditions: ['模糊', '='] },
  { key: 'trade_no', title: '订单号', conditions: ['模糊', '='] },
  {
    key: 'status',
    title: '订单状态',
    conditions: ['='],
    type: 'select',
    options: [
      { label: '未支付', value: '0' },
      { label: '已支付', value: '1' },
      { label: '已取消', value: '2' },
      { label: '已完成', value: '3' },
      { label: '已折抵', value: '4' },
    ],
  },
  {
    key: 'commission_status',
    title: '佣金状态',
    conditions: ['='],
    type: 'select',
    options: [
      { label: '待确认', value: '0' },
      { label: '发放中', value: '1' },
      { label: '已发放', value: '2' },
      { label: '已驳回', value: '3' },
    ],
  },
  { key: 'user_id', title: '用户 ID', conditions: ['='] },
  { key: 'invite_user_id', title: '邀请人 ID', conditions: ['=', '!='] },
  { key: 'callback_no', title: '回调单号', conditions: ['模糊'] },
  { key: 'commission_balance', title: '佣金金额', conditions: ['>', '<', '=', '!=', '>=', '<='] },
]

function toMoney(value: number | null | undefined) {
  return ((value ?? 0) / 100).toFixed(2)
}

function formatDate(value: number | null | undefined) {
  if (!value) return '-'
  const date = new Date(value * 1000)
  const pad = (input: number) => String(input).padStart(2, '0')
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatDetailDate(value: number | null | undefined) {
  if (!value) return '-'
  const date = new Date(value * 1000)
  const pad = (input: number) => String(input).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function buildUserFilterPath(key: string, condition: FilterCondition, value: string) {
  const params = new URLSearchParams()
  params.set('filter_key_0', key)
  params.set('filter_condition_0', condition)
  params.set('filter_value_0', value)
  return `/user?${params.toString()}`
}

function getFilterField(key: string) {
  return filterFields.find((field) => field.key === key)
}

function getOrderPageSize() {
  if (typeof window === 'undefined') return 10
  const stored = Number(localStorage.getItem('order_manage_page_size'))
  return [10, 50, 100, 150].includes(stored) ? stored : 10
}

function getFilterLabel(filter: OrderFilter) {
  const field = getFilterField(filter.key)
  const optionLabel = field?.options?.find((option) => option.value === String(filter.value))?.label
  return `${field?.title ?? filter.key} ${filter.condition} ${optionLabel ?? filter.value}`
}

function parseSearchParams(searchParams: URLSearchParams) {
  const filters: OrderFilter[] = []
  const filterKeys = ['email', 'trade_no', 'status', 'commission_status', 'user_id', 'invite_user_id', 'callback_no', 'commission_balance']

  filterKeys.forEach((key) => {
    const value = searchParams.get(key)
    if (!value) return
    const condition = (searchParams.get(`${key}_condition`) as FilterCondition | null) ?? '='
    filters.push({
      key,
      condition,
      value,
    })
  })

  return {
    filters,
    commissionOnly: searchParams.get('is_commission') === '1',
  }
}

function OrderDetailModal({
  open,
  orderId,
  plans,
  onJumpUserFilter,
  onCancel,
}: {
  open: boolean
  orderId: number | null
  plans: AdminPlan[]
  onJumpUserFilter: (key: string, condition: FilterCondition, value: string) => void
  onCancel: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [order, setOrder] = useState<AdminOrderDetail | null>(null)
  const [user, setUser] = useState<AdminUserProfile | null>(null)
  const [inviteUser, setInviteUser] = useState<AdminUserProfile | null>(null)

  useEffect(() => {
    if (!open || orderId === null) return

    const currentOrderId = orderId
    let active = true

    async function bootstrap() {
      setLoading(true)
      try {
        const detail = await getOrderDetail(currentOrderId)
        if (!active) return
        setOrder(detail)

        const [userInfo, inviteInfo] = await Promise.all([
          getAdminUserInfoById(detail.user_id),
          detail.invite_user_id ? getAdminUserInfoById(detail.invite_user_id) : Promise.resolve(null),
        ])

        if (!active) return
        setUser(userInfo)
        setInviteUser(inviteInfo)
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    bootstrap()

    return () => {
      active = false
      setOrder(null)
      setUser(null)
      setInviteUser(null)
    }
  }, [open, orderId])

  const planName = useMemo(
    () => plans.find((plan) => plan.id === order?.plan_id)?.name ?? '-',
    [order?.plan_id, plans],
  )

  const detailRows: Array<[string, ReactNode]> = order && user
    ? [
        [
          '邮箱',
          <button type="button" className="v2board-link-button" onClick={() => onJumpUserFilter('email', '模糊', user.email)}>
            {user.email}
          </button>,
        ],
        ['订单号', order.trade_no],
        ['订单周期', periodText[order.period] ?? order.period],
        ['订单状态', orderStatusText[order.status] ?? String(order.status)],
        ['订阅计划', planName],
        ['回调单号', order.callback_no || '-'],
        ['支付金额', toMoney(order.total_amount)],
        ['余额支付', toMoney(order.balance_amount)],
        ['优惠金额', toMoney(order.discount_amount)],
        ['退回金额', toMoney(order.refund_amount)],
        ['折抵金额', toMoney(order.surplus_amount)],
        ['创建时间', formatDetailDate(order.created_at)],
        ['更新时间', formatDetailDate(order.updated_at)],
      ]
    : []

  const commissionRows: Array<[string, ReactNode]> =
    order && user && order.invite_user_id && order.status === 3
      ? [
          [
            '邀请人',
            inviteUser?.email ? (
              <button type="button" className="v2board-link-button" onClick={() => onJumpUserFilter('invite_by_email', '模糊', inviteUser.email)}>
                {inviteUser.email}
              </button>
            ) : (
              order.invite_user_id
            ),
          ],
          ['佣金金额', toMoney(order.commission_balance)],
          ...(order.actual_commission_balance ? [['实际发放', toMoney(order.actual_commission_balance)] as [string, ReactNode]] : []),
          ['佣金状态', commissionStatusText[order.commission_status ?? 0] ?? '-'],
        ]
      : []

  return (
    <Modal className="v2board-detail-modal" title="订单信息" open={open} footer={null} onCancel={onCancel}>
      {loading ? (
        <div className="v2board-detail-loading">
          <div className="spinner-grow text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
        </div>
      ) : order && user ? (
        <div className="v2board-detail-list">
          <div className="v2board-detail-section">
            {detailRows.map(([label, value]) => (
              <div key={label} className="row v2board-detail-row">
                <div className="col-4 col-sm-3 v2board-detail-label">{label}</div>
                <div className="col-8 col-sm-9 v2board-detail-value">{value}</div>
              </div>
            ))}
          </div>

          {commissionRows.length ? (
            <div className="v2board-detail-section">
              {commissionRows.map(([label, value]) => (
                <div key={label} className="row v2board-detail-row">
                  <div className="col-4 col-sm-3 v2board-detail-label">{label}</div>
                  <div className="col-8 col-sm-9 v2board-detail-value">{value}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="v2board-detail-empty">暂无订单数据</div>
      )}
    </Modal>
  )
}

function AssignOrderModal({
  open,
  plans,
  loading,
  defaultEmail,
  onCancel,
  onSubmit,
}: {
  open: boolean
  plans: AdminPlan[]
  loading: boolean
  defaultEmail?: string
  onCancel: () => void
  onSubmit: (payload: { email: string; plan_id: number; period: string; total_amount: number }) => Promise<void>
}) {
  const [form, setForm] = useState({
    email: defaultEmail ?? '',
    plan_id: undefined as number | undefined,
    period: undefined as string | undefined,
    total_amount: '',
  })

  useEffect(() => {
    if (!open) return
    setForm({
      email: defaultEmail ?? '',
      plan_id: undefined,
      period: undefined,
      total_amount: '',
    })
  }, [defaultEmail, open])

  return (
    <Drawer
      title="订单分配"
      open={open}
      width="80%"
      className="v2board-editor-drawer v2board-order-editor-drawer"
      destroyOnHidden
      onClose={onCancel}
      footer={
        <div className="v2board-drawer-action">
          <button type="button" className="btn btn-alt-secondary mr-2" onClick={onCancel}>
            取消
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={loading}
            onClick={async () => {
              const totalAmount = Number(form.total_amount)
              if (!form.email.trim() || !form.plan_id || !form.period || !form.total_amount.trim()) {
                message.error('请完整填写订单信息')
                return
              }
              if (!Number.isFinite(totalAmount)) {
                message.error('支付金额格式不正确')
                return
              }

              await onSubmit({
                email: form.email.trim(),
                plan_id: form.plan_id,
                period: form.period,
                total_amount: totalAmount,
              })
            }}
          >
            提交
          </button>
        </div>
      }
    >
      <div className="v2board-editor-form">
        <div className="v2board-editor-section mb-0">
          <div className="v2board-editor-section-title">订单信息</div>
          <div className="form-group">
            <label className="mb-2">用户邮箱</label>
            <Input
              placeholder="请输入用户邮箱"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="mb-2">请选择订阅</label>
            <Select
              className="w-100"
              placeholder="请选择订阅"
              value={form.plan_id}
              options={plans.map((plan) => ({ label: plan.name, value: plan.id }))}
              onChange={(value) => setForm((current) => ({ ...current, plan_id: value }))}
            />
          </div>
          <div className="form-group">
            <label className="mb-2">请选择周期</label>
            <Select
              className="w-100"
              placeholder="请选择周期"
              value={form.period}
              options={Object.entries(periodText).map(([value, label]) => ({ value, label }))}
              onChange={(value) => setForm((current) => ({ ...current, period: value }))}
            />
          </div>
          <div className="form-group mb-0">
            <label className="mb-2">支付金额</label>
            <Input
              placeholder="请输入需要支付的金额"
              addonAfter="¥"
              value={form.total_amount}
              onChange={(event) => setForm((current) => ({ ...current, total_amount: event.target.value }))}
            />
          </div>
        </div>
      </div>
    </Drawer>
  )
}

export function OrderPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialState = useMemo(() => parseSearchParams(searchParams), [searchParams])
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [plans, setPlans] = useState<AdminPlan[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(() => getOrderPageSize())
  const [filters, setFilters] = useState<OrderFilter[]>(initialState.filters)
  const [commissionOnly, setCommissionOnly] = useState(initialState.commissionOnly)
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [filterDraft, setFilterDraft] = useState<OrderFilter[]>(initialState.filters)
  const [commissionDraft, setCommissionDraft] = useState(initialState.commissionOnly)
  const [detailOrderId, setDetailOrderId] = useState<number | null>(null)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [assignLoading, setAssignLoading] = useState(false)

  const loadOrders = async (params?: {
    page?: number
    filters?: OrderFilter[]
    commissionOnly?: boolean
  }) => {
    setLoading(true)
    try {
      const nextPage = params?.page ?? page
      const nextFilters = params?.filters ?? filters
      const nextCommissionOnly = params?.commissionOnly ?? commissionOnly

      const result = await getOrders({
        current: nextPage,
        pageSize,
        is_commission: nextCommissionOnly ? 1 : undefined,
        filter: nextFilters.map((item) => ({
          key: item.key,
          condition: item.condition,
          value: item.value,
        })),
      })

      setOrders(result.data)
      setTotal(result.total)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    Promise.allSettled([getAdminPlans()]).then(([planResult]) => {
      if (!active) return
      setPlans(planResult.status === 'fulfilled' ? planResult.value : [])
    })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    setPage(1)
    loadOrders({ page: 1, filters, commissionOnly })
  }, [filters, commissionOnly, pageSize])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [pageSize, total])

  return (
    <>
      <div className="block border-bottom v2board-order-page">
        <div className="bg-white">
          <div className="v2board-table-action v2board-list-toolbar p-3">
            <div className="v2board-list-toolbar-left">
              <button
                type="button"
                className={`btn btn-sm ${filters.length || commissionOnly ? 'btn-primary' : 'btn-alt-primary'}`}
                onClick={() => {
                  setFilterDraft(filters)
                  setCommissionDraft(commissionOnly)
                  setFilterModalOpen(true)
                }}
              >
                <i className="fa fa-filter mr-1" />
                过滤器
              </button>
              <Tooltip title="添加订单">
                <button
                  type="button"
                  className="btn btn-sm btn-alt-primary ml-2 v2board-toolbar-icon"
                  onClick={() => setAssignModalOpen(true)}
                >
                  <i className="fa fa-plus" />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        <div className="block-content p-0">
          <div className="table-responsive">
            <table className="table table-striped table-vcenter mb-0">
              <thead>
                <tr>
                  <th style={{ width: 132 }}># 订单号</th>
                  <th style={{ width: 88 }}>类型</th>
                  <th>订阅计划</th>
                  <th className="text-center" style={{ width: 100 }}>周期</th>
                  <th className="text-right" style={{ width: 108 }}>支付金额</th>
                  <th style={{ width: 164 }}>
                    订单状态
                    <Tooltip title="标记为已支付后，系统会继续执行开通并完成订单。">
                      <i className="fa fa-question-circle v2board-help-icon" />
                    </Tooltip>
                  </th>
                  <th className="text-right" style={{ width: 108 }}>佣金金额</th>
                  <th style={{ width: 164 }}>
                    佣金状态
                    <Tooltip title="标记为有效后，系统会继续处理佣金发放。">
                      <i className="fa fa-question-circle v2board-help-icon" />
                    </Tooltip>
                  </th>
                  <th className="text-right" style={{ width: 154 }}>创建时间</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-4 v2board-table-loading-row">
                      <div className="spinner-grow text-primary" role="status">
                        <span className="sr-only">Loading...</span>
                      </div>
                    </td>
                  </tr>
                ) : orders.length ? (
                  orders.map((order) => {
                    const orderMenu: MenuProps['items'] =
                      order.status === 0
                        ? [
                            { key: 'paid', label: '已支付' },
                            { key: 'cancel', label: '取消' },
                          ]
                        : []

                    const commissionMenu: MenuProps['items'] =
                      order.status === 0 || order.status === 2 || !order.commission_balance
                        ? []
                        : [
                            { key: '0', label: '待确认', disabled: order.commission_status === 0 },
                            { key: '1', label: '有效', disabled: order.commission_status === 1 },
                            { key: '3', label: '无效', disabled: order.commission_status === 3 },
                          ]

                    return (
                      <tr key={order.id}>
                        <td>
                          <button
                            type="button"
                            className="v2board-link-button"
                            onClick={() => setDetailOrderId(order.id)}
                          >
                            {order.trade_no.slice(0, 3)}...{order.trade_no.slice(-3)}
                          </button>
                        </td>
                        <td>{orderTypeText[order.type] ?? order.type}</td>
                        <td>{order.plan_name || '-'}</td>
                        <td className="text-center">{periodText[order.period] ?? order.period}</td>
                        <td className="text-right">{toMoney(order.total_amount)}</td>
                        <td>
                          <div className="d-flex align-items-center flex-wrap v2board-order-status-cell">
                            <span className="mr-2 v2board-order-status-text">
                              <i
                                className={`v2board-status-dot ${
                                  orderStatusBadgeClass[order.status] ?? 'badge-secondary'
                                }`}
                              />
                              {orderStatusText[order.status] ?? order.status}
                            </span>
                            {orderMenu.length ? (
                              <Dropdown
                                trigger={['click']}
                                menu={{
                                  items: orderMenu,
                                  onClick: async ({ key }) => {
                                    if (key === 'paid') {
                                      await paidOrder(order.trade_no)
                                      message.success('订单已标记为已支付')
                                    }
                                    if (key === 'cancel') {
                                      await cancelOrder(order.trade_no)
                                      message.success('订单已取消')
                                    }
                                    await loadOrders()
                                  },
                                }}
                              >
                                <button type="button" className="v2board-link-button v2board-dropdown-trigger v2board-row-action">
                                  <span>标记为</span>
                                  <i className="fa fa-caret-down" />
                                </button>
                              </Dropdown>
                            ) : null}
                          </div>
                        </td>
                        <td className="text-right">
                          {order.status === 0 || order.status === 2 ? '-' : order.commission_balance ? toMoney(order.commission_balance) : '-'}
                        </td>
                        <td>
                          {order.status === 0 || order.status === 2 || !order.commission_balance ? (
                            '-'
                          ) : (
                            <div className="d-flex align-items-center flex-wrap v2board-order-status-cell">
                              <span className="mr-2 v2board-order-status-text">
                                <i
                                  className={`v2board-status-dot ${
                                    commissionStatusBadgeClass[order.commission_status ?? 0] ?? 'badge-secondary'
                                  }`}
                                />
                                {commissionStatusText[order.commission_status ?? 0] ?? '-'}
                              </span>
                              {order.commission_status !== 2 && commissionMenu.length ? (
                                <Dropdown
                                  trigger={['click']}
                                  menu={{
                                    items: commissionMenu,
                                    onClick: async ({ key }) => {
                                      await updateOrder(order.trade_no, { commission_status: Number(key) })
                                      message.success('佣金状态已更新')
                                      await loadOrders()
                                    },
                                  }}
                                >
                                  <button type="button" className="v2board-link-button v2board-dropdown-trigger v2board-row-action">
                                    <span>标记为</span>
                                    <i className="fa fa-caret-down" />
                                  </button>
                                </Dropdown>
                              ) : null}
                            </div>
                          )}
                        </td>
                        <td className="text-right">{formatDate(order.created_at)}</td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center text-muted py-4 v2board-list-empty">
                      暂无订单
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="d-flex justify-content-between align-items-center px-3 py-3 border-top v2board-list-pagination">
            <div className="v2board-pagination-tools">
              <span className="text-muted">共 {total} 条</span>
              <select
                className="form-control form-control-sm"
                value={pageSize}
                style={{ width: 110 }}
                onChange={(event) => {
                  const next = Number(event.target.value)
                  localStorage.setItem('order_manage_page_size', String(next))
                  setPageSize(next)
                }}
              >
                {[10, 50, 100, 150].map((size) => (
                  <option key={size} value={size}>
                    {size} / 页
                  </option>
                ))}
              </select>
            </div>
            <div>
              <button
                type="button"
                className="btn btn-sm btn-alt-secondary mr-2"
                disabled={page <= 1 || loading}
                onClick={async () => {
                  const nextPage = page - 1
                  setPage(nextPage)
                  await loadOrders({ page: nextPage })
                }}
              >
                上一页
              </button>
              <span className="text-muted mr-2">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-sm btn-alt-secondary"
                disabled={page >= totalPages || loading}
                onClick={async () => {
                  const nextPage = page + 1
                  setPage(nextPage)
                  await loadOrders({ page: nextPage })
                }}
              >
                下一页
              </button>
            </div>
          </div>
        </div>
      </div>

      <Drawer
        title="订单过滤器"
        open={filterModalOpen}
        width="80%"
        className="v2board-filter-drawer"
        destroyOnHidden
        onClose={() => setFilterModalOpen(false)}
        footer={
          <div className="v2board-drawer-action">
            <button
              type="button"
              className="btn btn-danger float-left"
              onClick={() => {
                setFilterDraft([])
                setCommissionDraft(false)
                setPage(1)
                setFilters([])
                setCommissionOnly(false)
                setFilterModalOpen(false)
              }}
            >
              重置
            </button>
            <button type="button" className="btn btn-alt-secondary mr-2" onClick={() => setFilterModalOpen(false)}>
              取消
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setPage(1)
                setFilters(
                  filterDraft.filter((item) => item.key && item.condition && String(item.value).trim()),
                )
                setCommissionOnly(commissionDraft)
                setFilterModalOpen(false)
              }}
            >
              检索
            </button>
          </div>
        }
      >
        {(filterDraft.length > 0 || commissionDraft) ? (
          <div className="v2board-filter-summary">
            {filterDraft
              .filter((item) => item.key && item.condition && String(item.value).trim())
              .map((filter, index) => (
                <span key={`${filter.key}-${index}`} className="badge badge-primary mr-2 mb-2">
                  {getFilterLabel(filter)}
                </span>
              ))}
            {commissionDraft ? <span className="badge badge-warning mr-2 mb-2">仅查看佣金订单</span> : null}
          </div>
        ) : null}
        {filterDraft.map((filter, index) => {
          const field = getFilterField(filter.key) ?? filterFields[0]

          return (
            <div key={index} className="row align-items-center mb-3 v2board-filter-row">
              <div className="col-sm-4 mb-2 mb-sm-0">
                <Select
                  className="w-100"
                  value={filter.key}
                  options={filterFields.map((item) => ({ label: item.title, value: item.key }))}
                  onChange={(value) => {
                    const nextField = getFilterField(value) ?? filterFields[0]
                    setFilterDraft((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              key: value,
                              condition: nextField.conditions[0],
                              value: '',
                            }
                          : item,
                      ),
                    )
                  }}
                />
              </div>
              <div className="col-sm-3 mb-2 mb-sm-0">
                <Select
                  className="w-100"
                  value={filter.condition}
                  options={field.conditions.map((item) => ({ label: item, value: item }))}
                  onChange={(value) =>
                    setFilterDraft((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, condition: value as FilterCondition } : item,
                      ),
                    )
                  }
                />
              </div>
              <div className="col-sm-4 mb-2 mb-sm-0">
                {field.type === 'select' ? (
                  <Select
                    className="w-100"
                    value={filter.value || undefined}
                    options={field.options}
                    onChange={(value) =>
                      setFilterDraft((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, value: String(value) } : item,
                        ),
                      )
                    }
                  />
                ) : (
                  <Input
                    value={filter.value}
                    onChange={(event) =>
                      setFilterDraft((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, value: event.target.value } : item,
                        ),
                      )
                    }
                  />
                )}
              </div>
              <div className="col-sm-1 text-right">
                <button
                  type="button"
                  className="btn btn-sm btn-alt-danger"
                  onClick={() =>
                    setFilterDraft((current) => current.filter((_, itemIndex) => itemIndex !== index))
                  }
                >
                  ×
                </button>
              </div>
            </div>
          )
        })}

        <div className="v2board-filter-actions">
          <button
            type="button"
            className="btn btn-sm btn-alt-primary v2board-filter-add"
            onClick={() =>
              setFilterDraft((current) => [
                ...current,
                { key: filterFields[0].key, condition: filterFields[0].conditions[0], value: '' },
              ])
            }
          >
            添加过滤条件
          </button>
          <div className="form-check mb-0">
            <input
              id="order-commission-only"
              className="form-check-input"
              type="checkbox"
              checked={commissionDraft}
              onChange={(event) => setCommissionDraft(event.target.checked)}
            />
            <label className="form-check-label" htmlFor="order-commission-only">
              仅查看佣金订单
            </label>
          </div>
        </div>
      </Drawer>

      <OrderDetailModal
        open={detailOrderId !== null}
        orderId={detailOrderId}
        plans={plans}
        onJumpUserFilter={(key, condition, value) => {
          setDetailOrderId(null)
          navigate(buildUserFilterPath(key, condition, value))
        }}
        onCancel={() => setDetailOrderId(null)}
      />

      <AssignOrderModal
        open={assignModalOpen}
        plans={plans}
        loading={assignLoading}
        onCancel={() => setAssignModalOpen(false)}
        onSubmit={async (payload) => {
          setAssignLoading(true)
          try {
            await assignOrder(payload)
            message.success('订单分配成功')
            setAssignModalOpen(false)
            setPage(1)
            await loadOrders({ page: 1 })
          } finally {
            setAssignLoading(false)
          }
        }}
      />
    </>
  )
}
