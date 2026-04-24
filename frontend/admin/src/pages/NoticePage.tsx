import { useEffect, useState } from 'react'
import { Drawer, Input, Modal, Select, Switch, message } from 'antd'
import {
  deleteAdminNotice,
  getAdminNotices,
  saveAdminNotice,
  toggleAdminNotice,
  type AdminNotice,
} from '@/api/admin'

function formatDate(value: number) {
  const date = new Date(value * 1000)
  const pad = (input: number) => String(input).padStart(2, '0')
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function NoticeEditorModal({
  open,
  loading,
  record,
  onCancel,
  onSubmit,
}: {
  open: boolean
  loading: boolean
  record: AdminNotice | null
  onCancel: () => void
  onSubmit: (payload: Record<string, unknown>) => Promise<void>
}) {
  const [form, setForm] = useState<Record<string, unknown>>({})

  useEffect(() => {
    if (!open) return
    setForm(record ? { ...record, tags: record.tags ?? [] } : { tags: [] })
  }, [open, record])

  return (
    <Drawer
      className="v2board-editor-drawer"
      title={form.id ? '编辑公告' : '新建公告'}
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
                title: form.title,
                content: form.content,
                img_url: form.img_url || null,
                tags: form.tags || [],
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
            <label className="mb-2">标题</label>
            <Input
              value={String(form.title ?? '')}
              placeholder="请输入公告标题"
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
          </div>
          <div className="form-group mb-0">
            <label className="mb-2">标签</label>
            <Select
              mode="tags"
              className="w-100"
              value={(form.tags as string[] | undefined) ?? []}
              placeholder="输入后回车添加标签"
              onChange={(value) => setForm((current) => ({ ...current, tags: value }))}
            />
          </div>
        </div>
        <div className="v2board-editor-section mb-0">
          <div className="v2board-editor-section-title">内容展示</div>
          <div className="form-group">
            <label className="mb-2">内容</label>
            <Input.TextArea
              rows={10}
              value={String(form.content ?? '')}
              placeholder="请输入公告内容"
              onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
            />
          </div>
          <div className="form-group mb-0">
            <label className="mb-2">图片 URL</label>
            <Input
              value={String(form.img_url ?? '')}
              placeholder="https://example.com/banner.png"
              onChange={(event) => setForm((current) => ({ ...current, img_url: event.target.value }))}
            />
          </div>
        </div>
      </div>
    </Drawer>
  )
}

export function NoticePage() {
  const [loading, setLoading] = useState(true)
  const [notices, setNotices] = useState<AdminNotice[]>([])
  const [editorOpen, setEditorOpen] = useState(false)
  const [activeNotice, setActiveNotice] = useState<AdminNotice | null>(null)
  const [saving, setSaving] = useState(false)

  const loadNotices = async () => {
    setLoading(true)
    try {
      setNotices(await getAdminNotices())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotices()
  }, [])

  return (
    <>
      <div className="block border-bottom v2board-notice-page">
        <div className="bg-white">
          <div className="v2board-table-action v2board-list-toolbar p-3">
            <div className="v2board-list-toolbar-left">
              <button
                type="button"
                className="btn btn-sm btn-alt-primary v2board-toolbar-icon"
                title="添加公告"
                onClick={() => {
                  setActiveNotice(null)
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
                  <th style={{ width: 78 }}>显示</th>
                  <th>标题</th>
                  <th style={{ width: 152 }}>创建时间</th>
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
                ) : notices.length ? (
                  notices.map((notice) => (
                    <tr key={notice.id}>
                      <td>{notice.id}</td>
                      <td className="v2board-switch-cell">
                        <Switch
                          size="small"
                          checked={Boolean(notice.show)}
                          onChange={async () => {
                            await toggleAdminNotice(notice.id)
                            await loadNotices()
                          }}
                        />
                      </td>
                      <td><span className="v2board-plan-name">{notice.title}</span></td>
                      <td>{formatDate(notice.created_at)}</td>
                      <td className="text-right">
                        <div className="v2board-list-actions">
                          <button
                            type="button"
                            className="v2board-link-button v2board-row-action"
                            onClick={() => {
                              setActiveNotice(notice)
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
                                content: '确定删除该公告吗？',
                                okText: '确定',
                                cancelText: '取消',
                                onOk: async () => {
                                  await deleteAdminNotice(notice.id)
                                  message.success('公告已删除')
                                  await loadNotices()
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
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-4 v2board-list-empty">
                      暂无公告
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <NoticeEditorModal
        open={editorOpen}
        loading={saving}
        record={activeNotice}
        onCancel={() => {
          setEditorOpen(false)
          setActiveNotice(null)
        }}
        onSubmit={async (payload) => {
          setSaving(true)
          try {
            await saveAdminNotice(payload)
            message.success('公告保存成功')
            setEditorOpen(false)
            setActiveNotice(null)
            await loadNotices()
          } finally {
            setSaving(false)
          }
        }}
      />
    </>
  )
}
