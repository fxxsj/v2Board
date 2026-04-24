import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Drawer, Dropdown, Input, Modal, Select, Spin, Table, Tooltip, message } from 'antd'
import type { MenuProps } from 'antd'
import {
  assignOrder,
  bulkBanAdminUsers,
  bulkDeleteAdminUsers,
  deleteAdminUser,
  dumpAdminUsersCsv,
  generateAdminUser,
  getAdminPlans,
  getAdminStatUser,
  getAdminUserInfoById,
  getAdminUsers,
  getServerGroups,
  resetAdminUserSecret,
  sendAdminUserMail,
  updateAdminUser,
  type AdminPlan,
  type AdminStatUserRecord,
  type AdminUser,
  type AdminUserDetail,
  type ServerGroup,
} from '@/api/admin'

type FilterCondition = '>' | '<' | '=' | '>=' | '<=' | '模糊' | '!='

type UserFilter = {
  key: string
  condition: FilterCondition
  value: string
}

type FilterField = {
  key: string
  title: string
  conditions: FilterCondition[]
  type?: 'select' | 'date'
  options?: Array<{ label: string; value: string }>
}

type UserEditFormState = {
  id: number
  email: string
  invite_user_email: string
  password: string
  balance: string
  commission_balance: string
  u: string
  d: string
  transfer_enable: string
  device_limit: string
  expired_at: string
  plan_id?: number
  banned: number
  commission_type: number
  commission_rate: string
  discount: string
  speed_limit: string
  is_admin: number
  is_staff: number
  remarks: string
}

type UserCreateFormState = {
  email_prefix: string
  email_suffix: string
  password: string
  expired_at: string
  plan_id?: number
  generate_count: string
}

type MailFormState = {
  subject: string
  content: string
}

