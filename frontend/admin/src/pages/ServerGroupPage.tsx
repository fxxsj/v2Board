import { useEffect, useState } from 'react'
import { Drawer, Input, Modal, message } from 'antd'
import {
  deleteServerGroup,
  getServerGroups,
  saveServerGroup,
  type ServerGroup,
} from '@/api/admin'

function GroupEditorModal({
  open,
  loading,
  record,
  onCancel,
  onSubmit,
}: {
  open: boolean
  loading: boolean
  record: ServerGroup | null
  onCancel: () => void
  onSubmit: (payload: Record<string, unknown>) => Promise<void>
}) {
  const [name, setName] = useState('')

  useEffect(() => {
    if (!open) return
    setName(record?.name ? String(record.name) : '')
  }, [open, record])

  return (
    <Drawer
      className="v2board-editor-drawer"
      title={record?.id ? '编辑权限组' : '添加权限组'}
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
              if (!name.trim()) {
                message.error('组名不能为空')
                return
              }
              await onSubmit({
                ...(record?.id ? { id: record.id } : {}),
                name: name.trim(),
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
          <div className="v2board-editor-section-title">基础信息</div>
          <div className="form-group mb-0">
            <label className="mb-2">组名称</label>
            <Input value={name} placeholder="请输入组名称" onChange={(event) => setName(event.target.value)} />
          </div>
        </div>
      </div>
    </Drawer>
  )
}

export function ServerGroupPage() {
  const [loading, setLoading] = useState(true)
  const [groups, setGroups] = useState<ServerGroup[]>([])
  const [editorOpen, setEditorOpen] = useState(false)
  const [activeGroup, setActiveGroup] = useState<ServerGroup | null>(null)
  const [saving, setSaving] = useState(false)

  const loadGroups = async () => {
    setLoading(true)
    try {
      setGroups(await getServerGroups())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGroups()
  }, [])

  return (
    <>
      <div className="block border-bottom v2board-server-group-page">
        <div className="bg-white">
          <div className="v2board-table-action v2board-list-toolbar p-3">
            <div className="v2board-list-toolbar-left">
              <button
                type="button"
                className="btn btn-sm btn-alt-primary v2board-toolbar-icon"
                title="添加权限组"
                onClick={() => {
                  setActiveGroup(null)
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
                  <th style={{ width: 92 }}>组 ID</th>
                  <th>组名称</th>
                  <th style={{ width: 112 }}>用户数量</th>
                  <th style={{ width: 112 }}>节点数量</th>
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
                ) : groups.length ? (
                  groups.map((group) => (
                    <tr key={group.id}>
                      <td>{group.id}</td>
                      <td><span className="v2board-plan-name">{group.name}</span></td>
                      <td>
                        <i className="fa fa-user mr-1 text-muted" />
                        {group.user_count ?? 0}
                      </td>
                      <td>
                        <i className="fa fa-database mr-1 text-muted" />
                        {group.server_count ?? 0}
                      </td>
                      <td className="text-right">
                        <div className="v2board-list-actions">
                          <button
                            type="button"
                            className="v2board-link-button v2board-row-action"
                            onClick={() => {
                              setActiveGroup(group)
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
                                content: '确定删除该权限组吗？',
                                okText: '确定',
                                cancelText: '取消',
                                onOk: async () => {
                                  await deleteServerGroup(group.id)
                                  message.success('权限组已删除')
                                  await loadGroups()
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
                      暂无权限组
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <GroupEditorModal
        open={editorOpen}
        loading={saving}
        record={activeGroup}
        onCancel={() => {
          setEditorOpen(false)
          setActiveGroup(null)
        }}
        onSubmit={async (payload) => {
          setSaving(true)
          try {
            await saveServerGroup(payload)
            message.success('权限组保存成功')
            setEditorOpen(false)
            setActiveGroup(null)
            await loadGroups()
          } finally {
            setSaving(false)
          }
        }}
      />
    </>
  )
}
