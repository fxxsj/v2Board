import { useEffect, useMemo, useState } from 'react'
import { Drawer, Input, Modal, Select, Switch, Tabs, message } from 'antd'
import {
  deleteAdminKnowledge,
  getAdminKnowledgeById,
  getAdminKnowledgeCategories,
  getAdminKnowledges,
  saveAdminKnowledge,
  sortAdminKnowledge,
  toggleAdminKnowledge,
  type AdminKnowledgeDetail,
  type AdminKnowledgeSummary,
} from '@/api/admin'

const languageOptions = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'en-US', label: 'English' },
  { value: 'ja-JP', label: '日本語' },
  { value: 'vi-VN', label: 'Tiếng Việt' },
  { value: 'ko-KR', label: '한국어' },
]

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderInlineMarkdown(source: string) {
  return escapeHtml(source)
    .replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, '<img alt="$1" src="$2" />')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
}

function renderMarkdown(source: string) {
  const html: string[] = []
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const paragraph: string[] = []
  let listType: 'ul' | 'ol' | null = null
  let listItems: string[] = []
  let codeLines: string[] = []
  let inCode = false

  const flushParagraph = () => {
    if (!paragraph.length) return
    html.push(`<p>${paragraph.map((line) => renderInlineMarkdown(line)).join('<br />')}</p>`)
    paragraph.length = 0
  }

  const flushList = () => {
    if (!listType || !listItems.length) return
    html.push(`<${listType}>${listItems.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join('')}</${listType}>`)
    listType = null
    listItems = []
  }

  const flushCode = () => {
    if (!codeLines.length) return
    html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`)
    codeLines = []
  }

  for (const rawLine of lines) {
    const line = rawLine ?? ''

    if (/^```/.test(line.trim())) {
      flushParagraph()
      flushList()
      if (inCode) {
        flushCode()
        inCode = false
      } else {
        inCode = true
        codeLines = []
      }
      continue
    }

    if (inCode) {
      codeLines.push(line)
      continue
    }

    if (!line.trim()) {
      flushParagraph()
      flushList()
      continue
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      flushParagraph()
      flushList()
      const level = headingMatch[1].length
      html.push(`<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`)
      continue
    }

    const orderedMatch = line.match(/^\d+\.\s+(.*)$/)
    const unorderedMatch = line.match(/^[-*+]\s+(.*)$/)
    if (orderedMatch || unorderedMatch) {
      flushParagraph()
      const nextListType: 'ul' | 'ol' = orderedMatch ? 'ol' : 'ul'
      if (listType && listType !== nextListType) flushList()
      listType = nextListType
      listItems.push((orderedMatch ?? unorderedMatch)?.[1] ?? '')
      continue
    }

    const quoteMatch = line.match(/^>\s?(.*)$/)
    if (quoteMatch) {
      flushParagraph()
      flushList()
      html.push(`<blockquote><p>${renderInlineMarkdown(quoteMatch[1])}</p></blockquote>`)
      continue
    }

    paragraph.push(line.trim())
  }

  flushParagraph()
  flushList()
  if (inCode) flushCode()

  return html.join('') || '<p>暂无内容</p>'
}

