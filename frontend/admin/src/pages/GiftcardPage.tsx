import { useEffect, useMemo, useState } from 'react'
import { Drawer, Input, Modal, Select, message } from 'antd'
import {
  deleteAdminGiftcard,
  generateAdminGiftcard,
  getAdminGiftcards,
  getAdminPlans,
  type AdminGiftcard,
  type AdminPlan,
} from '@/api/admin'

const giftcardTypeOptions = [
  { value: 1, label: '增加账户余额' },
  { value: 2, label: '增加订阅时长' },
  { value: 3, label: '增加套餐流量' },
  { value: 4, label: '重置套餐流量' },
  { value: 5, label: '兑换订阅套餐' },
]

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

function getGiftcardValueText(card: AdminGiftcard) {
  switch (card.type) {
    case 1:
      return `${Number(card.value).toFixed(2)} ¥`
    case 2:
      return `${card.value} 天`
    case 3:
      return `${card.value} GB`
    case 4:
      return '-'
    case 5:
      return `${card.value} 天`
    default:
      return String(card.value)
  }
}

function GiftcardEditorModal({
  open,
  loading,
  record,
  plans,
  onCancel,
  onSubmit,
}: {
  open: boolean
  loading: boolean
  record: AdminGiftcard | null
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
        : { type: 1 },
    )
  }, [open, record])

  return (
    <Drawer
      className="v2board-editor-drawer"
      title={form.id ? '编辑礼品卡' : '新建礼品卡'}
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
              await onSubmit({
                ...(form.id ? { id: form.id } : {}),
                name: form.name,
                code: form.code || undefined,
                type: Number(form.type),
                value: Number(form.type) === 4 ? 0 : Number(form.value),
                plan_id: Number(form.type) === 5 ? Number(form.plan_id) : null,
                started_at: toTimestamp(String(form.started_at ?? '')),
                ended_at: toTimestamp(String(form.ended_at ?? '')),
                limit_use: form.limit_use ? Number(form.limit_use) : null,
                generate_count: form.generate_count ? Number(form.generate_count) : undefined,
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
          <div className="v2board-editor-section-title">基础信息</div>
          <div className="form-group">
            <label className="mb-2">名称</label>
            <Input value={String(form.name ?? '')} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </div>
          {!form.generate_count ? (
            <div className="form-group mb-0">
              <label className="mb-2">自定义礼品卡卡密</label>
              <Input
                value={String(form.code ?? '')}
                onChange={(event) => setForm((current) => ({ ...current, code: event.target.value, generate_count: undefined }))}
              />
            </div>
          ) : null}
        </div>

        <div className="v2board-editor-section">
          <div className="v2board-editor-section-title">礼品配置</div>
          <div className="form-group">
            <label className="mb-2">礼品卡类型</label>
            <Input
              type="number"
              addonBefore={
                <Select
                  style={{ width: 140 }}
                  value={Number(form.type ?? 1)}
                  options={giftcardTypeOptions}
                  onChange={(value) => setForm((current) => ({ ...current, type: value }))}
                />
              }
              addonAfter={
                Number(form.type) === 1 ? '¥' : Number(form.type) === 2 || Number(form.type) === 5 ? '天' : Number(form.type) === 3 ? 'GB' : ''
              }
              disabled={Number(form.type) === 4}
              placeholder={Number(form.type) === 5 ? '一次性套餐输入0' : '请输入值'}
              value={Number(form.type) === 4 ? '0' : String(form.value ?? '')}
              onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))}
            />
          </div>
          {Number(form.type) === 5 ? (
            <div className="form-group mb-0">
              <label className="mb-2">指定订阅</label>
              <Select
                className="w-100"
                value={form.plan_id ? String(form.plan_id) : undefined}
                options={plans.map((plan) => ({ value: String(plan.id), label: plan.name }))}
                onChange={(value) => setForm((current) => ({ ...current, plan_id: value }))}
              />
            </div>
          ) : null}
        </div>

        <div className="v2board-editor-section mb-0">
          <div className="v2board-editor-section-title">使用规则</div>
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
            <Input value={String(form.limit_use ?? '')} onChange={(event) => setForm((current) => ({ ...current, limit_use: event.target.value }))} />
          </div>
          {!form.code && !form.id ? (
            <div className="form-group mb-0">
              <label className="mb-2">生成数量</label>
              <Input
                value={String(form.generate_count ?? '')}
                onChange={(event) => setForm((current) => ({ ...current, generate_count: event.target.value, code: undefined }))}
              />
            </div>
          ) : null}
        </div>
      </div>
    </Drawer>
  )
}

