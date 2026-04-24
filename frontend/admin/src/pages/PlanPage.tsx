import { useEffect, useMemo, useState } from 'react'
import { Drawer, Dropdown, Input, Modal, Select, Switch, Tooltip, message } from 'antd'
import type { MenuProps } from 'antd'
import {
  deleteAdminPlan,
  getAdminPlans,
  getServerGroups,
  getSiteConfig,
  saveAdminPlan,
  sortAdminPlans,
  updateAdminPlan,
  type AdminPlan,
  type ServerGroup,
} from '@/api/admin'

type PlanFormState = {
  id?: number
  name: string
  content: string
  group_id?: number
  transfer_enable: string
  device_limit: string
  month_price: string
  quarter_price: string
  half_year_price: string
  year_price: string
  two_year_price: string
  three_year_price: string
  onetime_price: string
  reset_price: string
  reset_traffic_method?: number | null
  capacity_limit: string
  speed_limit: string
  force_update: boolean
}

const resetTrafficMethodOptions = [
  { value: null, label: '跟随系统设置' },
  { value: 0, label: '每月1号' },
  { value: 1, label: '按月重置' },
  { value: 2, label: '不重置' },
  { value: 3, label: '每年1月1日' },
  { value: 4, label: '按年重置' },
]

const recurringPriceFields = [
  { key: 'month_price', label: '月付' },
  { key: 'quarter_price', label: '季付' },
  { key: 'half_year_price', label: '半年付' },
  { key: 'year_price', label: '年付' },
  { key: 'two_year_price', label: '两年付' },
  { key: 'three_year_price', label: '三年付' },
 ] as const

const extraPriceFields = [
  { key: 'onetime_price', label: '一次性' },
  { key: 'reset_price', label: '重置包' },
] as const

const priceFields = [...recurringPriceFields, ...extraPriceFields] as const

function toMoneyDisplay(value: number | null | undefined) {
  if (value === null || value === undefined) return ''
  return (value / 100).toFixed(2)
}

function toMoneyText(value: number | null | undefined) {
  if (value === null || value === undefined) return '-'
  return (value / 100).toFixed(2)
}

function createEmptyForm(): PlanFormState {
  return {
    name: '',
    content: '',
    transfer_enable: '',
    device_limit: '',
    month_price: '',
    quarter_price: '',
    half_year_price: '',
    year_price: '',
    two_year_price: '',
    three_year_price: '',
    onetime_price: '',
    reset_price: '',
    reset_traffic_method: null,
    capacity_limit: '',
    speed_limit: '',
    force_update: false,
  }
}

function normalizePlanToForm(plan?: AdminPlan | null): PlanFormState {
  if (!plan) return createEmptyForm()

  return {
    id: plan.id,
    name: String(plan.name ?? ''),
    content: String(plan.content ?? ''),
    group_id: typeof plan.group_id === 'number' ? plan.group_id : undefined,
    transfer_enable: plan.transfer_enable === null || plan.transfer_enable === undefined ? '' : String(plan.transfer_enable),
    device_limit: plan.device_limit === null || plan.device_limit === undefined ? '' : String(plan.device_limit),
    month_price: toMoneyDisplay(plan.month_price),
    quarter_price: toMoneyDisplay(plan.quarter_price),
    half_year_price: toMoneyDisplay(plan.half_year_price),
    year_price: toMoneyDisplay(plan.year_price),
    two_year_price: toMoneyDisplay(plan.two_year_price),
    three_year_price: toMoneyDisplay(plan.three_year_price),
    onetime_price: toMoneyDisplay(plan.onetime_price),
    reset_price: toMoneyDisplay(plan.reset_price),
    reset_traffic_method: plan.reset_traffic_method ?? null,
    capacity_limit: plan.capacity_limit === null || plan.capacity_limit === undefined ? '' : String(plan.capacity_limit),
    speed_limit: plan.speed_limit === null || plan.speed_limit === undefined ? '' : String(plan.speed_limit),
    force_update: false,
  }
}

function parseNullableInteger(value: string) {
  if (!value.trim()) return null
  return Number(value)
}

function parseNullableMoney(value: string) {
  if (!value.trim()) return null
  return Math.round(Number(value) * 100)
}

function getGroupName(groupId: number | null | undefined, groups: ServerGroup[]) {
  if (groupId === null || groupId === undefined) return '-'
  return groups.find((group) => group.id === Number(groupId))?.name ?? String(groupId)
}

