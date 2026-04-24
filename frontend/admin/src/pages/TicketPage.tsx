import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { closeTicket, getTickets, type TicketSummary } from '@/api/admin'

const levelText = ['低', '中', '高']

function formatDate(value: number) {
  const date = new Date(value * 1000)
  const pad = (input: number) => String(input).padStart(2, '0')
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function openTicketWindow(ticketId: number, navigate: ReturnType<typeof useNavigate>) {
  const target = `${window.location.origin}${window.location.pathname}#/ticket/${ticketId}`
  const agent = window.navigator.userAgent.toLowerCase()
  const isMobile = agent.includes('mobile') || agent.includes('ipad')

  if (isMobile) {
    navigate(`/ticket/${ticketId}`)
    return
  }

  window.open(
    target,
    '_blank',
    'height=600,width=800,top=0,left=0,toolbar=no,menubar=no,scrollbars=no,resizable=no,location=no,status=no',
  )
}

export function TicketPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState<TicketSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [status, setStatus] = useState<number | ''>(0)
  const [email, setEmail] = useState('')
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1)
      setEmail(searchInput)
    }, 300)

    return () => window.clearTimeout(timer)
  }, [searchInput])

  const loadTickets = async (params?: { page?: number; status?: number | ''; email?: string }) => {
    setLoading(true)
    try {
      const current = params?.page ?? page
      const currentStatus = params?.status ?? status
      const currentEmail = params?.email ?? email
      const result = await getTickets({
        current,
        pageSize,
        status: currentStatus === '' ? undefined : currentStatus,
        email: currentEmail || undefined,
      })
      setTickets(result.data)
      setTotal(result.total)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTickets({ page: 1, status, email })
  }, [status, email])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [pageSize, total])

  return (
    <div className="block border-bottom v2board-ticket-page">
      <div className="bg-white">
        <div className="v2board-table-action v2board-list-toolbar p-3">
          <div className="v2board-list-toolbar-left">
            <div className="btn-group btn-group-sm v2board-toolbar-segment">
              <button type="button" className={`btn ${status === 0 ? 'btn-primary' : 'btn-alt-primary'}`} onClick={() => { setPage(1); setStatus(0) }}>
                已开启
              </button>
              <button type="button" className={`btn ${status === 1 ? 'btn-primary' : 'btn-alt-primary'}`} onClick={() => { setPage(1); setStatus(1) }}>
                已关闭
              </button>
              <button type="button" className={`btn ${status === '' ? 'btn-primary' : 'btn-alt-primary'}`} onClick={() => { setPage(1); setStatus('') }}>
                全部
              </button>
            </div>
          </div>

          <div className="v2board-list-toolbar-right">
            <div className="v2board-list-search" style={{ width: 260, maxWidth: '100%' }}>
              <input
                className="form-control form-control-sm"
                placeholder="输入邮箱搜索"
                value={searchInput}
                onChange={(event) => {
                  setSearchInput(event.target.value)
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="block-content p-0">
        <div className="table-responsive">
          <table className="table table-striped table-vcenter mb-0">
            <thead>
              <tr>
                <th style={{ width: 72 }}>#</th>
                <th>主题</th>
                <th style={{ width: 110 }}>工单级别</th>
                <th style={{ width: 118 }}>工单状态</th>
                <th style={{ width: 152 }}>创建时间</th>
                <th style={{ width: 152 }}>最后回复</th>
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
              ) : tickets.length ? (
                tickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>{ticket.id}</td>
                    <td>{ticket.subject}</td>
                    <td>{levelText[ticket.level] ?? ticket.level}</td>
                    <td>
                      {ticket.status === 1 ? (
                        <span className="v2board-ticket-status v2board-ticket-status-closed">
                          <span className="v2board-ticket-status-dot" />
                          已关闭
                        </span>
                      ) : (
                        <span className={`v2board-ticket-status ${ticket.reply_status ? 'v2board-ticket-status-replied' : 'v2board-ticket-status-pending'}`}>
                          <span className="v2board-ticket-status-dot" />
                          {ticket.reply_status ? '已回复' : '待回复'}
                        </span>
                      )}
                    </td>
                    <td>{formatDate(ticket.created_at)}</td>
                    <td>{formatDate(ticket.updated_at)}</td>
                    <td className="text-right">
                      <div className="v2board-ticket-actions">
                      <button type="button" className="v2board-link-button v2board-row-action" onClick={() => openTicketWindow(ticket.id, navigate)}>
                        查看
                      </button>
                      <span className="text-muted mx-2">|</span>
                      <button
                        type="button"
                        className="v2board-link-button v2board-row-action"
                        disabled={ticket.status === 1}
                        onClick={async () => {
                          await closeTicket(ticket.id)
                          await loadTickets()
                        }}
                      >
                        关闭
                      </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4 v2board-list-empty">
                    暂无工单
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="d-flex justify-content-between align-items-center px-3 py-3 border-top v2board-list-pagination">
          <div className="v2board-pagination-tools">
            <span className="text-muted">共 {total} 条</span>
          </div>
          <div className="v2board-pagination-tools">
            <button
              type="button"
              className="btn btn-sm btn-alt-secondary mr-2"
              disabled={page <= 1 || loading}
              onClick={async () => {
                const nextPage = page - 1
                setPage(nextPage)
                await loadTickets({ page: nextPage })
              }}
            >
              上一页
            </button>
            <span className="text-muted mr-2">
                {page} / {totalPages}
              </span>
            <button
              type="button"
              className="btn btn-sm btn-alt-secondary"
              disabled={page >= totalPages || loading}
              onClick={async () => {
                const nextPage = page + 1
                setPage(nextPage)
                await loadTickets({ page: nextPage })
              }}
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
