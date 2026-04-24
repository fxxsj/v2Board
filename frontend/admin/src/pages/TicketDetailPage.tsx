import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Modal, Table } from 'antd'
import {
  getAdminStatUser,
  getTicketDetail,
  replyTicket,
  type AdminStatUserRecord,
  type TicketDetail,
} from '@/api/admin'

function formatDate(value: number) {
  const date = new Date(value * 1000)
  const pad = (input: number) => String(input).padStart(2, '0')
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatTraffic(value: number) {
  const gb = value / 1024 / 1024 / 1024
  if (gb >= 1024) {
    return `${(gb / 1024).toFixed(2)} TB`
  }
  return `${gb.toFixed(2)} GB`
}

export function TicketDetailPage() {
  const navigate = useNavigate()
  const params = useParams()
  const ticketId = Number(params.ticket_id)
  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [replyLoading, setReplyLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [trafficOpen, setTrafficOpen] = useState(false)
  const [trafficLoading, setTrafficLoading] = useState(false)
  const [trafficPage, setTrafficPage] = useState(1)
  const [trafficTotal, setTrafficTotal] = useState(0)
  const [trafficRecords, setTrafficRecords] = useState<AdminStatUserRecord[]>([])
  const chatRef = useRef<HTMLDivElement | null>(null)

  const loadDetail = async () => {
    if (!ticketId) return
    setLoading(true)
    try {
      const result = await getTicketDetail(ticketId)
      setTicket(result)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDetail()
    const timer = window.setInterval(loadDetail, 5000)
    return () => window.clearInterval(timer)
  }, [ticketId])

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTo(0, chatRef.current.scrollHeight)
    }
  }, [ticket?.message?.length])

  const messages = useMemo(() => ticket?.message ?? [], [ticket?.message])
  const ticketClosed = Number(ticket?.status ?? 0) === 1

  useEffect(() => {
    if (!trafficOpen || !ticket?.user_id) return
    let active = true
    const userId = ticket.user_id

    async function loadTraffic() {
      setTrafficLoading(true)
      try {
        const result = await getAdminStatUser({
          user_id: userId,
          current: trafficPage,
          pageSize: 10,
        })
        if (!active) return
        setTrafficRecords(result.data)
        setTrafficTotal(result.total)
      } finally {
        if (active) {
          setTrafficLoading(false)
        }
      }
    }

    loadTraffic()

    return () => {
      active = false
    }
  }, [ticket?.user_id, trafficOpen, trafficPage])

  const jumpUserManage = () => {
    if (!ticket?.user_id) return
    const params = new URLSearchParams()
    params.set('filter_key_0', 'id')
    params.set('filter_condition_0', '=')
    params.set('filter_value_0', String(ticket.user_id))
    navigate(`/user?${params.toString()}`)
  }

  const submitReply = async () => {
    if (replyLoading || !message.trim() || !ticketId || ticketClosed) return
    setReplyLoading(true)
    try {
      await replyTicket(ticketId, message.trim())
      setMessage('')
      await loadDetail()
    } finally {
      setReplyLoading(false)
    }
  }

  return (
    <div className="block border-bottom v2board-ticket-detail">
      <div className="block-content-full bg-gray-lighter p-3 d-flex justify-content-between align-items-center flex-wrap v2board-ticket-detail-header">
        <div className="d-flex align-items-center flex-wrap">
          <span className="badge badge-primary mr-2">{ticket?.subject ?? '工单详情'}</span>
          {ticket?.status !== undefined ? (
            <span className={`badge mr-2 ${ticketClosed ? 'badge-success' : 'badge-danger'}`}>
              {ticketClosed ? '已关闭' : '待回复'}
            </span>
          ) : null}
        </div>
        <div className="v2board-ticket-detail-actions mt-2 mt-sm-0">
          {ticket?.user_id ? (
            <>
              <button type="button" className="v2board-link-button v2board-ticket-detail-action" title="用户管理" onClick={jumpUserManage}>
                <i className="fa fa-user" />
                <span>用户管理</span>
              </button>
              <button
                type="button"
                className="v2board-link-button v2board-ticket-detail-action"
                title="TA 的流量记录"
                onClick={() => {
                  setTrafficPage(1)
                  setTrafficOpen(true)
                }}
              >
                <i className="fa fa-area-chart" />
                <span>流量记录</span>
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div
        ref={chatRef}
        className="bg-white js-chat-messages block-content block-content-full text-wrap-break-word overflow-y-auto v2board-ticket-detail-messages"
        style={{ maxHeight: 520 }}
      >
        {loading ? (
          <div className="v2board-detail-loading">
            <div className="spinner-grow text-primary" role="status">
              <span className="sr-only">Loading...</span>
            </div>
          </div>
        ) : (
          messages.map((item) =>
            item.is_me ? (
              <div key={item.id} className="v2board-ticket-message v2board-ticket-message-admin">
                <div className="font-size-sm text-muted my-2 text-right">{formatDate(item.created_at)}</div>
                <div className="text-right ml-4">
                  <div className="d-inline-block px-3 py-2 mb-2 mw-100 rounded text-left v2board-ticket-bubble">
                    {item.message}
                  </div>
                </div>
              </div>
            ) : (
              <div key={item.id} className="v2board-ticket-message v2board-ticket-message-user">
                <div className="font-size-sm text-muted my-2">{formatDate(item.created_at)}</div>
                <div className="mr-4">
                  <div className="d-inline-block px-3 py-2 mb-2 mw-100 rounded text-left v2board-ticket-bubble">
                    {item.message}
                  </div>
                </div>
              </div>
            ),
          )
        )}
      </div>

      <div className="js-chat-form block-content p-2 bg-body-dark v2board-ticket-detail-form">
        <input
          type="text"
          disabled={ticketClosed || replyLoading}
          className="js-chat-input bg-body-dark border-0 form-control form-control-alt"
          placeholder={ticketClosed ? '工单已关闭' : '输入内容回复工单...'}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={async (event) => {
            if (event.key !== 'Enter') return
            await submitReply()
          }}
        />
      </div>

      <Modal
        className="v2board-detail-modal"
        title="流量记录"
        open={trafficOpen}
        footer={null}
        width="100%"
        style={{ maxWidth: 1000, padding: '0 10px', top: 20 }}
        styles={{ body: { padding: 0 } }}
        onCancel={() => setTrafficOpen(false)}
      >
        {trafficLoading ? (
          <div className="v2board-detail-loading">
            <div className="spinner-grow text-primary" role="status">
              <span className="sr-only">Loading...</span>
            </div>
          </div>
        ) : (
          <Table<AdminStatUserRecord>
            className="v2board-data-modal-table"
            size="small"
            rowKey="id"
            dataSource={trafficRecords}
            locale={{ emptyText: '暂无流量记录' }}
            pagination={{
              current: trafficPage,
              pageSize: 10,
              total: trafficTotal,
              size: 'small',
            }}
            onChange={(pagination) => {
              setTrafficPage(pagination.current ?? 1)
            }}
            columns={[
              {
                title: '日期',
                dataIndex: 'record_at',
                key: 'record_at',
                render: (value: number) => new Date(value * 1000).toLocaleDateString('zh-CN'),
              },
              {
                title: '上行',
                dataIndex: 'u',
                key: 'u',
                align: 'right',
                render: (value: number) => formatTraffic(value),
              },
              {
                title: '下行',
                dataIndex: 'd',
                key: 'd',
                align: 'right',
                render: (value: number) => formatTraffic(value),
              },
              {
                title: '倍率',
                dataIndex: 'server_rate',
                key: 'server_rate',
                align: 'right',
              },
            ]}
          />
        )}
      </Modal>
    </div>
  )
}