type AssignOrderFormState = {
  email: string
  plan_id?: number
  period?: string
  total_amount: string
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

const commissionTypeOptions = [
  { value: 0, label: '跟随系统设置' },
  { value: 1, label: '循环返利' },
  { value: 2, label: '首次返利' },
]

function buildFilterFields(plans: AdminPlan[]): FilterField[] {
  return [
    { key: 'email', title: '邮箱', conditions: ['模糊'] },
    { key: 'id', title: '用户 ID', conditions: ['=', '>=', '>', '<', '<='] },
    {
      key: 'plan_id',
      title: '订阅',
      conditions: ['='],
      type: 'select',
      options: [{ label: '无订阅', value: 'null' }, ...plans.map((plan) => ({ label: plan.name, value: String(plan.id) }))],
    },
    { key: 'transfer_enable', title: '流量', conditions: ['>=', '>', '<', '<='] },
    { key: 'd', title: '下行', conditions: ['>=', '>', '<', '<='] },
    { key: 'expired_at', title: '到期时间', conditions: ['>=', '>', '<', '<='], type: 'date' },
    { key: 'uuid', title: 'UUID', conditions: ['='] },
    { key: 'token', title: 'TOKEN', conditions: ['='] },
    {
      key: 'banned',
      title: '账号状态',
      conditions: ['='],
      type: 'select',
      options: [
        { label: '正常', value: '0' },
        { label: '封禁', value: '1' },
      ],
    },
    { key: 'invite_by_email', title: '邀请人邮箱', conditions: ['模糊'] },
    { key: 'invite_user_id', title: '邀请人 ID', conditions: ['='] },
    { key: 'remarks', title: '备注', conditions: ['模糊'] },
    {
      key: 'is_admin',
      title: '管理员',
      conditions: ['='],
      type: 'select',
      options: [
        { label: '是', value: '1' },
        { label: '否', value: '0' },
      ],
    },
  ]
}

function toGb(value: number | null | undefined) {
  return ((value ?? 0) / 1073741824).toFixed(2)
}

function toMoney(value: number | null | undefined) {
  return ((value ?? 0) / 100).toFixed(2)
}

function formatDate(value: number | null | undefined) {
  if (value === null) return '长期有效'
  if (!value) return '-'
  return new Date(value * 1000).toLocaleString('zh-CN', { hour12: false })
}

function formatTraffic(value: number | null | undefined) {
  return `${toGb(value)} GB`
}

function toDateTimeLocal(value: number | null | undefined) {
  if (!value) return ''
  const date = new Date(value * 1000)
  const pad = (input: number) => String(input).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toDateFilterValue(value: string) {
  if (!value) return ''
  const timestamp = Math.floor(new Date(value).getTime() / 1000)
  return Number.isNaN(timestamp) ? '' : String(timestamp)
}

function downloadBlob(buffer: ArrayBuffer, filename: string, type = 'text/plain;charset=UTF-8') {
  const blob = new Blob([buffer], { type })
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.style.display = 'none'
  anchor.download = filename
  anchor.click()
  window.URL.revokeObjectURL(url)
}

function buildDownloadName(prefix: string, extension: string) {
  return `${prefix} ${new Date().toISOString().slice(0, 19).replace('T', ' ').replace(/:/g, '-')}.${extension}`
}

function getUserPageSize() {
  if (typeof window === 'undefined') return 10
  const stored = Number(localStorage.getItem('user_manage_page_size'))
  return [10, 50, 100, 150].includes(stored) ? stored : 10
}

function buildRequestFilters(filters: UserFilter[], searchText: string) {
  const output = filters
    .filter((item) => item.key && item.condition && String(item.value).trim())
    .map((item) => ({
      key: item.key,
      condition: item.condition,
      value: item.value,
    }))

  if (searchText.trim()) {
    output.push({
      key: 'email',
      condition: '模糊' as const,
      value: searchText.trim(),
    })
  }

  return output
}

function parseInitialFilters(searchParams: URLSearchParams) {
  const output: UserFilter[] = []

  for (let index = 0; ; index += 1) {
    const key = searchParams.get(`filter_key_${index}`)
    const condition = searchParams.get(`filter_condition_${index}`) as FilterCondition | null
    const value = searchParams.get(`filter_value_${index}`)

    if (!key && !condition && !value) break
    if (!key || !condition || value === null || !String(value).trim()) continue

    output.push({
      key,
      condition,
      value,
    })
  }

  return output
}

function getFilterLabel(filter: UserFilter, fields: FilterField[]) {
  const field = fields.find((item) => item.key === filter.key)
  const label = field?.options?.find((item) => item.value === filter.value)?.label ?? filter.value
  return `${field?.title ?? filter.key} ${filter.condition} ${label}`
}

function createEmptyCreateForm(): UserCreateFormState {
  return {
    email_prefix: '',
    email_suffix: '',
    password: '',
    expired_at: '',
    plan_id: undefined,
    generate_count: '',
  }
}

function normalizeUserDetail(detail: AdminUserDetail): UserEditFormState {
  return {
    id: detail.id,
    email: detail.email ?? '',
    invite_user_email: detail.invite_user?.email ?? detail.invite_user_email ?? '',
    password: '',
    balance: toMoney(detail.balance),
    commission_balance: toMoney(detail.commission_balance),
    u: toGb(detail.u),
    d: toGb(detail.d),
    transfer_enable: toGb(detail.transfer_enable),
    device_limit: detail.device_limit === null || detail.device_limit === undefined ? '' : String(detail.device_limit),
    expired_at: toDateTimeLocal(detail.expired_at),
    plan_id: detail.plan_id === null || detail.plan_id === undefined ? undefined : Number(detail.plan_id),
    banned: Number(detail.banned ?? 0),
    commission_type: Number(detail.commission_type ?? 0),
    commission_rate: detail.commission_rate === null || detail.commission_rate === undefined ? '' : String(detail.commission_rate),
    discount: detail.discount === null || detail.discount === undefined ? '' : String(detail.discount),
    speed_limit: detail.speed_limit === null || detail.speed_limit === undefined ? '' : String(detail.speed_limit),
    is_admin: Number(detail.is_admin ?? 0),
    is_staff: Number(detail.is_staff ?? 0),
    remarks: String(detail.remarks ?? ''),
  }
}

function parseNullableNumber(value: string) {
  const text = value.trim()
  if (!text) return null
  const result = Number(text)
  return Number.isNaN(result) ? null : result
}

function parseNullableInteger(value: string) {
  const result = parseNullableNumber(value)
  return result === null ? null : Math.round(result)
}

function parseOptionalMoney(value: string) {
  const result = parseNullableNumber(value)
  return result === null ? 0 : Math.round(result * 100)
}

function parseOptionalTraffic(value: string) {
  const result = parseNullableNumber(value)
  return result === null ? 0 : Math.round(result * 1073741824)
}

function parseTimestamp(value: string) {
  if (!value) return null
  const timestamp = Math.floor(new Date(value).getTime() / 1000)
  return Number.isNaN(timestamp) ? null : timestamp
}

function FilterModal({
  open,
  fields,
  value,
  onCancel,
  onSubmit,
}: {
  open: boolean
  fields: FilterField[]
  value: UserFilter[]
  onCancel: () => void
  onSubmit: (filters: UserFilter[]) => void
}) {
  const [draft, setDraft] = useState<UserFilter[]>([])

  useEffect(() => {
    if (!open) return
    setDraft(value.length ? value : [{ key: fields[0]?.key ?? 'email', condition: fields[0]?.conditions[0] ?? '模糊', value: '' }])
  }, [fields, open, value])

  return (
    <Drawer
      title="过滤器"
      open={open}
      width="80%"
      className="v2board-filter-drawer"
      destroyOnHidden
      onClose={onCancel}
      footer={
        <div className="v2board-drawer-action">
          <button
            type="button"
            className="btn btn-danger float-left"
            disabled={!draft.length}
            onClick={() => onSubmit([])}
          >
            重置
          </button>
          <button type="button" className="btn btn-alt-secondary mr-2" onClick={onCancel}>
            取消
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!draft.length}
            onClick={() => onSubmit(draft.filter((item) => item.value.trim()))}
          >
            检索
          </button>
        </div>
      }
    >
      <div className="v2board-filter-helper">可先通过过滤器筛选用户，再执行批量操作。</div>
      {draft.map((filter, index) => {
        const field = fields.find((item) => item.key === filter.key) ?? fields[0]
        return (
          <div key={`${filter.key}-${index}`} className="row align-items-end mb-3 v2board-filter-row">
            <div className="col-md-3">
              <label className="mb-2">字段</label>
              <Select
                className="w-100"
                value={filter.key}
                onChange={(nextKey) => {
                  const nextField = fields.find((item) => item.key === nextKey) ?? fields[0]
                  setDraft((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            key: nextKey,
                            condition: nextField?.conditions[0] ?? '=',
                            value: '',
                          }
                        : item,
                    ),
                  )
                }}
                options={fields.map((item) => ({ value: item.key, label: item.title }))}
              />
            </div>

            <div className="col-md-2">
              <label className="mb-2">条件</label>
              <Select
                className="w-100"
                value={filter.condition}
                onChange={(condition) => {
                  setDraft((current) =>
                    current.map((item, itemIndex) => (itemIndex === index ? { ...item, condition } : item)),
                  )
                }}
                options={(field?.conditions ?? ['=']).map((item) => ({ value: item, label: item }))}
              />
            </div>

            <div className="col-md-5">
              <label className="mb-2">值</label>
              {field?.type === 'select' ? (
                <Select
                  className="w-100"
                  value={filter.value || undefined}
                  onChange={(nextValue) => {
                    setDraft((current) =>
                      current.map((item, itemIndex) => (itemIndex === index ? { ...item, value: nextValue } : item)),
                    )
                  }}
                  options={field.options}
                />
              ) : field?.type === 'date' ? (
                <input
                  className="form-control"
                  type="datetime-local"
                  value={filter.value ? toDateTimeLocal(Number(filter.value)) : ''}
                  onChange={(event) => {
                    setDraft((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, value: toDateFilterValue(event.target.value) } : item,
                      ),
                    )
                  }}
                />
              ) : (
                <Input
                  value={filter.value}
                  onChange={(event) => {
                    setDraft((current) =>
                      current.map((item, itemIndex) => (itemIndex === index ? { ...item, value: event.target.value } : item)),
                    )
                  }}
                />
              )}
            </div>

            <div className="col-md-2">
              <button
                type="button"
                className="btn btn-sm btn-alt-danger w-100"
                disabled={draft.length <= 1}
                onClick={() => setDraft((current) => current.filter((_, itemIndex) => itemIndex !== index))}
              >
                删除
              </button>
            </div>
          </div>
        )
      })}

      <button
        type="button"
        className="btn btn-sm btn-alt-primary v2board-filter-add"
        onClick={() =>
          setDraft((current) => [
            ...current,
            { key: fields[0]?.key ?? 'email', condition: fields[0]?.conditions[0] ?? '模糊', value: '' },
          ])
        }
      >
        添加过滤条件
      </button>
    </Drawer>
  )
}

