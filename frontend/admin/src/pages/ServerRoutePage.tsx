import { useEffect, useState } from 'react'
import { Drawer, Input, Modal, Select, message } from 'antd'
import {
  deleteServerRoute,
  getServerRoutes,
  saveServerRoute,
  type ServerRoute,
} from '@/api/admin'

const routeActionText: Record<string, string> = {
  block: '禁止访问',
  block_ip: '禁止访问(IP目标)',
  block_port: '禁止访问(端口目标)',
  protocol: '按协议拦截',
  dns: '指定 DNS',
  route: '指定出站服务器',
  route_ip: '指定出站服务器(IP目标)',
  default_out: '默认出口',
}

function getMatchPlaceholder(action?: string) {
  if (action === 'protocol') return 'http\ntls\nquic\nbittorrent'
  if (action === 'block_port') return '53\n443\n1000-2000'
  if (action === 'route_ip' || action === 'block_ip') {
    return '127.0.0.1(单一匹配)\n10.0.0.0/8(范围匹配)\ngeoip:cn(预定义列表匹配)'
  }
  return 'example.com(关键词匹配)\ndomain:example.com(子域名匹配)\ngeosite:netflix(预定义域名列表)'
}

function RouteEditorModal({
  open,
  loading,
  record,
  onCancel,
  onSubmit,
}: {
  open: boolean
  loading: boolean
  record: ServerRoute | null
  onCancel: () => void
  onSubmit: (payload: Record<string, unknown>) => Promise<void>
}) {
  const [route, setRoute] = useState<ServerRoute | null>(null)

  useEffect(() => {
    if (!open) return
    setRoute(
      record ?? {
        id: 0,
        remarks: '',
        match: [],
        action: 'block',
        action_value: '',
      },
    )
  }, [open, record])

  return (
    <Drawer
      className="v2board-editor-drawer"
      title={route?.id ? '编辑路由' : '创建路由'}
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
            disabled={loading || !route}
            onClick={async () => {
              if (!route) return
              const normalizedMatch = Array.isArray(route.match)
                ? route.match.filter(Boolean)
                : String(route.match ?? '')
                    .split(',')
                    .filter(Boolean)

              await onSubmit({
                ...(route.id ? { id: route.id } : {}),
                remarks: route.remarks,
                match: normalizedMatch,
                action: route.action,
                action_value: route.action_value || null,
              })
            }}
          >
            提交
          </button>
        </div>
      }
    >
      {route ? (
        <div className="v2board-editor-form">
          <div className="v2board-editor-section">
            <div className="v2board-editor-section-title">基础信息</div>
            <div className="form-group mb-0">
              <label className="mb-2">备注</label>
              <Input
                placeholder="请输入备注"
                value={route.remarks}
                onChange={(event) => setRoute((current) => (current ? { ...current, remarks: event.target.value } : current))}
              />
            </div>
          </div>

          <div className="v2board-editor-section mb-0">
            <div className="v2board-editor-section-title">规则配置</div>
            {route.action !== 'default_out' ? (
              <div className="form-group">
                <label className="mb-2">匹配值</label>
                <Input.TextArea
                  rows={5}
                  placeholder={getMatchPlaceholder(route.action)}
                  value={Array.isArray(route.match) ? route.match.join('\n') : String(route.match ?? '')}
                  onChange={(event) =>
                    setRoute((current) =>
                      current
                        ? {
                            ...current,
                            match: event.target.value.split('\n'),
                          }
                        : current,
                    )
                  }
                />
              </div>
            ) : null}

            <div className="form-group">
              <label className="mb-2">动作</label>
              <Select
                className="w-100"
                value={route.action}
                options={Object.entries(routeActionText).map(([value, label]) => ({ value, label }))}
                onChange={(value) =>
                  setRoute((current) => (current ? { ...current, action: value } : current))
                }
              />
            </div>

            {route.action === 'dns' ? (
              <div className="form-group">
                <label className="mb-2">DNS 服务器</label>
                <Input
                  placeholder="请输入用于解析的 DNS 服务器地址"
                  value={route.action_value ?? ''}
                  onChange={(event) =>
                    setRoute((current) => (current ? { ...current, action_value: event.target.value } : current))
                  }
                />
              </div>
            ) : null}

            {route.action === 'route' || route.action === 'route_ip' || route.action === 'default_out' ? (
              <div className="form-group mb-0">
                <label className="mb-2">Xray 出站配置</label>
                <Input.TextArea
                  rows={8}
                  placeholder={JSON.stringify(
                    {
                      tag: 'ss_out',
                      sendThrough: '0.0.0.0',
                      protocol: 'shadowsocks',
                      settings: {
                        email: 'love@xray.com',
                        address: '8.8.8.8',
                        port: 5555,
                        method: 'chacha20-ietf-poly1305',
                        password: 'abcdefghijklmnopqrstuvwxyz',
                        level: 0,
                      },
                    },
                    null,
                    4,
                  )}
                  value={route.action_value ?? ''}
                  onChange={(event) =>
                    setRoute((current) => (current ? { ...current, action_value: event.target.value } : current))
                  }
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </Drawer>
  )
}

export function ServerRoutePage() {
  const [loading, setLoading] = useState(true)
  const [routes, setRoutes] = useState<ServerRoute[]>([])
  const [editorOpen, setEditorOpen] = useState(false)
  const [activeRoute, setActiveRoute] = useState<ServerRoute | null>(null)
  const [saving, setSaving] = useState(false)

  const loadRoutes = async () => {
    setLoading(true)
    try {
      setRoutes(await getServerRoutes())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRoutes()
  }, [])

  return (
    <>
      <div className="block border-bottom v2board-server-route-page">
        <div className="bg-white">
          <div className="v2board-table-action v2board-list-toolbar p-3">
            <div className="v2board-list-toolbar-left">
              <button
                type="button"
                className="btn btn-sm btn-alt-primary v2board-toolbar-icon"
                title="添加路由"
                onClick={() => {
                  setActiveRoute(null)
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
                  <th style={{ width: 88 }}>ID</th>
                  <th>备注</th>
                  <th style={{ width: 136 }}>匹配数量</th>
                  <th style={{ width: 132 }}>动作</th>
                  <th className="text-right" style={{ width: 110 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4 v2board-table-loading-row">
                      <div className="spinner-grow text-primary" role="status">
                        <span className="sr-only">Loading...</span>
                      </div>
                    </td>
                  </tr>
                ) : routes.length ? (
                  routes.map((route) => {
                    const matchCount = Array.isArray(route.match)
                      ? route.match.length
                      : String(route.match ?? '')
                          .split(',')
                          .filter(Boolean).length

                    return (
                      <tr key={route.id}>
                        <td>{route.id}</td>
                        <td><span className="v2board-plan-name">{route.remarks}</span></td>
                        <td>{matchCount === 0 ? '无规则时默认' : `匹配 ${matchCount} 条规则`}</td>
                        <td><span className="badge badge-primary v2board-route-action">{routeActionText[route.action] ?? route.action}</span></td>
                        <td className="text-right">
                          <div className="v2board-list-actions">
                            <button
                              type="button"
                              className="v2board-link-button v2board-row-action"
                              onClick={() => {
                                setActiveRoute(route)
                                setEditorOpen(true)
                              }}
                            >
                              编辑
                            </button>
                            <span className="text-muted">|</span>
                            <button
                              type="button"
                              className="v2board-link-button text-danger v2board-row-action"
                              onClick={async () => {
                                Modal.confirm({
                                  title: '警告',
                                  content: '确定删除该路由吗？',
                                  okText: '确定',
                                  cancelText: '取消',
                                  onOk: async () => {
                                    await deleteServerRoute(route.id)
                                    message.success('路由已删除')
                                    await loadRoutes()
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
                    <td colSpan={5} className="text-center text-muted py-4 v2board-list-empty">
                      暂无路由
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <RouteEditorModal
        open={editorOpen}
        loading={saving}
        record={activeRoute}
        onCancel={() => {
          setEditorOpen(false)
          setActiveRoute(null)
        }}
        onSubmit={async (payload) => {
          setSaving(true)
          try {
            await saveServerRoute(payload)
            message.success('路由保存成功')
            setEditorOpen(false)
            setActiveRoute(null)
            await loadRoutes()
          } finally {
            setSaving(false)
          }
        }}
      />
    </>
  )
}
