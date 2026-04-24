import type { AxiosError } from 'axios'
import { Drawer, Input, message } from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import i18n from '@/i18n'
import { getKnowledgeDetail, getKnowledgeList, type Knowledge, type KnowledgeCategory, type KnowledgeDetail } from '@/api/knowledge'

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const looksLikeHtml = (value: string) => /<\/?[a-z][\s\S]*>/i.test(value)

const formatDate = (value: number | null | undefined) => {
  if (!value) return '-'
  const date = new Date(value * 1000)
  const pad2 = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}`
}

const renderMarkdownToHtml = (md: string) => {
  const normalized = String(md ?? '').replace(/\r\n/g, '\n')
  const codeBlocks: string[] = []
  const withoutCode = normalized.replace(/```([^\n]*)\n([\s\S]*?)```/g, (_match, langRaw, codeRaw) => {
    const lang = String(langRaw ?? '').trim()
    const code = String(codeRaw ?? '').replace(/\n$/, '')
    const html = `<pre><code${lang ? ` class="language-${escapeHtml(lang)}"` : ''}>${escapeHtml(code)}</code></pre>`
    const token = `@@CODEBLOCK_${codeBlocks.length}@@`
    codeBlocks.push(html)
    return token
  })

  const inline = (text: string) => {
    let out = escapeHtml(text)
    out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, href) => {
      const safeHref = String(href).replace(/&quot;/g, '"')
      return `<a href="${safeHref}" target="_blank" rel="noreferrer">${label}</a>`
    })
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    out = out.replace(/`([^`]+)`/g, '<code>$1</code>')
    return out
  }

  const lines = withoutCode.split('\n')
  const blocks: string[] = []
  let paragraphLines: string[] = []

  const flushParagraph = () => {
    if (!paragraphLines.length) return
    const joined = paragraphLines.join('\n')
    blocks.push(`<p>${inline(joined).replace(/\n/g, '<br />')}</p>`)
    paragraphLines = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    const codeTokenMatch = trimmed.match(/^@@CODEBLOCK_(\d+)@@$/)
    if (codeTokenMatch) {
      flushParagraph()
      const idx = Number(codeTokenMatch[1])
      blocks.push(codeBlocks[idx] ?? '')
      continue
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      flushParagraph()
      const level = headingMatch[1].length
      blocks.push(`<h${level}>${inline(headingMatch[2])}</h${level}>`)
      continue
    }

    const listMatch = trimmed.match(/^[-*]\s+(.*)$/)
    if (listMatch) {
      flushParagraph()
      const items: string[] = []
      let j = i
      for (; j < lines.length; j++) {
        const t = lines[j].trim()
        const m = t.match(/^[-*]\s+(.*)$/)
        if (!m) break
        items.push(`<li>${inline(m[1])}</li>`)
      }
      blocks.push(`<ul>${items.join('')}</ul>`)
      i = j - 1
      continue
    }

    if (!trimmed) {
      flushParagraph()
      continue
    }

    paragraphLines.push(line)
  }

  flushParagraph()
  return blocks.join('\n')
}