function UserEditorModal({
  open,
  userId,
  plans,
  loading,
  onCancel,
  onSubmit,
}: {
  open: boolean
  userId: number | null
  plans: AdminPlan[]
  loading: boolean
  onCancel: () => void
  onSubmit: (payload: Record<string, unknown>) => Promise<void>
}) {
  const [bootstrapLoading, setBootstrapLoading] = useState(false)
  const [form, setForm] = useState<UserEditFormState | null>(null)

  useEffect(() => {
    if (!open || userId === null) return
    let active = true
    const currentUserId = userId

    async function bootstrap() {
      setBootstrapLoading(true)
      try {
        const detail = await getAdminUserInfoById(currentUserId)
        if (!active) return
        setForm(normalizeUserDetail(detail))
      } finally {
        if (active) {
          setBootstrapLoading(false)
        }
      }
    }

    bootstrap()

    return () => {
      active = false
      setForm(null)
    }
  }, [open, userId])

  return (
    <Drawer
      title="用户管理"
      open={open}
      width="80%"
      className="v2board-editor-drawer v2board-user-editor-drawer"
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
            disabled={loading || bootstrapLoading || !form}
            onClick={async () => {
              if (!form) return
              if (!form.email.trim()) {
                message.error('邮箱不能为空')
                return
              }
              if (form.password.trim() && form.password.trim().length < 8) {
                message.error('密码长度最小 8 位')
                return
              }

              await onSubmit({
                id: form.id,
                email: form.email.trim(),
                invite_user_email: form.invite_user_email.trim(),
                ...(form.password.trim() ? { password: form.password.trim() } : {}),
                balance: parseOptionalMoney(form.balance),
                commission_balance: parseOptionalMoney(form.commission_balance),
                u: parseOptionalTraffic(form.u),
                d: parseOptionalTraffic(form.d),
                transfer_enable: parseOptionalTraffic(form.transfer_enable),
                device_limit: parseNullableInteger(form.device_limit),
                expired_at: parseTimestamp(form.expired_at),
                plan_id: form.plan_id ?? null,
                banned: form.banned,
                commission_type: form.commission_type,
                commission_rate: parseNullableInteger(form.commission_rate),
                discount: parseNullableInteger(form.discount),
                speed_limit: parseNullableInteger(form.speed_limit),
                is_admin: form.is_admin,
                is_staff: form.is_staff,
                remarks: form.remarks.trim(),
              })
            }}
          >
            {loading ? '提交中...' : '提交'}
          </button>
        </div>
      }
    >
      {bootstrapLoading || !form ? (
        <div className="text-center py-5">
          <Spin />
        </div>
      ) : (
        <div className="v2board-editor-form">
          <div className="v2board-editor-section">
            <div className="v2board-editor-section-title">基础信息</div>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="mb-2">邮箱</label>
                <Input value={form.email} onChange={(event) => setForm((current) => (current ? { ...current, email: event.target.value } : current))} />
              </div>
              <div className="col-md-6 mb-3">
                <label className="mb-2">邀请人邮箱</label>
                <Input
                  value={form.invite_user_email}
                  onChange={(event) => setForm((current) => (current ? { ...current, invite_user_email: event.target.value } : current))}
                />
              </div>
              <div className="col-12 mb-0">
                <label className="mb-2">密码</label>
                <Input.Password
                  value={form.password}
                  placeholder="如需修改密码请填写"
                  onChange={(event) => setForm((current) => (current ? { ...current, password: event.target.value } : current))}
                />
              </div>
            </div>
          </div>

          <div className="v2board-editor-section">
            <div className="v2board-editor-section-title">资产与流量</div>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="mb-2">余额</label>
                <Input value={form.balance} suffix="¥" onChange={(event) => setForm((current) => (current ? { ...current, balance: event.target.value } : current))} />
              </div>
              <div className="col-md-6 mb-3">
                <label className="mb-2">推广佣金</label>
                <Input
                  value={form.commission_balance}
                  suffix="¥"
                  onChange={(event) => setForm((current) => (current ? { ...current, commission_balance: event.target.value } : current))}
                />
              </div>
              <div className="col-md-4 mb-3">
                <label className="mb-2">已用上行</label>
                <Input value={form.u} suffix="GB" onChange={(event) => setForm((current) => (current ? { ...current, u: event.target.value } : current))} />
              </div>
              <div className="col-md-4 mb-3">
                <label className="mb-2">已用下行</label>
                <Input value={form.d} suffix="GB" onChange={(event) => setForm((current) => (current ? { ...current, d: event.target.value } : current))} />
              </div>
              <div className="col-md-4 mb-0">
                <label className="mb-2">流量</label>
                <Input
                  value={form.transfer_enable}
                  suffix="GB"
                  onChange={(event) => setForm((current) => (current ? { ...current, transfer_enable: event.target.value } : current))}
                />
              </div>
            </div>
          </div>

          <div className="v2board-editor-section">
            <div className="v2board-editor-section-title">订阅与权限</div>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="mb-2">到期时间</label>
                <input
                  className="form-control"
                  type="datetime-local"
                  value={form.expired_at}
                  onChange={(event) => setForm((current) => (current ? { ...current, expired_at: event.target.value } : current))}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="mb-2">订阅计划</label>
                <Select
                  allowClear
                  className="w-100"
                  value={form.plan_id}
                  placeholder="请选择用户订阅计划"
                  onChange={(value) => setForm((current) => (current ? { ...current, plan_id: value } : current))}
                  options={plans.map((plan) => ({ value: plan.id, label: plan.name }))}
                />
              </div>
              <div className="col-md-4 mb-3">
                <label className="mb-2">账户状态</label>
                <Select
                  className="w-100"
                  value={form.banned}
                  onChange={(value) => setForm((current) => (current ? { ...current, banned: value } : current))}
                  options={[
                    { value: 1, label: '封禁' },
                    { value: 0, label: '正常' },
                  ]}
                />
              </div>
              <div className="col-md-4 mb-3">
                <label className="mb-2">设备数限制</label>
                <Input
                  value={form.device_limit}
                  placeholder="留空则不限制"
                  onChange={(event) => setForm((current) => (current ? { ...current, device_limit: event.target.value } : current))}
                />
              </div>
              <div className="col-md-4 mb-0">
                <label className="mb-2">限速</label>
                <Input
                  value={form.speed_limit}
                  suffix="Mbps"
                  placeholder="留空则不限制"
                  onChange={(event) => setForm((current) => (current ? { ...current, speed_limit: event.target.value } : current))}
                />
              </div>
            </div>
          </div>

          <div className="v2board-editor-section">
            <div className="v2board-editor-section-title">返利与角色</div>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="mb-2">推荐返利类型</label>
                <Select
                  className="w-100"
                  value={form.commission_type}
                  onChange={(value) => setForm((current) => (current ? { ...current, commission_type: value } : current))}
                  options={commissionTypeOptions}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="mb-2">推荐返利比例</label>
                <Input
                  value={form.commission_rate}
                  suffix="%"
                  placeholder="留空则跟随站点设置"
                  onChange={(event) => setForm((current) => (current ? { ...current, commission_rate: event.target.value } : current))}
                />
              </div>
              <div className="col-md-4 mb-3">
                <label className="mb-2">专享折扣比例</label>
                <Input
                  value={form.discount}
                  suffix="%"
                  onChange={(event) => setForm((current) => (current ? { ...current, discount: event.target.value } : current))}
                />
              </div>
              <div className="col-md-4 mb-3">
                <label className="mb-2">是否管理员</label>
                <Select
                  className="w-100"
                  value={form.is_admin}
                  onChange={(value) => setForm((current) => (current ? { ...current, is_admin: value } : current))}
                  options={[
                    { value: 1, label: '是' },
                    { value: 0, label: '否' },
                  ]}
                />
              </div>
              <div className="col-md-4 mb-0">
                <label className="mb-2">是否员工</label>
                <Select
                  className="w-100"
                  value={form.is_staff}
                  onChange={(value) => setForm((current) => (current ? { ...current, is_staff: value } : current))}
                  options={[
                    { value: 1, label: '是' },
                    { value: 0, label: '否' },
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="v2board-editor-section mb-0">
            <div className="v2board-editor-section-title">备注</div>
            <label className="mb-2">内部备注</label>
            <Input.TextArea
              rows={4}
              value={form.remarks}
              placeholder="请在这里记录..."
              onChange={(event) => setForm((current) => (current ? { ...current, remarks: event.target.value } : current))}
            />
          </div>
        </div>
      )}
    </Drawer>
  )
}

function UserCreateModal({
  open,
  plans,
  loading,
  onCancel,
  onSubmit,
}: {
  open: boolean
  plans: AdminPlan[]
  loading: boolean
  onCancel: () => void
  onSubmit: (payload: Record<string, unknown>) => Promise<void>
}) {
  const [form, setForm] = useState<UserCreateFormState>(createEmptyCreateForm())

  useEffect(() => {
    if (!open) return
    setForm(createEmptyCreateForm())
  }, [open])

  return (
    <Drawer
      title="创建用户"
      open={open}
      width="80%"
      className="v2board-editor-drawer v2board-user-editor-drawer"
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
              if (!form.email_suffix.trim()) {
                message.error('邮箱后缀不能为空')
                return
              }
              if (!form.email_prefix.trim() && !form.generate_count.trim()) {
                message.error('单个创建请填写账号，批量创建请填写生成数量')
                return
              }
              if (form.password.trim() && form.password.trim().length < 8) {
                message.error('密码长度最小 8 位')
                return
              }

              await onSubmit({
                email_prefix: form.email_prefix.trim() || undefined,
                email_suffix: form.email_suffix.trim(),
                password: form.password.trim() || undefined,
                expired_at: parseTimestamp(form.expired_at),
                plan_id: form.plan_id ?? null,
                generate_count: form.email_prefix.trim() ? undefined : parseNullableInteger(form.generate_count),
              })
            }}
          >
            提交
          </button>
        </div>
      }
    >
      <div className="v2board-editor-form">
        <div className="v2board-editor-section">
          <div className="v2board-editor-section-title">账号信息</div>
          <div className="form-group mb-0">
            <label className="mb-2">邮箱</label>
            <Input.Group compact>
              {!form.generate_count.trim() ? (
                <Input
                  style={{ width: '45%' }}
                  value={form.email_prefix}
                  placeholder="账号（批量生成请留空）"
                  onChange={(event) => setForm((current) => ({ ...current, email_prefix: event.target.value }))}
                />
              ) : null}
              <Input style={{ width: '10%', textAlign: 'center' }} value="@" disabled />
              <Input
                style={{ width: form.generate_count.trim() ? '90%' : '45%' }}
                value={form.email_suffix}
                placeholder="域"
                onChange={(event) => setForm((current) => ({ ...current, email_suffix: event.target.value }))}
              />
            </Input.Group>
          </div>
        </div>

        <div className="v2board-editor-section">
          <div className="v2board-editor-section-title">订阅设置</div>
          <div className="form-group">
            <label className="mb-2">密码</label>
            <Input.Password
              value={form.password}
              placeholder="留空则密码与邮箱相同"
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="mb-2">到期时间</label>
            <input
              className="form-control"
              type="datetime-local"
              value={form.expired_at}
              onChange={(event) => setForm((current) => ({ ...current, expired_at: event.target.value }))}
            />
          </div>
          <div className="form-group mb-0">
            <label className="mb-2">订阅计划</label>
            <Select
              allowClear
              className="w-100"
              value={form.plan_id}
              placeholder="请选择用户订阅计划"
              onChange={(value) => setForm((current) => ({ ...current, plan_id: value }))}
              options={plans.map((plan) => ({ value: plan.id, label: plan.name }))}
            />
          </div>
        </div>

        {!form.email_prefix.trim() ? (
          <div className="v2board-editor-section mb-0">
            <div className="v2board-editor-section-title">批量生成</div>
            <div className="form-group mb-0">
              <label className="mb-2">生成数量</label>
              <Input
                value={form.generate_count}
                placeholder="批量生成时请输入数量"
                onChange={(event) => setForm((current) => ({ ...current, generate_count: event.target.value }))}
              />
            </div>
          </div>
        ) : null}
      </div>
    </Drawer>
  )
}

