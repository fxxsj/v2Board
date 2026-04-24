import { useEffect, useMemo, useState } from 'react'
import { Drawer, Input, Modal, Select, Switch, Tooltip, message } from 'antd'
import {
  deleteAdminPayment,
  getAdminPayments,
  getPaymentForm,
  getPaymentMethods,
  saveAdminPayment,
  sortAdminPayments,
  toggleAdminPayment,
  type AdminPayment,
  type PaymentConfigField,
} from '@/api/admin'

type PaymentFormState = {
  id?: number
  name: string
  icon: string
  notify_domain: string
  handling_fee_percent: string
  handling_fee_fixed: string
}

function createPaymentForm(record?: AdminPayment | null): PaymentFormState {
  return {
    id: record?.id,
    name: String(record?.name ?? ''),
    icon: String(record?.icon ?? ''),
    notify_domain: String(record?.notify_domain ?? ''),
    handling_fee_percent:
      record?.handling_fee_percent === null || record?.handling_fee_percent === undefined
        ? ''
        : String(record.handling_fee_percent),
    handling_fee_fixed:
      record?.handling_fee_fixed === null || record?.handling_fee_fixed === undefined
        ? ''
        : String((Number(record.handling_fee_fixed) / 100).toFixed(2)),
  }
}

function PaymentEditorModal({
  open,
  loading,
  record,
  onCancel,
  onSubmit,
}: {
  open: boolean
  loading: boolean
  record?: AdminPayment | null
  onCancel: () => void
  onSubmit: (payload: Record<string, unknown>) => Promise<void>
}) {
  const [form, setForm] = useState<PaymentFormState>(createPaymentForm())
  const [paymentMethods, setPaymentMethods] = useState<string[]>([])
  const [selectedMethod, setSelectedMethod] = useState<string>()
  const [gatewayForm, setGatewayForm] = useState<Record<string, PaymentConfigField>>({})
  const [config, setConfig] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return

    let active = true

    async function bootstrap() {
      const methods = await getPaymentMethods()
      if (!active) return

      const nextMethod = record?.payment || methods[0]
      setPaymentMethods(methods)
      setSelectedMethod(nextMethod)
      setForm(createPaymentForm(record))
      setConfig((record?.config as Record<string, string> | undefined) ?? {})

      if (nextMethod) {
        const nextForm = await getPaymentForm(nextMethod, record?.id)
        if (!active) return
        setGatewayForm(nextForm)
      }
    }

    bootstrap()

    return () => {
      active = false
      setPaymentMethods([])
      setSelectedMethod(undefined)
      setGatewayForm({})
      setConfig({})
    }
  }, [open, record])

  return (
    <Drawer
      className="v2board-editor-drawer"
      title={record?.id ? '编辑支付方式' : '添加支付方式'}
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
              if (!form.name.trim()) {
                message.error('显示名称不能为空')
                return
              }
              if (!selectedMethod) {
                message.error('支付接口不能为空')
                return
              }

              await onSubmit({
                ...(form.id ? { id: form.id } : {}),
                name: form.name.trim(),
                icon: form.icon.trim() || null,
                payment: selectedMethod,
                config,
                notify_domain: form.notify_domain.trim() || null,
                handling_fee_percent: form.handling_fee_percent.trim() ? Number(form.handling_fee_percent) : null,
                handling_fee_fixed: form.handling_fee_fixed.trim()
                  ? Math.round(Number(form.handling_fee_fixed) * 100)
                  : null,
              })
            }}
          >
            {record?.id ? '保存' : '添加'}
          </button>
        </div>
      }
    >
      <div className="v2board-editor-form">
        <div className="v2board-editor-section">
          <div className="v2board-editor-section-title">基础信息</div>
          <div className="form-group">
            <label className="mb-2">显示名称</label>
            <Input
              placeholder="用于前端显示使用"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="mb-2">图标 URL(选填)</label>
            <Input
              placeholder="用于前端显示使用(https://x.com/icon.svg)"
              value={form.icon}
              onChange={(event) => setForm((current) => ({ ...current, icon: event.target.value }))}
            />
          </div>

          <div className="form-group mb-0">
            <label className="mb-2">自定义通知域名(选填)</label>
            <Input
              placeholder="网关的通知将会发送到该域名(https://x.com)"
              value={form.notify_domain}
              onChange={(event) => setForm((current) => ({ ...current, notify_domain: event.target.value }))}
            />
          </div>
        </div>

        <div className="v2board-editor-section">
          <div className="v2board-editor-section-title">费率与接口</div>
          <div className="row">
            <div className="col-6">
              <div className="form-group">
                <label className="mb-2">百分比手续费(选填)</label>
                <Input
                  suffix="%"
                  placeholder="在订单金额基础上附加手续费"
                  value={form.handling_fee_percent}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, handling_fee_percent: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="col-6">
              <div className="form-group">
                <label className="mb-2">固定手续费(选填)</label>
                <Input
                  placeholder="在订单金额基础上附加手续费"
                  value={form.handling_fee_fixed}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, handling_fee_fixed: event.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="form-group mb-0">
            <label className="mb-2">接口文件</label>
            <Select
              className="w-100"
              value={selectedMethod}
              options={paymentMethods.map((item) => ({ label: item, value: item }))}
              onChange={async (value) => {
                setSelectedMethod(value)
                const nextForm = await getPaymentForm(value, form.id)
                setGatewayForm(nextForm)
              }}
            />
          </div>
        </div>

        <div className="v2board-editor-section mb-0">
          <div className="v2board-editor-section-title">网关参数</div>
          {Object.entries(gatewayForm).map(([key, field]) => (
            <div key={key} className="form-group">
              <label className="mb-2">{field.label}</label>
              {field.type === 'input' || !field.type ? (
                <Input
                  placeholder={field.description}
                  value={config[key] ?? field.value ?? ''}
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                />
              ) : null}
            </div>
          ))}

          {selectedMethod === 'MGate' ? (
            <div className="alert alert-warning mb-0" role="alert">
              <p className="mb-0">MGate TG@nulledsan</p>
            </div>
          ) : null}
        </div>
      </div>
    </Drawer>
  )
}

