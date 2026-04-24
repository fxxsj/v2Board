import { LoadingOutlined } from '@ant-design/icons'
import type { AxiosError } from 'axios'
import { Badge, Divider, Input, Modal, Select, Table, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useState } from 'react'
import { closeTicket, createTicket, fetchTickets, type Ticket } from '@/api/ticket'
import i18n from '@/i18n'
import { buildHashUrl } from '@/utils/url'

const LEVEL_TEXT = ['低', '中', '高'] as const

const formatDateTime = (value: number | null | undefined) => {
  if (!value) return '-'
  const date = new Date(value * 1000)
  const pad2 = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(
    date.getMinutes()
  )}`
}

function getLevelText(level: number) {
  if (level >= 0 && level <= 2) return i18n.t(LEVEL_TEXT[level])
  if (level >= 1 && level <= 3) return i18n.t(LEVEL_TEXT[level - 1])
  return String(level)
}

export default function TicketPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [newTicketVisible, setNewTicketVisible] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [newLevel, setNewLevel] = useState<number>(0)
  const [newMessage, setNewMessage] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const data = await fetchTickets()
      setTickets(data)
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>
      message.error(axiosError.response?.data?.message || axiosError.message || i18n.t('请求失败'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const toChat = (id: number) => {
    const url = buildHashUrl(`/ticket/${id}`)
    const ua = window.navigator.userAgent.toLowerCase()
    const isMobile = ua.includes('mobile') || ua.includes('ipad')
    if (isMobile) {
      window.location.href = url
      return
    }
    window.open(
      url,
      'newwindow',
      'height=600,width=800,top=0,left=0,toolbar=no,menubar=no,scrollbars=no,resizable=no,location=no,status=no'
    )
  }

  const columns: ColumnsType<Ticket> = [
    {
      title: '#',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: i18n.t('主题'),
      dataIndex: 'subject',
      key: 'subject',
      render: (value: string) => value,
    },
    {
      title: i18n.t('工单级别'),
      dataIndex: 'level',
      key: 'level',
      render: (level: number) => getLevelText(level),
    },
    {
      title: i18n.t('工单状态'),
      dataIndex: 'reply_status',
      key: 'reply_status',
      render: (replyStatus: number | undefined, record: Ticket) => {
        if (record.status === 1) {
          return (
            <span>
              <Badge status="success" />{i18n.t('已关闭')}
            </span>
          )
        }
        const replied = Boolean(parseInt(String(replyStatus ?? 0), 10))
        return replied ? (
          <span>
            <Badge status="processing" />{i18n.t('已答复')}
          </span>
        ) : (
          <span>
            <Badge status="error" />{i18n.t('待处理')}
          </span>
        )
      },
    },
    {
      title: i18n.t('创建时间'),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (value: number) => formatDateTime(value),
    },
    {
      title: i18n.t('最后回复'),
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (value: number) => formatDateTime(value),
    },
    {
      title: i18n.t('操作'),
      dataIndex: 'action',
      key: 'action',
      align: 'right',
      fixed: 'right',
      render: (_: unknown, record: Ticket) => (
        <div>
          <a
            href="javascript:void(0);"
            onClick={(event) => {
              event.preventDefault()
              toChat(record.id)
            }}
          >
            {i18n.t('查看')}
          </a>
          <Divider type="vertical" />
          <a
            href="javascript:void(0);"
            onClick={async (event) => {
              event.preventDefault()
              if (record.status) return
              try {
                await closeTicket(record.id)
                message.success(i18n.t('已关闭'))
                await load()
              } catch (err) {
                const axiosError = err as AxiosError<{ message?: string }>
                message.error(axiosError.response?.data?.message || i18n.t('请求失败'))
              }
            }}
          >
            {i18n.t('关闭')}
          </a>
        </div>
      ),
    },
  ]

  return (
    <>
      <div className={`block block-rounded js-appear-enabled ${loading ? 'block-mode-loading' : ''}`}>
        <div className="block-header block-header-default">
          <h3 className="block-title">{i18n.t('工单历史')}</h3>
          <div className="block-options">
            <button
              type="button"
              className="btn btn-primary btn-sm btn-primary btn-rounded px-3"
              onClick={() => {
                setNewTicketVisible(true)
                setNewSubject('')
                setNewLevel(0)
                setNewMessage('')
              }}
            >
              {saveLoading ? <LoadingOutlined /> : i18n.t('新的工单')}
            </button>
          </div>
        </div>
        <div className="block-content p-0">
          <Table
            tableLayout="auto"
            dataSource={tickets}
            columns={columns}
            rowKey="id"
            pagination={false}
            scroll={{ x: 900 }}
          />
        </div>
      </div>

      <Modal
        title={i18n.t('新的工单')}
        open={newTicketVisible}
        maskClosable
        onCancel={() => {
          setNewTicketVisible(false)
          setNewSubject('')
          setNewLevel(0)
          setNewMessage('')
        }}
        okText={saveLoading ? <LoadingOutlined /> : i18n.t('确认')}
        cancelText={i18n.t('取消')}
        onOk={async () => {
          if (saveLoading) {
            return
          }

          setSaveLoading(true)
          try {
            await createTicket(newSubject, newMessage, newLevel)
            message.success(i18n.t('已提交'))
            setNewTicketVisible(false)
            setNewSubject('')
            setNewLevel(0)
            setNewMessage('')
            await load()
          } catch (err) {
            const axiosError = err as AxiosError<{ message?: string }>
            message.error(axiosError.response?.data?.message || i18n.t('请求失败'))
          } finally {
            setSaveLoading(false)
          }
        }}
      >
        <div>
          <div className="form-group">
            <label htmlFor="ticket-subject">{i18n.t('主题')}</label>
            <Input
              id="ticket-subject"
              placeholder={i18n.t('请输入工单主题')}
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="ticket-level">{i18n.t('工单等级')}</label>
            <Select
              id="ticket-level"
              placeholder={i18n.t('请选择工单等级')}
              style={{ width: '100%' }}
              value={newLevel}
              onChange={(value) => setNewLevel(value)}
              options={[
                { value: 0, label: i18n.t(LEVEL_TEXT[0]) },
                { value: 1, label: i18n.t(LEVEL_TEXT[1]) },
                { value: 2, label: i18n.t(LEVEL_TEXT[2]) },
              ]}
            />
          </div>

          <div className="form-group">
            <label htmlFor="ticket-message">{i18n.t('消息')}</label>
            <Input.TextArea
              id="ticket-message"
              rows={5}
              placeholder={i18n.t('请描述你遇到的问题')}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </>
  )
}