function UserMailModal({
  open,
  filtered,
  loading,
  onCancel,
  onSubmit,
}: {
  open: boolean
  filtered: boolean
  loading: boolean
  onCancel: () => void
  onSubmit: (payload: MailFormState) => Promise<void>
}) {
  const [form, setForm] = useState<MailFormState>({ subject: '', content: '' })

  useEffect(() => {
    if (!open) return
    setForm({ subject: '', content: '' })
  }, [open])

  return (
    <Drawer
      title="发送邮件"
      open={open}
      width="80%"
      className="v2board-editor-drawer v2board-user-editor-drawer"
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
              if (!form.subject.trim() || !form.content.trim()) {
                message.error('请完整填写邮件主题和内容')
                return
              }
              await onSubmit({
                subject: form.subject.trim(),
                content: form.content.trim(),
              })
            }}
          >
            提交
          </button>
        </div>
      }
    >
      <div className="v2board-editor-form">
        <div className="v2board-editor-section">
          <div className="v2board-editor-section-title">发送范围</div>
          <div className="form-group mb-0">
            <label className="mb-2">收件人</label>
            <Input disabled value={filtered ? '过滤用户' : '全部用户'} />
          </div>
        </div>
        <div className="v2board-editor-section mb-0">
          <div className="v2board-editor-section-title">邮件内容</div>
          <div className="form-group">
            <label className="mb-2">主题</label>
            <Input value={form.subject} placeholder="请输入邮件主题" onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} />
          </div>
          <div className="form-group mb-0">
            <label className="mb-2">发送内容</label>
            <Input.TextArea rows={10} value={form.content} placeholder="请输入邮件内容" onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} />
          </div>
        </div>
      </div>
    </Drawer>
  )
}

