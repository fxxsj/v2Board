import { QuestionCircleOutlined } from '@ant-design/icons'
import type { AxiosError } from 'axios'
import { Badge, Table, Tag, Tooltip, message } from 'antd'
import { useEffect, useState } from 'react'
import { getServerNodes, type ServerNode } from '@/api/server'
import type { ColumnsType } from 'antd/es/table'
import { useNavigate } from 'react-router-dom'
import { getUserSubscribe, type UserSubscribe } from '@/api/user'
import i18n from '@/i18n'

export default function ServerPage() {
  const navigate = useNavigate()
  const [servers, setServers] = useState<ServerNode[]>([])
  const [loading, setLoading] = useState(true)
  const [subscribe, setSubscribe] = useState<UserSubscribe | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadServers = async () => {
      setLoading(true)

      try {
        const [sub, serverData] = await Promise.all([
          getUserSubscribe(),
          getServerNodes(),
        ])
        if (!cancelled) {
          setSubscribe(sub)
          setServers(serverData || [])
        }
      } catch (error) {
        const axiosError = error as AxiosError<{ message?: string }>
        message.error(axiosError.response?.data?.message || axiosError.message || i18n.t('请求失败'))
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadServers()

    return () => {
      cancelled = true
    }
  }, [])

  const columns: ColumnsType<ServerNode> = [
    {
      title: i18n.t('名称'),
      dataIndex: 'name',
      key: 'name',
      render: (value: string) => value,
    },
    {
      title: (
        <span>
          <Tooltip placement="top" title={i18n.t('节点五分钟内节点在线情况')}>
            <span>
              {i18n.t('状态')} <QuestionCircleOutlined />
            </span>
          </Tooltip>
        </span>
      ),
      dataIndex: 'is_online',
      key: 'is_online',
      align: 'center',
      render: (value: unknown) => {
        const online = Number(value) === 1
        return <Badge status={online ? 'processing' : 'error'} />
      },
    },
    {
      title: (
        <span>
          <Tooltip placement="top" title={i18n.t('使用的流量将乘以倍率进行扣除')}>
            <span>
              {i18n.t('倍率')} <QuestionCircleOutlined />
            </span>
          </Tooltip>
        </span>
      ),
      dataIndex: 'rate',
      key: 'rate',
      align: 'center',
      render: (value: unknown) => {
        const rate = typeof value === 'number' ? value : Number(value)
        return <Tag style={{ minWidth: 60 }}>{Number.isFinite(rate) && rate ? `${rate.toFixed(2)} x` : '-'}</Tag>
      },
    },
    {
      title: i18n.t('标签'),
      dataIndex: 'tags',
      key: 'tags',
      render: (value: unknown) => {
        const tags = Array.isArray(value) ? (value as string[]) : []
        return tags.length ? tags.map((tag) => <Tag key={tag}>{tag}</Tag>) : '-'
      },
    },
  ]

  return (
    <div id="server">
      <div className="row mb-3 mb-md-0">
        <div className="col-md-12">
          {loading ? (
            <div className="spinner-grow text-primary" role="status" aria-label="Loading">
              <span className="sr-only">{i18n.t('加载中...')}</span>
            </div>
          ) : servers.length > 0 ? (
            <div className="block block-rounded js-appear-enabled">
              <div className="block-content p-0">
                <Table
                  tableLayout="auto"
                  columns={columns}
                  dataSource={servers}
                  rowKey="id"
                  pagination={false}
                  scroll={{ x: 900 }}
                />
              </div>
            </div>
          ) : (
            <div className="alert alert-dark" role="alert">
              <p className="mb-0">
                {i18n.t('没有可用节点，如果您未订阅或已过期请')}{' '}
                <a
                  className="alert-link"
                  href="javascript:void(0);"
                  onClick={(event) => {
                    event.preventDefault()
                    if (subscribe?.plan_id) {
                      navigate(`/plan/${subscribe.plan_id}`)
                      return
                    }
                    navigate('/plan')
                  }}
                >
                  {subscribe?.plan_id ? i18n.t('续费') : i18n.t('订阅')}
                </a>
                。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
