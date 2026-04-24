import type { AxiosError } from 'axios'
import { message } from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getTicketDetail, replyTicket, type Ticket } from '@/api/ticket'
import i18n from '@/i18n'

const formatDateTime = (value: number | null | undefined) => {
  if (!value) return '-'
  const date = new Date(value * 1000)
  const pad2 = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(
    date.getMinutes()
  )}`
}

export default function TicketDetailPage() {
  const params = useParams<{ ticket_id: string }>()
  const ticketId = useMemo(() => Number(params.ticket_id), [params.ticket_id])
  const navigate = useNavigate()

  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [replyLoading, setReplyLoading] = useState(false)
  const [draft, setDraft] = useState('')
  const chatRef = useRef<HTMLDivElement | null>(null)
  const messageCountRef = useRef<number>(0)
  const pollTimerRef = useRef<number | null>(null)

  const stopPolling = () => {
    if (pollTimerRef.current != null) {
      window.clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }

  const scrollToBottom = () => {
    if (!chatRef.current) return
    chatRef.current.scrollTo(0, chatRef.current.scrollHeight)
  }

  const fetchData = async () => {
    if (!ticketId || Number.isNaN(ticketId)) return
    try {
      const detail = await getTicketDetail(ticketId)
      setTicket(detail)
      const nextCount = detail.message?.length ?? 0
      if (messageCountRef.current !== nextCount) {
        messageCountRef.current = nextCount
        requestAnimationFrame(() => scrollToBottom())
      }
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>
      message.error(axiosError.response?.data?.message || i18n.t('加载工单失败'))
      navigate('/ticket', { replace: true })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId])

  useEffect(() => {
    stopPolling()
    if (!ticketId || Number.isNaN(ticketId)) return

    let cancelled = false
    const tick = async () => {
      if (cancelled) return
      await fetchData()
      pollTimerRef.current = window.setTimeout(() => {
        void tick()
      }, 5000)
    }

    pollTimerRef.current = window.setTimeout(() => {
      void tick()
    }, 5000)

    return () => {
      cancelled = true
      stopPolling()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId])

  const handleReply = async () => {
    if (!ticket) return
    const text = draft.trim()
    if (!text) return
    setReplyLoading(true)
    try {
      await replyTicket(ticket.id, text)
      setDraft('')
      await fetchData()
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>
      message.error(axiosError.response?.data?.message || i18n.t('回复失败'))
    } finally {
      setReplyLoading(false)
    }
  }

  return (
    <div>
      <div className="block-content-full bg-gray-lighter p-3">
        <span className="tag___12_9H">{ticket?.subject ?? i18n.t('工单')}</span>
      </div>

      <div
        className="bg-white js-chat-messages block-content block-content-full text-wrap-break-word overflow-y-auto content___DW5w1"
        ref={chatRef}
      >
        {loading ? (
          <div className="spinner-grow text-primary" role="status" aria-label="Loading">
            <span className="sr-only">{i18n.t('加载中...')}</span>
          </div>
        ) : (
          ticket?.message?.map((msg) =>
            msg.is_me ? (
              <div key={msg.id}>
                <div className="font-size-sm text-muted my-2 text-right">{formatDateTime(msg.created_at)}</div>
                <div className="text-right ml-4">
                  <div className="d-inline-block bg-gray-lighter px-3 py-2 mb-2 mw-100 rounded text-left">
                    {msg.message}
                  </div>
                </div>
              </div>
            ) : (
              <div key={msg.id}>
                <div className="font-size-sm text-muted my-2">{formatDateTime(msg.created_at)}</div>
                <div className="mr-4">
                  <div className="d-inline-block bg-success-lighter px-3 py-2 mb-2 mw-100 rounded text-left">
                    {msg.message}
                  </div>
                </div>
              </div>
            ),
          )
        )}
      </div>

      <div className="js-chat-form block-content p-2 bg-body-dark input___1j_ND">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !replyLoading) {
              void handleReply()
            }
          }}
          disabled={ticket?.status === 1}
          type="text"
          className="js-chat-input bg-body-dark border-0 form-control form-control-alt"
          placeholder={i18n.t('输入内容回复工单...')}
        />
      </div>
    </div>
  )
}