function AssignOrderModal({
  open,
  email,
  plans,
  loading,
  onCancel,
  onSubmit,
}: {
  open: boolean
  email: string
  plans: AdminPlan[]
  loading: boolean
  onCancel: () => void
  onSubmit: (payload: AssignOrderFormState) => Promise<void>
}) {
  const [form, setForm] = useState<AssignOrderFormState>({ email, total_amount: '' })

  useEffect(() => {
    if (!open) return
    setForm({ email, total_amount: '' })
  }, [email, open])

  return (
    <Drawer
      title="订单分配"
      open={open}
      width="80%"
      className="v2board-editor-drawer v2board-user-editor-drawer"
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
              if (!form.email.trim() || !form.plan_id || !form.period || !form.total_amount.trim()) {
                message.error('请完整填写订单信息')
                return
              }
              if (Number.isNaN(Number(form.total_amount))) {
                message.error('支付金额格式不正确')
                return
              }
              await onSubmit(form)
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
            <Input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
          </div>
          <div className="form-group">
            <label className="mb-2">请选择订阅</label>
            <Select
              className="w-100"
              value={form.plan_id}
              placeholder="请选择订阅"
              onChange={(value) => setForm((current) => ({ ...current, plan_id: value }))}
              options={plans.map((plan) => ({ value: plan.id, label: plan.name }))}
            />
          </div>
          <div className="form-group">
            <label className="mb-2">请选择周期</label>
            <Select
              className="w-100"
              value={form.period}
              placeholder="请选择周期"
              onChange={(value) => setForm((current) => ({ ...current, period: value }))}
              options={Object.entries(periodText).map(([value, label]) => ({ value, label }))}
            />
          </div>
          <div className="form-group mb-0">
            <label className="mb-2">支付金额</label>
            <Input value={form.total_amount} suffix="¥" onChange={(event) => setForm((current) => ({ ...current, total_amount: event.target.value }))} />
          </div>
        </div>
      </div>
    </Drawer>
  )
}