function formatDate(value: number) {
  const date = new Date(value * 1000)
  const pad = (input: number) => String(input).padStart(2, '0')
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function createEmptyKnowledgeForm(): Partial<AdminKnowledgeDetail> {
  return {
    language: 'zh-CN',
    category: '',
    title: '',
    body: '',
  }
}

function KnowledgeEditorDrawer({
  open,
  id,
  categories,
  saving,
  onCancel,
  onSubmit,
}: {
  open: boolean
  id: number | null
  categories: string[]
  saving: boolean
  onCancel: () => void
  onSubmit: (payload: Record<string, unknown>) => Promise<void>
}) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<Partial<AdminKnowledgeDetail>>(createEmptyKnowledgeForm())
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write')

  useEffect(() => {
    if (!open) return
    let active = true
    setActiveTab('write')

    async function bootstrap() {
      if (!id) {
        setForm(createEmptyKnowledgeForm())
        return
      }
      setLoading(true)
      try {
        const detail = await getAdminKnowledgeById(id)
        if (active) setForm(detail)
      } finally {
        if (active) setLoading(false)
      }
    }

    bootstrap()

    return () => {
      active = false
    }
  }, [id, open])

  return (
    <Drawer
      className="v2board-knowledge-drawer v2board-editor-drawer"
      title={id ? '编辑知识' : '新增知识'}
      open={open}
      width="80%"
      destroyOnHidden
      onClose={onCancel}
      footer={
        <div className="v2board-drawer-action text-right">
          <button type="button" className="btn btn-alt-secondary mr-2" onClick={onCancel}>
            取消
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={loading || saving}
            onClick={async () => {
              if (!String(form.title ?? '').trim()) {
                message.error('标题不能为空')
                return
              }
              if (!String(form.category ?? '').trim()) {
                message.error('分类不能为空')
                return
              }
              if (!String(form.body ?? '').trim()) {
                message.error('内容不能为空')
                return
              }
              await onSubmit({
                ...(id ? { id } : {}),
                category: String(form.category ?? '').trim(),
                language: form.language,
                title: String(form.title ?? '').trim(),
                body: String(form.body ?? ''),
              })
            }}
          >
            {saving ? '提交中...' : '提交'}
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="v2board-detail-loading">
          <div className="spinner-grow text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
        </div>
      ) : (
        <div className="v2board-editor-form v2board-knowledge-content">
          <div className="v2board-editor-section">
            <div className="v2board-editor-section-title">基础信息</div>
            <div className="row">
              <div className="col-md-8 mb-3">
                <label className="mb-2">标题</label>
                <Input
                  value={String(form.title ?? '')}
                  placeholder="请输入知识标题"
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                />
              </div>
              <div className="col-md-4 mb-3">
                <label className="mb-2">语言</label>
                <Select
                  className="w-100"
                  placeholder="请选择知识语言"
                  value={form.language}
                  options={languageOptions}
                  onChange={(value) => setForm((current) => ({ ...current, language: value }))}
                />
              </div>
              <div className="col-12 mb-0">
                <label className="mb-2">分类</label>
                <Input
                  value={String(form.category ?? '')}
                  placeholder="请输入分类，分类将会自动归集"
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                />
                {categories.length ? <div className="font-size-sm text-muted mt-2">现有分类：{categories.join('、')}</div> : null}
              </div>
            </div>
          </div>
          <div className="v2board-editor-section mb-0">
            <div className="v2board-editor-section-title">内容编辑</div>
            <Tabs
              className="v2board-knowledge-tabs"
              activeKey={activeTab}
              onChange={(value) => setActiveTab(value as 'write' | 'preview')}
              items={[
                {
                  key: 'write',
                  label: '编辑',
                  children: (
                    <Input.TextArea
                      className="v2board-knowledge-editor"
                      rows={24}
                      value={String(form.body ?? '')}
                      placeholder="请输入 Markdown 内容"
                      onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                    />
                  ),
                },
                {
                  key: 'preview',
                  label: '预览',
                  children: (
                    <div
                      className="v2board-markdown-preview"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(String(form.body ?? '')) }}
                    />
                  ),
                },
              ]}
            />
          </div>
        </div>
      )}
    </Drawer>
  )
}