const copyToClipboard = async (text: string) => {
  try {
    if (window.isSecureContext && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // ignore
  }
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', 'true')
    textarea.style.position = 'fixed'
    textarea.style.top = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}

export default function KnowledgePage() {
  const [searchParams] = useSearchParams()
  const [knowledgeData, setKnowledgeData] = useState<KnowledgeCategory>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [keyword, setKeyword] = useState('')
  const debounceRef = useRef<number | null>(null)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeId, setActiveId] = useState<number | null>(null)
  const [detail, setDetail] = useState<KnowledgeDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const loadList = async (kw?: string) => {
    setLoading(true)
    setError(null)
    try {
      const grouped = await getKnowledgeList(i18n.resolvedLanguage || i18n.language, kw)
      setKnowledgeData(grouped || {})
    } catch (e) {
      const axiosError = e as AxiosError<{ message?: string }>
      setError(axiosError.response?.data?.message || axiosError.message || i18n.t('请求失败'))
    } finally {
      setLoading(false)
    }
  }

  const openDetail = async (id: number) => {
    setActiveId(id)
    setDrawerOpen(true)
    setDetailLoading(true)
    try {
      ;(window as any).copy = async (text: string) => {
        const ok = await copyToClipboard(text)
        if (ok) message.success(i18n.t('复制成功'))
      }
      ;(window as any).jump = (nextId: number | string) => {
        const parsed = typeof nextId === 'string' ? Number(nextId) : nextId
        if (!parsed || Number.isNaN(parsed)) return
        void openDetail(parsed)
      }
    } catch {
      // ignore
    }
    try {
      const res = await getKnowledgeDetail(id)
      setDetail(res)
    } catch {
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => {
    void loadList()
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
      ;(window as any).copy = undefined
      ;(window as any).jump = undefined
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const idStr = searchParams.get('id')
    if (!idStr) return
    const id = Number(idStr)
    if (!id || Number.isNaN(id)) return
    void openDetail(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const categories = useMemo(() => Object.keys(knowledgeData || {}), [knowledgeData])

  const bodyHtml = useMemo(() => {
    if (!detail?.body) return ''
    if (looksLikeHtml(detail.body)) return detail.body
    return renderMarkdownToHtml(detail.body)
  }, [detail?.body])

  return (
    <>
      <div className="v2board-knowledge-search-bar">
        <Input.Search
          onChange={(e) => {
            const next = e.target.value
            setKeyword(next)
            if (debounceRef.current) window.clearTimeout(debounceRef.current)
            debounceRef.current = window.setTimeout(() => {
              debounceRef.current = null
              void loadList(next || undefined)
            }, 300)
          }}
          className="mb-3"
          size="large"
          enterButton
          placeholder={i18n.t('搜索文档')}
          value={keyword}
          onSearch={(value) => void loadList(value || undefined)}
        />
      </div>

      {loading ? (
        <div className="spinner-grow text-primary" role="status" aria-label="Loading">
          <span className="sr-only">{i18n.t('加载中...')}</span>
        </div>
      ) : null}
      {!loading && error ? (
        <div className="alert alert-danger" role="alert">
          <p className="mb-0">{error}</p>
        </div>
      ) : null}

      {!loading && !error ? (
        categories.map((cat) => {
          const items: Knowledge[] = knowledgeData[cat] || []
          if (!items.length) return null
          return (
            <div key={cat} className="row mb-3 mb-md-0">
              <div className="col-md-12">
                <div className="block block-rounded">
                  <div className="block-header block-header-default">
                    <h3 className="block-title">{cat}</h3>
                  </div>
                  <div className="list-group">
                    {items.map((item) => (
                      <a
                        key={item.id}
                        className="list-group-item list-group-item-action"
                        style={{
                          borderRadius: 'unset',
                          border: 'unset',
                          borderBottom: '1px solid #e2e8f2',
                        }}
                        href="javascript:void(0);"
                        onClick={(event) => {
                          event.preventDefault()
                          void openDetail(item.id)
                        }}
                      >
                        <h5 className="font-size-base mb-1">{item.title}</h5>
                        <small>{i18n.t('最后更新: {date}', { date: formatDate(item.updated_at) })}</small>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        })
      ) : null}

      <Drawer
        open={drawerOpen}
        width="80%"
        title={detail?.title || i18n.t('加载中...')}
        onClose={() => {
          setDrawerOpen(false)
          setActiveId(null)
          setDetail(null)
          ;(window as any).copy = undefined
          ;(window as any).jump = undefined
        }}
      >
        {detailLoading ? (
          <div className="spinner-grow text-primary" role="status" aria-label="Loading">
            <span className="sr-only">{i18n.t('加载中...')}</span>
          </div>
        ) : detail ? (
          <div className="custom-html-style" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        ) : activeId ? (
          <div className="alert alert-warning" role="alert">
            <p className="mb-0">{i18n.t('文档加载失败')}</p>
          </div>
        ) : null}
      </Drawer>
    </>
  )
}
