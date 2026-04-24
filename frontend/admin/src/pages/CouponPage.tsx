import { useEffect, useMemo, useState } from 'react'
import { Drawer, Input, Modal, Select, Switch, message } from 'antd'
import {
  deleteAdminCoupon,
  generateAdminCoupon,
  getAdminCoupons,
  getAdminPlans,
  toggleAdminCoupon,
  type AdminCoupon,
  type AdminPlan,
} from '@/api/admin'

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

function formatDateRange(startedAt: number, endedAt: number) {
  const formatDate = (value: number) => {
    const date = new Date(value * 1000)
    const pad = (num: number) => String(num).padStart(2, '0')
    return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
  }

  return `${formatDate(startedAt)} ~ ${formatDate(endedAt)}`
}

function formatDateTimeLocal(value?: number | null) {
  if (!value) return ''
  const date = new Date(value * 1000)
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`
}

function toTimestamp(value: string) {
  return value ? Math.floor(new Date(value).getTime() / 1000) : null
}

function downloadCsv(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], { type: 'text/plain;charset=UTF-8' })
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.style.display = 'none'
  anchor.download = filename
  anchor.click()
  window.URL.revokeObjectURL(url)
}

function CouponEditorModal({
  open,
  loading,
  record,
  plans,
  onCancel,
  onSubmit,
}: {
  open: boolean
  loading: boolean
  record: AdminCoupon | null
  plans: AdminPlan[]
  onCancel: () => void
  onSubmit: (payload: Record<string, unknown>) => Promise<void>
}) {
  const [form, setForm] = useState<Record<string, unknown>>({ type: 1 })

  useEffect(() => {
    if (!open) return
    setForm(
      record
        ? {
            ...record,
            value: record.type === 1 ? Number(record.value) / 100 : record.value,
            started_at: formatDateTimeLocal(record.started_at),
            ended_at: formatDateTimeLocal(record.ended_at),
          }
        : {
            type: 1,
          },
    )
  }, [open, record])

  const isBulk = !form.code && !form.id

  return (
    <Drawer
      className="v2board-editor-drawer"
      title={form.id ? '编辑优惠券' : '新建优惠券'}
      open={open}
      width="80%"
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
              const payload = {
                ...(form.id ? { id: form.id } : {}),
                name: form.name,
                code: form.code || undefined,
                type: Number(form.type),
                value: Number(form.value),
                started_at: toTimestamp(String(form.started_at ?? '')),
                ended_at: toTimestamp(String(form.ended_at ?? '')),
                limit_use: form.limit_use ? Number(form.limit_use) : null,
                limit_use_with_user: form.limit_use_with_user ? Number(form.limit_use_with_user) : null,
                limit_plan_ids: form.limit_plan_ids || null,
                limit_period: form.limit_period || null,
                generate_count: form.generate_count ? Number(form.generate_count) : undefined,
              }
              await onSubmit(payload)
            }}
          >
            提交
          </button>
        </div>
      }
    >
      <div className="v2board-editor-form">
        <div className="v2board-editor-section">
          <div className="v2board-editor-section-title">基础信息</div>
          <div className="form-group">
            <label className="mb-2">名称</label>
            <Input value={String(form.name ?? '')} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </div>
          {!form.generate_count ? (
            <div className="form-group mb-0">
              <label className="mb-2">自定义优惠券码</label>
              <Input
                placeholder="自定义优惠券码(留空随机生成)"
                value={String(form.code ?? '')}
                onChange={(event) =>
                  setForm((current) => ({ ...current, code: event.target.value, generate_count: undefined }))
                }
              />
            </div>
          ) : null}
        </div>
        <div className="v2board-editor-section">
          <div className="v2board-editor-section-title">优惠规则</div>
          <div className="form-group">
            <label className="mb-2">优惠信息</label>
            <Input
              type="number"
              addonBefore={
                <Select
                  style={{ width: 120 }}
                  value={Number(form.type ?? 1)}
                  onChange={(value) => setForm((current) => ({ ...current, type: value }))}
                  options={[
                    { value: 1, label: '按金额优惠' },
                    { value: 2, label: '按比例优惠' },
                  ]}
                />
              }
              addonAfter={Number(form.type ?? 1) === 1 ? '¥' : '%'}
              value={String(form.value ?? '')}
              onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))}
            />
          </div>
          <div className="row">
            <div className="col-sm-6">
              <div className="form-group">
                <label className="mb-2">开始时间</label>
                <Input
                  type="datetime-local"
                  value={String(form.started_at ?? '')}
                  onChange={(event) => setForm((current) => ({ ...current, started_at: event.target.value }))}
                />
              </div>
            </div>
            <div className="col-sm-6">
              <div className="form-group">
                <label className="mb-2">结束时间</label>
                <Input
                  type="datetime-local"
                  value={String(form.ended_at ?? '')}
                  onChange={(event) => setForm((current) => ({ ...current, ended_at: event.target.value }))}
                />
              </div>
            </div>
          </div>
          <div className="form-group">
            <label className="mb-2">最大使用次数</label>
            <Input
              value={String(form.limit_use ?? '')}
              onChange={(event) => setForm((current) => ({ ...current, limit_use: event.target.value }))}
            />
          </div>
          <div className="form-group mb-0">
            <label className="mb-2">每个用户可使用次数</label>
            <Input
              value={String(form.limit_use_with_user ?? '')}
              onChange={(event) => setForm((current) => ({ ...current, limit_use_with_user: event.target.value }))}
            />
          </div>
        </div>
        <div className="v2board-editor-section mb-0">
          <div className="v2board-editor-section-title">使用限制</div>
          <div className="form-group">
            <label className="mb-2">指定订阅</label>
            <Select
              mode="multiple"
              className="w-100"
              value={(form.limit_plan_ids as string[] | undefined) ?? []}
              options={plans.map((plan) => ({ value: String(plan.id), label: plan.name }))}
              onChange={(value) => setForm((current) => ({ ...current, limit_plan_ids: value.length ? value : null }))}
            />
          </div>
          <div className="form-group">
            <label className="mb-2">指定周期</label>
            <Select
              mode="multiple"
              className="w-100"
              value={(form.limit_period as string[] | undefined) ?? []}
              options={Object.entries(periodText).map(([value, label]) => ({ value, label }))}
              onChange={(value) => setForm((current) => ({ ...current, limit_period: value.length ? value : null }))}
            />
          </div>
          {!form.code && !form.id ? (
            <div className="form-group mb-0">
              <label className="mb-2">生成数量</label>
              <Input
                value={String(form.generate_count ?? '')}
                onChange={(event) =>
                  setForm((current) => ({ ...current, generate_count: event.target.value, code: undefined }))
                }
              />
            </div>
          ) : null}
        </div>
      </div>
    </Drawer>
  )
}

export function CouponPage() {
  const [loading, setLoading] = useState(true)
  const [coupons, setCoupons] = useState<AdminCoupon[]>([])
  const [plans, setPlans] = useState<AdminPlan[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [editorOpen, setEditorOpen] = useState(false)
  const [activeCoupon, setActiveCoupon] = useState<AdminCoupon | null>(null)
  const [saving, setSaving] = useState(false)

  const loadCoupons = async (nextPage = page) => {
    setLoading(true)
    try {
      const result = await getAdminCoupons({ current: nextPage, pageSize, sort: 'id', sort_type: 'DESC' })
      setCoupons(
        result.data.map((coupon) => ({
          ...coupon,
          value: coupon.type === 1 ? Number(coupon.value) / 100 : Number(coupon.value),
        })),
      )
      setTotal(result.total)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    Promise.allSettled([loadCoupons(1), getAdminPlans()]).then(([, plansResult]) => {
      if (plansResult.status === 'fulfilled') setPlans(plansResult.value)
    })
  }, [])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [pageSize, total])

  return (
    <>
      <div className="block border-bottom v2board-coupon-page">
        <div className="bg-white">
          <div className="v2board-table-action v2board-list-toolbar p-3">
            <div className="v2board-list-toolbar-left">
              <button
                type="button"
                className="btn btn-sm btn-alt-primary v2board-toolbar-icon"
                title="添加优惠券"
                onClick={() => {
                  setActiveCoupon(null)
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
                  <th style={{ width: 88 }}>#</th>
                  <th style={{ width: 78 }}>启用</th>
                  <th>券名称</th>
                  <th style={{ width: 92 }}>类型</th>
                  <th style={{ width: 180 }}>券码</th>
                  <th style={{ width: 112 }}>剩余次数</th>
                  <th style={{ width: 188 }}>有效期</th>
                  <th className="text-right" style={{ width: 126 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-4 v2board-table-loading-row"><div className="spinner-grow text-primary" role="status"><span className="sr-only">Loading...</span></div></td></tr>
                ) : coupons.length ? (
                  coupons.map((coupon) => (
                    <tr key={coupon.id}>
                      <td>{coupon.id}</td>
                      <td className="v2board-switch-cell">
                        <Switch
                          size="small"
                          checked={Boolean(coupon.show)}
                          onChange={async () => {
                            await toggleAdminCoupon(coupon.id)
                            await loadCoupons()
                          }}
                        />
                      </td>
                      <td><span className="v2board-plan-name">{coupon.name}</span></td>
                      <td><span className="badge badge-primary v2board-status-badge">{coupon.type === 1 ? '金额' : '比例'}</span></td>
                      <td>
                        <button
                          type="button"
                          className="v2board-link-button text-danger v2board-copy-code"
                          onClick={async () => {
                            await navigator.clipboard.writeText(coupon.code)
                            message.success('复制成功')
                          }}
                        >
                          {coupon.code}
                        </button>
                      </td>
                      <td>{coupon.limit_use !== null ? coupon.limit_use : '无限'}</td>
                      <td>{formatDateRange(coupon.started_at, coupon.ended_at)}</td>
                      <td className="text-right">
                        <div className="v2board-list-actions">
                          <button type="button" className="v2board-link-button v2board-row-action" onClick={() => { setActiveCoupon(coupon); setEditorOpen(true) }}>
                            编辑
                          </button>
                          <span className="text-muted">|</span>
                          <button
                            type="button"
                            className="v2board-link-button v2board-row-action"
                            onClick={async () => {
                              Modal.confirm({
                                title: '警告',
                                content: '确定删除该优惠券吗？',
                                okText: '确定',
                                cancelText: '取消',
                                onOk: async () => {
                                  await deleteAdminCoupon(coupon.id)
                                  message.success('优惠券已删除')
                                  await loadCoupons()
                                },
                              })
                            }}
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={8} className="text-center text-muted py-4 v2board-list-empty">暂无优惠券</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="d-flex justify-content-between align-items-center px-3 py-3 border-top v2board-list-pagination">
            <div className="v2board-pagination-tools text-muted">
              <span className="mr-2">共 {total} 条</span>
              <select
                className="form-control form-control-sm"
                style={{ width: 110 }}
                value={pageSize}
                onChange={async (event) => {
                  const nextPageSize = Number(event.target.value)
                  setPageSize(nextPageSize)
                  setPage(1)
                  setLoading(true)
                  try {
                    const result = await getAdminCoupons({
                      current: 1,
                      pageSize: nextPageSize,
                      sort: 'id',
                      sort_type: 'DESC',
                    })
                    setCoupons(
                      result.data.map((coupon) => ({
                        ...coupon,
                        value: coupon.type === 1 ? Number(coupon.value) / 100 : Number(coupon.value),
                      })),
                    )
                    setTotal(result.total)
                  } finally {
                    setLoading(false)
                  }
                }}
              >
                {[10, 50, 100, 150].map((size) => (
                  <option key={size} value={size}>
                    {size} / 页
                  </option>
                ))}
              </select>
            </div>
            <div className="v2board-pagination-tools">
              <button type="button" className="btn btn-sm btn-alt-secondary mr-2" disabled={page <= 1 || loading} onClick={async () => { const next = page - 1; setPage(next); await loadCoupons(next) }}>上一页</button>
              <span className="text-muted mr-2">{page} / {totalPages}</span>
              <button type="button" className="btn btn-sm btn-alt-secondary" disabled={page >= totalPages || loading} onClick={async () => { const next = page + 1; setPage(next); await loadCoupons(next) }}>下一页</button>
            </div>
          </div>
        </div>
      </div>
      <CouponEditorModal
        open={editorOpen}
        loading={saving}
        record={activeCoupon}
        plans={plans}
        onCancel={() => {
          setEditorOpen(false)
          setActiveCoupon(null)
        }}
        onSubmit={async (payload) => {
          setSaving(true)
          try {
            const result = await generateAdminCoupon(payload)
            if (result instanceof ArrayBuffer) {
              downloadCsv(result, `COUPON ${new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19)}.csv`)
            }
            message.success('优惠券保存成功')
            setEditorOpen(false)
            setActiveCoupon(null)
            setPage(1)
            await loadCoupons(1)
          } finally {
            setSaving(false)
          }
        }}
      />
    </>
  )
}