function UserTrafficModal({
  open,
  userId,
  onCancel,
}: {
  open: boolean
  userId: number | null
  onCancel: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [records, setRecords] = useState<AdminStatUserRecord[]>([])
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    if (!open) return
    setPage(1)
  }, [open, userId])

  useEffect(() => {
    if (!open || userId === null) return
    let active = true
    const currentUserId = userId

    async function bootstrap() {
      setLoading(true)
      try {
        const response = await getAdminStatUser({ user_id: currentUserId, current: page, pageSize })
        if (!active) return
        setRecords(response.data)
        setTotal(response.total)
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    bootstrap()

    return () => {
      active = false
    }
  }, [open, page, pageSize, userId])

  return (
    <Modal
      className="v2board-detail-modal"
      title="流量记录"
      open={open}
      footer={null}
      width="100%"
      style={{ maxWidth: 1000, padding: '0 10px', top: 20 }}
      styles={{ body: { padding: 0 } }}
      onCancel={onCancel}
    >
      {loading ? (
        <div className="v2board-detail-loading">
          <div className="spinner-grow text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
        </div>
      ) : (
        <Table<AdminStatUserRecord>
          className="v2board-data-modal-table"
          size="small"
          rowKey="id"
          dataSource={records}
          pagination={{
            current: page,
            pageSize,
            total,
            size: 'small',
          }}
          locale={{ emptyText: '暂无流量记录' }}
          onChange={(pagination) => {
            setPage(pagination.current ?? 1)
          }}
          columns={[
            {
              title: '日期',
              dataIndex: 'record_at',
              key: 'record_at',
              render: (value: number) => new Date(value * 1000).toLocaleDateString('zh-CN'),
            },
            {
              title: '上行',
              dataIndex: 'u',
              key: 'u',
              align: 'right',
              render: (value: number) => formatTraffic(value),
            },
            {
              title: '下行',
              dataIndex: 'd',
              key: 'd',
              align: 'right',
              render: (value: number) => formatTraffic(value),
            },
            {
              title: '倍率',
              dataIndex: 'server_rate',
              key: 'server_rate',
              align: 'right',
            },
          ]}
        />
      )}
    </Modal>
  )
}

export function UserPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialSearch = searchParams.get('email') ?? ''
  const initialFilters = useMemo(() => parseInitialFilters(searchParams), [searchParams])
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [groups, setGroups] = useState<ServerGroup[]>([])
  const [plans, setPlans] = useState<AdminPlan[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(() => getUserPageSize())
  const [searchInput, setSearchInput] = useState(initialSearch)
  const [searchText, setSearchText] = useState(initialSearch)
  const [filters, setFilters] = useState<UserFilter[]>(initialFilters)
  const [filterOpen, setFilterOpen] = useState(false)
  const [editUserId, setEditUserId] = useState<number | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [mailOpen, setMailOpen] = useState(false)
  const [mailLoading, setMailLoading] = useState(false)
  const [assignEmail, setAssignEmail] = useState('')
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignLoading, setAssignLoading] = useState(false)
  const [trafficUserId, setTrafficUserId] = useState<number | null>(null)
  const [trafficOpen, setTrafficOpen] = useState(false)

  useEffect(() => {
    setSearchInput(initialSearch)
    setSearchText(initialSearch)
    setFilters(initialFilters)
    setPage(1)
  }, [initialFilters, initialSearch])

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchText(searchInput), 400)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const requestFilters = useMemo(() => buildRequestFilters(filters, searchText), [filters, searchText])
  const filterFields = useMemo(() => buildFilterFields(plans), [plans])
  const groupMap = useMemo(() => new Map(groups.map((group) => [group.id, group.name])), [groups])
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [pageSize, total])

  const loadUsers = async (nextPage = page) => {
    setLoading(true)
    try {
      const result = await getAdminUsers({
        current: nextPage,
        pageSize,
        sort: 'created_at',
        sort_type: 'DESC',
        filter: requestFilters,
      })
      setUsers(result.data)
      setTotal(result.total)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    Promise.allSettled([getServerGroups(), getAdminPlans()]).then(([groupsResult, plansResult]) => {
      if (!active) return
      setGroups(groupsResult.status === 'fulfilled' ? groupsResult.value : [])
      setPlans(plansResult.status === 'fulfilled' ? plansResult.value : [])
    })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (page !== 1) {
      setPage(1)
      return
    }
    loadUsers(1)
  }, [pageSize, requestFilters])

  useEffect(() => {
    loadUsers(page)
  }, [page])

  const handleExportCsv = async () => {
    const buffer = await dumpAdminUsersCsv({ filter: requestFilters })
    downloadBlob(buffer, buildDownloadName('USER', 'csv'))
  }

  const handleBulkBan = async () => {
    await bulkBanAdminUsers({ filter: requestFilters, sort: 'created_at', sort_type: 'DESC' })
    message.success('批量封禁完成')
    await loadUsers(1)
    setPage(1)
  }

  const handleBulkDelete = async () => {
    await bulkDeleteAdminUsers({ filter: requestFilters, sort: 'created_at', sort_type: 'DESC' })
    message.success('批量删除完成')
    await loadUsers(1)
    setPage(1)
  }

  const actionMenuItems: MenuProps['items'] = [
    {
      key: 'export',
      label: <span><i className="fa fa-file-excel-o mr-2" />导出 CSV</span>,
      onClick: handleExportCsv,
    },
    {
      key: 'mail',
      label: <span><i className="fa fa-envelope-o mr-2" />发送邮件</span>,
      onClick: () => setMailOpen(true),
    },
    {
      key: 'ban',
      label: <span><i className="fa fa-ban mr-2" />批量封禁</span>,
      disabled: requestFilters.length === 0,
      onClick: () =>
        Modal.confirm({
          title: '提醒',
          content: '确定要对当前过滤结果执行批量封禁吗？',
          onOk: handleBulkBan,
        }),
    },
    {
      key: 'delete',
      label: <span><i className="fa fa-trash mr-2" />批量删除</span>,
      disabled: requestFilters.length === 0,
      danger: true,
      onClick: () =>
        Modal.confirm({
          title: '提醒',
          content: '确定要对当前过滤结果执行批量删除吗？',
          onOk: handleBulkDelete,
        }),
    },
  ]

  return (
    <>
      <div className="block border-bottom v2board-user-page">
        <div className="bg-white">
          <div className="v2board-table-action v2board-list-toolbar p-3">
            <div className="v2board-list-toolbar-left">
              <Tooltip title="Tips：可先通过过滤器筛选用户，再执行批量操作。">
                <button type="button" className={`btn btn-sm mr-2 ${filters.length ? 'btn-primary' : 'btn-alt-primary'}`} onClick={() => setFilterOpen(true)}>
                  <i className="fa fa-filter mr-1" />
                  过滤器
                </button>
              </Tooltip>

              <Dropdown menu={{ items: actionMenuItems }} trigger={['click']}>
                <button type="button" className="btn btn-sm btn-alt-primary mr-2">
                  <i className="fa fa-list mr-1" />
                  操作
                </button>
              </Dropdown>

              <Tooltip title="创建用户">
                <button type="button" className="btn btn-sm btn-primary v2board-toolbar-icon" onClick={() => setCreateOpen(true)}>
                  <i className="fa fa-user-plus" />
                </button>
              </Tooltip>
            </div>

            <div className="v2board-list-toolbar-right">
              <div className="v2board-list-search" style={{ width: 260 }}>
                <input
                  className="form-control form-control-sm"
                  placeholder="输入邮箱搜索"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                />
              </div>
            </div>
          </div>

          {filters.length ? (
            <div className="px-3 pb-3 v2board-list-filter-bar">
              {filters.map((filter, index) => (
                <span key={`${filter.key}-${index}`} className="badge badge-primary mr-2 mb-2 px-3 py-2">
                  {getFilterLabel(filter, filterFields)}
                  <button
                    type="button"
                    className="v2board-filter-remove"
                    onClick={() => {
                      setFilters((current) => current.filter((_, currentIndex) => currentIndex !== index))
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
              <button type="button" className="btn btn-sm btn-alt-secondary mb-2" onClick={() => setFilters([])}>
                清空过滤器
              </button>
            </div>
          ) : null}
        </div>

        <div className="block-content p-0">
          <div className="table-responsive">
            <table className="table table-striped table-vcenter mb-0">
              <thead>
                <tr>
                  <th style={{ width: 72 }}>ID</th>
                  <th style={{ width: 220 }}>邮箱</th>
                  <th style={{ width: 86 }}>状态</th>
                  <th>订阅</th>
                  <th style={{ width: 110 }}>权限组</th>
                  <th style={{ width: 104 }}>已用(G)</th>
                  <th style={{ width: 104 }}>流量(G)</th>
                  <th style={{ width: 96 }}>设备数</th>
                  <th style={{ width: 152 }}>到期时间</th>
                  <th style={{ width: 100 }}>余额</th>
                  <th style={{ width: 100 }}>佣金</th>
                  <th style={{ width: 152 }}>加入时间</th>
                  <th className="text-right" style={{ width: 110 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={13} className="text-center py-4 v2board-table-loading-row">
                      <div className="spinner-grow text-primary" role="status">
                        <span className="sr-only">Loading...</span>
                      </div>
                    </td>
                  </tr>
                ) : users.length ? (
                  users.map((user) => {
                    const menuItems: MenuProps['items'] = [
                      {
                        key: 'edit',
                        label: <span><i className="fa fa-pencil mr-2" />编辑</span>,
                        onClick: () => setEditUserId(user.id),
                      },
                      {
                        key: 'assign',
                        label: <span><i className="fa fa-plus mr-2" />分配订单</span>,
                        onClick: () => {
                          setAssignEmail(user.email)
                          setAssignOpen(true)
                        },
                      },
                      {
                        key: 'copy',
                        label: <span><i className="fa fa-copy mr-2" />复制订阅 URL</span>,
                        onClick: async () => {
                          if (!user.subscribe_url) return
                          await navigator.clipboard.writeText(String(user.subscribe_url))
                          message.success('订阅 URL 已复制')
                        },
                      },
                      {
                        key: 'reset',
                        label: <span><i className="fa fa-refresh mr-2" />重置 UUID 及订阅 URL</span>,
                        danger: true,
                        onClick: () =>
                          Modal.confirm({
                            title: '重置安全信息',
                            content: `确定要重置 ${user.email} 的安全信息吗？`,
                            onOk: async () => {
                              await resetAdminUserSecret(user.id)
                              message.success('重置成功')
                              await loadUsers()
                            },
                          }),
                      },
                      {
                        key: 'orders',
                        label: <span><i className="fa fa-book mr-2" />TA 的订单</span>,
                        onClick: () => navigate(`/order?user_id=${user.id}&user_id_condition=%3D`),
                      },
                      {
                        key: 'invites',
                        label: <span><i className="fa fa-users mr-2" />TA 的邀请</span>,
                        onClick: () => {
                          setSearchInput('')
                          setSearchText('')
                          setFilters([{ key: 'invite_user_id', condition: '=', value: String(user.id) }])
                        },
                      },
                      {
                        key: 'traffic',
                        label: <span><i className="fa fa-area-chart mr-2" />TA 的流量记录</span>,
                        onClick: () => {
                          setTrafficUserId(user.id)
                          setTrafficOpen(true)
                        },
                      },
                      {
                        key: 'delete',
                        label: <span><i className="fa fa-trash mr-2" />删除用户</span>,
                        danger: true,
                        onClick: () =>
                          Modal.confirm({
                            title: '删除用户',
                            content: `确定要删除 ${user.email} 的用户信息吗？`,
                            onOk: async () => {
                              const nextPage = page > 1 && users.length === 1 ? page - 1 : page
                              await deleteAdminUser(user.id)
                              message.success('删除成功')
                              setPage(nextPage)
                              await loadUsers(nextPage)
                            },
                          }),
                      },
                    ]

                    return (
                      <tr key={user.id}>
                        <td>{user.id}</td>
                        <td>
                          <span className="v2board-user-email">
                            <span className={`v2board-user-presence ${user.t && Date.now() / 1000 - 600 <= Number(user.t) ? 'is-online' : 'is-offline'}`} />
                            <span>{user.email}</span>
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${user.banned ? 'badge-danger' : 'badge-success'} v2board-status-badge`}>{user.banned ? '封禁' : '正常'}</span>
                        </td>
                        <td>{user.plan_name || '-'}</td>
                        <td>{user.group_id ? groupMap.get(Number(user.group_id)) || user.group_id : '-'}</td>
                        <td>
                          <span className={`v2board-usage-text ${Number(user.total_used) > Number(user.transfer_enable) ? 'text-danger' : 'text-success'}`}>{toGb(Number(user.total_used))}</span>
                        </td>
                        <td>{toGb(Number(user.transfer_enable))}</td>
                        <td title={user.ips || ''}>
                          {user.alive_ip ?? 0} / {user.device_limit ?? '∞'}
                        </td>
                        <td>
                          <span className={`v2board-expire-text ${user.expired_at !== null && Number(user.expired_at) < Date.now() / 1000 ? 'text-danger' : 'text-success'}`}>
                            {formatDate(user.expired_at)}
                          </span>
                        </td>
                        <td>{toMoney(Number(user.balance))}</td>
                        <td>{toMoney(Number(user.commission_balance))}</td>
                        <td>{formatDate(user.created_at)}</td>
                        <td className="text-right">
                          <Dropdown menu={{ items: menuItems }} trigger={['click']}>
                            <button type="button" className="v2board-link-button v2board-dropdown-trigger v2board-row-action">
                              <span>操作</span>
                              <i className="fa fa-angle-down" />
                            </button>
                          </Dropdown>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={13} className="text-center text-muted py-4 v2board-list-empty">
                      暂无用户
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
                  localStorage.setItem('user_manage_page_size', String(next))
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
              <button type="button" className="btn btn-sm btn-alt-secondary mr-2" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}>
                上一页
              </button>
              <span className="text-muted mr-2">
                {page} / {totalPages}
              </span>
              <button type="button" className="btn btn-sm btn-alt-secondary" disabled={page >= totalPages || loading} onClick={() => setPage((current) => current + 1)}>
                下一页
              </button>
            </div>
          </div>
        </div>
      </div>

      <FilterModal
        open={filterOpen}
        fields={filterFields}
        value={filters}
        onCancel={() => setFilterOpen(false)}
        onSubmit={(nextFilters) => {
          setFilters(nextFilters)
          setFilterOpen(false)
        }}
      />

      <UserEditorModal
        open={editUserId !== null}
        userId={editUserId}
        plans={plans}
        loading={editLoading}
        onCancel={() => setEditUserId(null)}
        onSubmit={async (payload) => {
          setEditLoading(true)
          try {
            await updateAdminUser(payload)
            message.success('用户保存成功')
            setEditUserId(null)
            await loadUsers()
          } finally {
            setEditLoading(false)
          }
        }}
      />

      <UserCreateModal
        open={createOpen}
        plans={plans}
        loading={createLoading}
        onCancel={() => setCreateOpen(false)}
        onSubmit={async (payload) => {
          setCreateLoading(true)
          try {
            const response = await generateAdminUser(payload)
            if (response instanceof ArrayBuffer) {
              downloadBlob(response, buildDownloadName('USER', 'csv'))
            }
            message.success('用户生成成功')
            setCreateOpen(false)
            setPage(1)
            await loadUsers(1)
          } finally {
            setCreateLoading(false)
          }
        }}
      />

      <UserMailModal
        open={mailOpen}
        filtered={requestFilters.length > 0}
        loading={mailLoading}
        onCancel={() => setMailOpen(false)}
        onSubmit={async (payload) => {
          setMailLoading(true)
          try {
            await sendAdminUserMail({
              ...payload,
              filter: requestFilters,
              sort: 'created_at',
              sort_type: 'DESC',
            })
            message.success('已加入队列执行')
            setMailOpen(false)
          } finally {
            setMailLoading(false)
          }
        }}
      />

      <AssignOrderModal
        open={assignOpen}
        email={assignEmail}
        plans={plans}
        loading={assignLoading}
        onCancel={() => setAssignOpen(false)}
        onSubmit={async (payload) => {
          setAssignLoading(true)
          try {
            await assignOrder({
              email: payload.email.trim(),
              plan_id: Number(payload.plan_id),
              period: String(payload.period),
              total_amount: Math.round(Number(payload.total_amount) * 100),
            })
            message.success('订单分配成功')
            setAssignOpen(false)
          } finally {
            setAssignLoading(false)
          }
        }}
      />

      <UserTrafficModal
        open={trafficOpen}
        userId={trafficUserId}
        onCancel={() => {
          setTrafficOpen(false)
          setTrafficUserId(null)
        }}
      />
    </>
  )
}