export function PaymentPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [payments, setPayments] = useState<AdminPayment[]>([])
  const [editorOpen, setEditorOpen] = useState(false)
  const [activePayment, setActivePayment] = useState<AdminPayment | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const loadPayments = async () => {
    setLoading(true)
    try {
      const result = await getAdminPayments()
      setPayments(result)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPayments()
  }, [])

  const sortedPayments = useMemo(
    () => [...payments].sort((left, right) => Number(left.sort ?? left.id) - Number(right.sort ?? right.id)),
    [payments],
  )

  return (
    <>
      <div className="block border-bottom v2board-payment-page">
        <div className="bg-white">
          <div className="v2board-table-action v2board-list-toolbar p-3">
            <div className="v2board-list-toolbar-left">
              <button
                type="button"
                className="btn btn-sm btn-alt-primary v2board-toolbar-icon"
                title="添加支付方式"
                onClick={() => {
                  setActivePayment(null)
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
                  <th style={{ width: 112 }}>ID</th>
                  <th style={{ width: 78 }}>启用</th>
                  <th>显示名称</th>
                  <th style={{ width: 134 }}>支付接口</th>
                  <th>
                    通知地址
                    <Tooltip title="支付网关将会把数据通知到本地址，请通过防火墙放行本地址。">
                      <i className="fa fa-question-circle v2board-help-icon" />
                    </Tooltip>
                  </th>
                  <th className="text-right" style={{ width: 126 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 v2board-table-loading-row">
                      <div className="spinner-grow text-primary" role="status">
                        <span className="sr-only">Loading...</span>
                      </div>
                    </td>
                  </tr>
                ) : sortedPayments.length ? (
                  sortedPayments.map((payment, index) => {
                    return (
                      <tr
                        key={payment.id}
                        draggable
                        className={dragIndex === index ? 'v2board-drag-row' : ''}
                        onDragStart={() => setDragIndex(index)}
                        onDragOver={(event) => event.preventDefault()}
                        onDragEnd={() => setDragIndex(null)}
                        onDrop={async () => {
                          if (dragIndex === null || dragIndex === index) return
                          const nextPayments = [...sortedPayments]
                          const [currentPayment] = nextPayments.splice(dragIndex, 1)
                          nextPayments.splice(index, 0, currentPayment)
                          setPayments(nextPayments.map((item, itemIndex) => ({ ...item, sort: itemIndex + 1 })))
                          setDragIndex(null)
                          await sortAdminPayments(nextPayments.map((item) => item.id))
                          message.success('排序已更新')
                          await loadPayments()
                        }}
                      >
                        <td>
                          <i className="fa fa-bars text-muted v2board-drag-handle mr-2" />
                          {payment.id}
                        </td>
                        <td className="v2board-switch-cell">
                          <Switch
                            size="small"
                            checked={Boolean(Number(payment.enable))}
                            onChange={async () => {
                              await toggleAdminPayment(payment.id)
                              await loadPayments()
                            }}
                          />
                        </td>
                        <td>
                          <div className="v2board-inline-stack">
                            <span className="v2board-plan-name">{payment.name}</span>
                          </div>
                        </td>
                        <td><span className="badge badge-primary v2board-status-badge">{payment.payment}</span></td>
                        <td className="text-break">{payment.notify_url || '-'}</td>
                        <td className="text-right">
                          <div className="v2board-list-actions">
                            <button
                              type="button"
                              className="v2board-link-button v2board-row-action"
                              onClick={() => {
                                setActivePayment(payment)
                                setEditorOpen(true)
                              }}
                            >
                              编辑
                            </button>
                            <span className="text-muted">|</span>
                            <button
                              type="button"
                              className="v2board-link-button text-danger v2board-row-action"
                              onClick={() => {
                                Modal.confirm({
                                  title: '警告',
                                  content: '确定要删除该条项目吗？',
                                  okText: '确定',
                                  cancelText: '取消',
                                  onOk: async () => {
                                    await deleteAdminPayment(payment.id)
                                    message.success('支付方式已删除')
                                    await loadPayments()
                                  },
                                })
                              }}
                            >
                              删除
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-4 v2board-list-empty">
                      暂无支付方式
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <PaymentEditorModal
        open={editorOpen}
        loading={saving}
        record={activePayment}
        onCancel={() => {
          setEditorOpen(false)
          setActivePayment(null)
        }}
        onSubmit={async (payload) => {
          setSaving(true)
          try {
            await saveAdminPayment(payload)
            message.success('支付方式保存成功')
            setEditorOpen(false)
            setActivePayment(null)
            await loadPayments()
          } finally {
            setSaving(false)
          }
        }}
      />
    </>
  )
}