export function GiftcardPage() {
  const [loading, setLoading] = useState(true)
  const [giftcards, setGiftcards] = useState<AdminGiftcard[]>([])
  const [plans, setPlans] = useState<AdminPlan[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [editorOpen, setEditorOpen] = useState(false)
  const [activeGiftcard, setActiveGiftcard] = useState<AdminGiftcard | null>(null)
  const [saving, setSaving] = useState(false)

  const loadGiftcards = async (nextPage = page) => {
    setLoading(true)
    try {
      const result = await getAdminGiftcards({ current: nextPage, pageSize, sort: 'id', sort_type: 'DESC' })
      setGiftcards(
        result.data.map((giftcard) => ({
          ...giftcard,
          value: giftcard.type === 1 ? Number(giftcard.value) / 100 : Number(giftcard.value),
        })),
      )
      setTotal(result.total)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    Promise.allSettled([loadGiftcards(1), getAdminPlans()]).then(([, plansResult]) => {
      if (plansResult.status === 'fulfilled') setPlans(plansResult.value)
    })
  }, [])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [pageSize, total])

  return (
    <>
      <div className="block border-bottom v2board-giftcard-page">
        <div className="bg-white">
          <div className="v2board-table-action v2board-list-toolbar p-3">
            <div className="v2board-list-toolbar-left">
              <button
                type="button"
                className="btn btn-sm btn-alt-primary v2board-toolbar-icon"
                title="添加礼品卡"
                onClick={() => {
                  setActiveGiftcard(null)
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
                  <th>名称</th>
                  <th style={{ width: 106 }}>类型</th>
                  <th style={{ width: 124 }}>数值</th>
                  <th style={{ width: 132 }}>套餐</th>
                  <th style={{ width: 180 }}>卡密</th>
                  <th style={{ width: 112 }}>剩余次数</th>
                  <th style={{ width: 188 }}>有效期</th>
                  <th className="text-right" style={{ width: 126 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-4 v2board-table-loading-row"><div className="spinner-grow text-primary" role="status"><span className="sr-only">Loading...</span></div></td></tr>
                ) : giftcards.length ? (
                  giftcards.map((giftcard) => (
                    <tr key={giftcard.id}>
                      <td>{giftcard.id}</td>
                      <td><span className="v2board-plan-name">{giftcard.name}</span></td>
                      <td><span className="badge badge-primary v2board-status-badge">{giftcardTypeOptions.find((item) => item.value === giftcard.type)?.label ?? giftcard.type}</span></td>
                      <td>{getGiftcardValueText(giftcard)}</td>
                      <td>{plans.find((item) => item.id === giftcard.plan_id)?.name ?? '-'}</td>
                      <td>
                        <button
                          type="button"
                          className="v2board-link-button text-danger v2board-copy-code"
                          onClick={async () => {
                            await navigator.clipboard.writeText(giftcard.code)
                            message.success('复制成功')
                          }}
                        >
                          {giftcard.code}
                        </button>
                      </td>
                      <td>{giftcard.limit_use !== null ? giftcard.limit_use : '无限'}</td>
                      <td>{formatDateRange(giftcard.started_at, giftcard.ended_at)}</td>
                      <td className="text-right">
                        <div className="v2board-list-actions">
                          <button type="button" className="v2board-link-button v2board-row-action" onClick={() => { setActiveGiftcard(giftcard); setEditorOpen(true) }}>
                            编辑
                          </button>
                          <span className="text-muted">|</span>
                          <button
                            type="button"
                            className="v2board-link-button v2board-row-action"
                            onClick={async () => {
                              Modal.confirm({
                                title: '警告',
                                content: '确定删除该礼品卡吗？',
                                okText: '确定',
                                cancelText: '取消',
                                onOk: async () => {
                                  await deleteAdminGiftcard(giftcard.id)
                                  message.success('礼品卡已删除')
                                  await loadGiftcards()
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
                  <tr><td colSpan={9} className="text-center text-muted py-4 v2board-list-empty">暂无礼品卡</td></tr>
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
                    const result = await getAdminGiftcards({
                      current: 1,
                      pageSize: nextPageSize,
                      sort: 'id',
                      sort_type: 'DESC',
                    })
                    setGiftcards(
                      result.data.map((giftcard) => ({
                        ...giftcard,
                        value: giftcard.type === 1 ? Number(giftcard.value) / 100 : Number(giftcard.value),
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
              <button type="button" className="btn btn-sm btn-alt-secondary mr-2" disabled={page <= 1 || loading} onClick={async () => { const next = page - 1; setPage(next); await loadGiftcards(next) }}>上一页</button>
              <span className="text-muted mr-2">{page} / {totalPages}</span>
              <button type="button" className="btn btn-sm btn-alt-secondary" disabled={page >= totalPages || loading} onClick={async () => { const next = page + 1; setPage(next); await loadGiftcards(next) }}>下一页</button>
            </div>
          </div>
        </div>
      </div>
      <GiftcardEditorModal
        open={editorOpen}
        loading={saving}
        record={activeGiftcard}
        plans={plans}
        onCancel={() => {
          setEditorOpen(false)
          setActiveGiftcard(null)
        }}
        onSubmit={async (payload) => {
          setSaving(true)
          try {
            const result = await generateAdminGiftcard(payload)
            if (result instanceof ArrayBuffer) {
              downloadCsv(result, `GIFTCARD ${new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19)}.csv`)
            }
            message.success('礼品卡保存成功')
            setEditorOpen(false)
            setActiveGiftcard(null)
            setPage(1)
            await loadGiftcards(1)
          } finally {
            setSaving(false)
          }
        }}
      />
    </>
  )
}