function PlanEditorDrawer({
  open,
  currencySymbol,
  groups,
  loading,
  plan,
  onCancel,
  onSubmit,
}: {
  open: boolean
  currencySymbol: string
  groups: ServerGroup[]
  loading: boolean
  plan?: AdminPlan | null
  onCancel: () => void
  onSubmit: (payload: Record<string, unknown>) => Promise<void>
}) {
  const [form, setForm] = useState<PlanFormState>(createEmptyForm())

  useEffect(() => {
    if (!open) return
    setForm(normalizePlanToForm(plan))
  }, [open, plan])

  const title = form.id ? '编辑订阅' : '新建订阅'

  return (
    <Drawer
      id="plan"
      className="v2board-editor-drawer"
      title={title}
      open={open}
      width="80%"
      destroyOnHidden
      onClose={onCancel}
      footer={
        <div className="v2board-drawer-action d-flex justify-content-between align-items-center flex-wrap">
          <Tooltip
            placement="top"
            title="勾选后变更的流量、限速、权限组将应用到该套餐下的用户"
          >
            <label className="mb-0 d-flex align-items-center">
              <input
                id="plan-force-update"
                className="mr-2"
                type="checkbox"
                checked={form.force_update}
                onChange={(event) => setForm((current) => ({ ...current, force_update: event.target.checked }))}
              />
              <span>强制更新到用户</span>
            </label>
          </Tooltip>
          <div className="mt-2 mt-sm-0">
            <button type="button" className="btn btn-alt-secondary mr-2" onClick={onCancel}>
              取消
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={loading}
              onClick={async () => {
                if (!form.name.trim()) {
                  message.error('套餐名称不能为空')
                  return
                }
                if (!form.group_id) {
                  message.error('权限组不能为空')
                  return
                }
                if (!form.transfer_enable.trim()) {
                  message.error('套餐流量不能为空')
                  return
                }

                const payload: Record<string, unknown> = {
                  ...(form.id ? { id: form.id } : {}),
                  name: form.name.trim(),
                  content: form.content,
                  group_id: form.group_id,
                  transfer_enable: Number(form.transfer_enable),
                  device_limit: parseNullableInteger(form.device_limit),
                  reset_traffic_method: form.reset_traffic_method,
                  capacity_limit: parseNullableInteger(form.capacity_limit),
                  speed_limit: parseNullableInteger(form.speed_limit),
                  force_update: form.force_update ? 1 : 0,
                }

                for (const item of priceFields) {
                  payload[item.key] = parseNullableMoney(form[item.key])
                }

                await onSubmit(payload)
              }}
            >
              {loading ? '提交中...' : '提交'}
            </button>
          </div>
        </div>
      }
    >
      <div className="v2board-editor-form">
        <div className="v2board-editor-section">
          <div className="v2board-editor-section-title">基础信息</div>
          <div className="form-group">
            <label className="mb-2">套餐名称</label>
            <Input value={form.name} placeholder="请输入套餐名称" onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </div>
          <div className="form-group mb-0">
            <label className="mb-2">套餐描述</label>
            <Input.TextArea
              rows={4}
              value={form.content}
              placeholder="请输入套餐描述，支持 HTML"
              onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
            />
          </div>
        </div>

        <div className="v2board-editor-section">
          <div className="v2board-editor-section-title">
            售价设置
            <Tooltip title="将金额留空则不会进行出售">
              <i className="fa fa-info-circle ml-2 text-muted" />
            </Tooltip>
          </div>
          <div className="row v2board-plan-price-grid">
            {recurringPriceFields.map((item) => (
              <div key={item.key} className="col-md-4 mb-3">
                <label className="mb-2">{item.label}</label>
                <Input
                  value={form[item.key]}
                  onChange={(event) => setForm((current) => ({ ...current, [item.key]: event.target.value }))}
                />
              </div>
            ))}
          </div>
          <div className="row v2board-plan-price-grid mb-0">
            {extraPriceFields.map((item) => (
              <div key={item.key} className="col-md-6 mb-0">
                <label className="mb-2">{item.label}</label>
                <Input
                  addonAfter={currencySymbol}
                  value={form[item.key]}
                  onChange={(event) => setForm((current) => ({ ...current, [item.key]: event.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="v2board-editor-section mb-0">
          <div className="v2board-editor-section-title">套餐限制</div>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="mb-2">套餐流量</label>
              <Input
                addonAfter="GB"
                placeholder="请输入套餐流量"
                value={form.transfer_enable}
                onChange={(event) => setForm((current) => ({ ...current, transfer_enable: event.target.value }))}
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="mb-2">设备数限制</label>
              <Input
                placeholder="留空则不限制"
                value={form.device_limit}
                onChange={(event) => setForm((current) => ({ ...current, device_limit: event.target.value }))}
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="mb-2">权限组</label>
              <Select
                className="w-100"
                placeholder="请选择权限组"
                value={form.group_id}
                options={groups.map((group) => ({ label: group.name, value: group.id }))}
                onChange={(value) => setForm((current) => ({ ...current, group_id: value }))}
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="mb-2">流量重置方式</label>
              <Select
                className="w-100"
                placeholder="请选择流量重置方式"
                value={form.reset_traffic_method}
                options={resetTrafficMethodOptions}
                onChange={(value) => setForm((current) => ({ ...current, reset_traffic_method: value }))}
              />
            </div>
            <div className="col-md-6 mb-0">
              <label className="mb-2">最大容纳用户量</label>
              <Input
                placeholder="留空则不限制"
                value={form.capacity_limit}
                onChange={(event) => setForm((current) => ({ ...current, capacity_limit: event.target.value }))}
              />
            </div>
            <div className="col-md-6 mb-0">
              <label className="mb-2">限速</label>
              <Input
                addonAfter="Mbps"
                placeholder="留空则不限制"
                value={form.speed_limit}
                onChange={(event) => setForm((current) => ({ ...current, speed_limit: event.target.value }))}
              />
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  )
}

export function PlanPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [plans, setPlans] = useState<AdminPlan[]>([])
  const [groups, setGroups] = useState<ServerGroup[]>([])
  const [currencySymbol, setCurrencySymbol] = useState('¥')
  const [editorOpen, setEditorOpen] = useState(false)
  const [activePlan, setActivePlan] = useState<AdminPlan | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [planResult, groupResult, configResult] = await Promise.allSettled([
        getAdminPlans(),
        getServerGroups(),
        getSiteConfig(),
      ])

      if (planResult.status === 'fulfilled') {
        setPlans(planResult.value)
      }
      if (groupResult.status === 'fulfilled') {
        setGroups(groupResult.value)
      }
      if (configResult.status === 'fulfilled') {
        setCurrencySymbol(configResult.value.site?.currency_symbol ?? '¥')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const sortedPlans = useMemo(() => [...plans].sort((left, right) => Number(left.sort ?? 0) - Number(right.sort ?? 0)), [plans])

  return (
    <>
      <div className="block border-bottom v2board-plan-page">
        <div className="bg-white">
          <div className="v2board-table-action v2board-list-toolbar p-3">
            <div className="v2board-list-toolbar-left">
              <button
                type="button"
                className="btn btn-sm btn-alt-primary v2board-toolbar-icon"
                title="添加订阅"
                onClick={() => {
                  setActivePlan(null)
                  setEditorOpen(true)
                }}
              >
                <i className="fa fa-plus" />
              </button>
            </div>
          </div>
        </div>

        <div className="block-content p-0">
          <div className="table-responsive">
            <table className="table table-striped table-vcenter mb-0">
              <thead>
                <tr>
                  <th>排序</th>
                  <th>销售状态</th>
                  <th>
                    续费
                    <Tooltip title="在订阅停止销售时，已购用户是否可以续费">
                      <i className="fa fa-question-circle v2board-help-icon" />
                    </Tooltip>
                  </th>
                  <th>名称</th>
                  <th>统计</th>
                  <th>流量</th>
                  <th>设备数限制</th>
                  <th>月付</th>
                  <th>季付</th>
                  <th>半年付</th>
                  <th>年付</th>
                  <th>两年付</th>
                  <th>三年付</th>
                  <th>一次性</th>
                  <th>重置包</th>
                  <th>权限组</th>
                  <th className="text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={17} className="text-center py-4 v2board-table-loading-row">
                      <div className="spinner-grow text-primary" role="status">
                        <span className="sr-only">Loading...</span>
                      </div>
                    </td>
                  </tr>
                ) : sortedPlans.length ? (
                  sortedPlans.map((plan, index) => {
                    const actionItems: MenuProps['items'] = [
                      {
                        key: 'edit',
                        label: '编辑',
                      },
                      {
                        key: 'delete',
                        label: <span className="text-danger">删除</span>,
                      },
                    ]

                    return (
                      <tr
                        key={plan.id}
                        draggable
                        className={dragIndex === index ? 'v2board-drag-row' : ''}
                        onDragStart={() => setDragIndex(index)}
                        onDragOver={(event) => event.preventDefault()}
                        onDragEnd={() => setDragIndex(null)}
                        onDrop={async () => {
                          if (dragIndex === null || dragIndex === index) return
                          const nextPlans = [...sortedPlans]
                          const [currentPlan] = nextPlans.splice(dragIndex, 1)
                          nextPlans.splice(index, 0, currentPlan)
                          setPlans(nextPlans.map((item, itemIndex) => ({ ...item, sort: itemIndex + 1 })))
                          setDragIndex(null)
                          await sortAdminPlans(nextPlans.map((item) => item.id))
                          message.success('排序已更新')
                          await loadData()
                        }}
                      >
                        <td>
                          <i className="fa fa-bars text-muted v2board-drag-handle mr-2" />
                          {plan.sort ?? index + 1}
                        </td>
                        <td>
                          <Switch
                            size="small"
                            checked={Boolean(Number(plan.show ?? 0))}
                            onChange={async (checked) => {
                              await updateAdminPlan(plan.id, { show: checked ? 1 : 0 })
                              await loadData()
                            }}
                          />
                        </td>
                        <td>
                          <Switch
                            size="small"
                            checked={Boolean(Number(plan.renew ?? 0))}
                            onChange={async (checked) => {
                              await updateAdminPlan(plan.id, { renew: checked ? 1 : 0 })
                              await loadData()
                            }}
                          />
                        </td>
                        <td>
                          <div className="v2board-inline-stack">
                            <span className="v2board-plan-name">{plan.name}</span>
                            <span className="v2board-plan-meta">权限组：{getGroupName(plan.group_id, groups)}</span>
                          </div>
                        </td>
                        <td>
                          <i className="fa fa-user mr-1 text-muted" />
                          {plan.count ?? 0}
                        </td>
                        <td>{plan.transfer_enable !== null && plan.transfer_enable !== undefined ? `${plan.transfer_enable} GB` : '-'}</td>
                        <td>{plan.device_limit ?? '-'}</td>
                        <td>{toMoneyText(plan.month_price)}</td>
                        <td>{toMoneyText(plan.quarter_price)}</td>
                        <td>{toMoneyText(plan.half_year_price)}</td>
                        <td>{toMoneyText(plan.year_price)}</td>
                        <td>{toMoneyText(plan.two_year_price)}</td>
                        <td>{toMoneyText(plan.three_year_price)}</td>
                        <td>{toMoneyText(plan.onetime_price)}</td>
                        <td>{toMoneyText(plan.reset_price)}</td>
                        <td>
                          <span className="badge badge-primary">{getGroupName(plan.group_id, groups)}</span>
                        </td>
                        <td className="text-right">
                          <Dropdown
                            trigger={['click']}
                            menu={{
                              items: actionItems,
                              onClick: async ({ key }) => {
                                if (key === 'edit') {
                                  setActivePlan(plan)
                                  setEditorOpen(true)
                                  return
                                }
                                if (key === 'delete') {
                                  Modal.confirm({
                                    title: '警告',
                                    content: `确定删除订阅 ${plan.name} 吗？`,
                                    okText: '确定',
                                    cancelText: '取消',
                                    onOk: async () => {
                                      await deleteAdminPlan(plan.id)
                                      message.success('订阅已删除')
                                      await loadData()
                                    },
                                  })
                                }
                              },
                            }}
                          >
                            <button type="button" className="v2board-link-button v2board-dropdown-trigger v2board-row-action">
                              <span>操作</span>
                              <i className="fa fa-caret-down" />
                            </button>
                          </Dropdown>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={17} className="text-center text-muted py-4 v2board-list-empty">
                      暂无订阅
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <PlanEditorDrawer
        open={editorOpen}
        currencySymbol={currencySymbol}
        groups={groups}
        loading={saving}
        plan={activePlan}
        onCancel={() => {
          setEditorOpen(false)
          setActivePlan(null)
        }}
        onSubmit={async (payload) => {
          setSaving(true)
          try {
            await saveAdminPlan(payload)
            message.success('订阅保存成功')
            setEditorOpen(false)
            setActivePlan(null)
            await loadData()
          } finally {
            setSaving(false)
          }
        }}
      />
    </>
  )
}