export function KnowledgePage() {
  const [loading, setLoading] = useState(true)
  const [knowledges, setKnowledges] = useState<AdminKnowledgeSummary[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [editorOpen, setEditorOpen] = useState(false)
  const [activeId, setActiveId] = useState<number | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [knowledgeResult, categoryResult] = await Promise.allSettled([
        getAdminKnowledges(),
        getAdminKnowledgeCategories(),
      ])
      if (knowledgeResult.status === 'fulfilled') setKnowledges(knowledgeResult.value)
      if (categoryResult.status === 'fulfilled') setCategories(categoryResult.value)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const orderedKnowledges = useMemo(() => [...knowledges], [knowledges])

  return (
    <>
      <div className="block border-bottom v2board-knowledge-page">
        <div className="bg-white">
          <div className="v2board-table-action v2board-list-toolbar p-3">
            <div className="v2board-list-toolbar-left">
              <button
                type="button"
                className="btn btn-sm btn-alt-primary v2board-toolbar-icon"
                title="添加知识"
                onClick={() => {
                  setActiveId(null)
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
                  <th style={{ width: 92 }}>排序</th>
                  <th style={{ width: 88 }}>文章 ID</th>
                  <th style={{ width: 78 }}>显示</th>
                  <th>标题</th>
                  <th style={{ width: 140 }}>分类</th>
                  <th style={{ width: 152 }}>更新时间</th>
                  <th className="text-right" style={{ width: 110 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-4 v2board-table-loading-row">
                      <div className="spinner-grow text-primary" role="status">
                        <span className="sr-only">Loading...</span>
                      </div>
                    </td>
                  </tr>
                ) : orderedKnowledges.length ? (
                  orderedKnowledges.map((knowledge, index) => (
                    <tr
                      key={knowledge.id}
                      draggable
                      className={dragIndex === index ? 'v2board-drag-row' : ''}
                      onDragStart={() => setDragIndex(index)}
                      onDragOver={(event) => event.preventDefault()}
                      onDragEnd={() => setDragIndex(null)}
                      onDrop={async () => {
                        if (dragIndex === null || dragIndex === index) return
                        const next = [...orderedKnowledges]
                        const [moved] = next.splice(dragIndex, 1)
                        next.splice(index, 0, moved)
                        setKnowledges(next)
                        setDragIndex(null)
                        await sortAdminKnowledge(next.map((item) => item.id))
                        message.success('排序已更新')
                        await loadData()
                      }}
                    >
                      <td>
                        <i className="fa fa-bars text-muted v2board-drag-handle mr-2" />
                      </td>
                      <td>{knowledge.id}</td>
                      <td className="v2board-switch-cell">
                        <Switch
                          size="small"
                          checked={Boolean(knowledge.show)}
                          onChange={async () => {
                            await toggleAdminKnowledge(knowledge.id)
                            await loadData()
                          }}
                        />
                      </td>
                      <td>
                        <div className="v2board-inline-stack">
                          <span className="v2board-plan-name">{knowledge.title}</span>
                          <span className="v2board-plan-meta">{String(languageOptions.find((item) => item.value === knowledge.language)?.label ?? knowledge.language ?? '')}</span>
                        </div>
                      </td>
                      <td><span className="badge badge-primary v2board-status-badge">{knowledge.category}</span></td>
                      <td className="text-right">{formatDate(knowledge.updated_at)}</td>
                      <td className="text-right">
                        <div className="v2board-list-actions">
                          <button
                            type="button"
                            className="v2board-link-button v2board-row-action"
                            onClick={() => {
                              setActiveId(knowledge.id)
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
                                content: '确定删除该知识吗？',
                                okText: '确定',
                                cancelText: '取消',
                                onOk: async () => {
                                  await deleteAdminKnowledge(knowledge.id)
                                  message.success('知识已删除')
                                  await loadData()
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
                    <td colSpan={7} className="text-center text-muted py-4 v2board-list-empty">
                      暂无知识
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <KnowledgeEditorDrawer
        open={editorOpen}
        id={activeId}
        categories={categories}
        saving={saving}
        onCancel={() => {
          setEditorOpen(false)
          setActiveId(null)
        }}
        onSubmit={async (payload) => {
          setSaving(true)
          try {
            await saveAdminKnowledge(payload)
            message.success('知识保存成功')
            setEditorOpen(false)
            setActiveId(null)
            await loadData()
          } finally {
            setSaving(false)
          }
        }}
      />
    </>
  )
}
