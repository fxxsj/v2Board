import { useEffect, useMemo, useState } from 'react'
import { getQueueStats, getQueueWorkload, type QueueStats } from '@/api/admin'

type QueueWorkloadItem = {
  name?: string
  processes?: number
  length?: number
  wait?: number | string | null
}

const queueNameMap: Record<string, string> = {
  order_handle: '订单队列',
  send_email: '邮件队列',
  send_email_mass: '邮件群发队列',
  send_telegram: 'Telegram 消息队列',
  stat: '统计队列',
  traffic_fetch: '流量消费队列',
}

function formatWait(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  const next = Number(value)
  if (Number.isNaN(next)) return String(value)
  return `${next.toFixed(0)} s`
}

export function QueuePage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<QueueStats | null>(null)
  const [workload, setWorkload] = useState<QueueWorkloadItem[]>([])

  useEffect(() => {
    let active = true
    let timer: number | undefined

    const loadData = async () => {
      const [statsResult, workloadResult] = await Promise.allSettled([getQueueStats(), getQueueWorkload()])

      if (!active) return

      setStats(statsResult.status === 'fulfilled' ? statsResult.value : null)
      setWorkload(workloadResult.status === 'fulfilled' ? (workloadResult.value as QueueWorkloadItem[]) : [])
      setLoading(false)
      timer = window.setTimeout(loadData, 3000)
    }

    loadData()

    return () => {
      active = false
      if (timer) window.clearTimeout(timer)
    }
  }, [])

  const rows = useMemo(
    () =>
      workload.map((item) => ({
        ...item,
        displayName: queueNameMap[String(item.name ?? '')] ?? String(item.name ?? '-'),
      })),
    [workload],
  )

  return (
    <div className="v2board-queue-page">
      <div className="block border-bottom v2board-queue-overview">
        <div className="block-header block-header-default">
          <h3 className="block-title">总览</h3>
        </div>
        <div className="block-content p-0">
          {loading ? (
            <div className="content content-full v2board-page-loading">
              <div className="spinner-grow text-primary" role="status">
                <span className="sr-only">Loading...</span>
              </div>
            </div>
          ) : (
            <div className="row no-gutters">
              <div className="col-lg-6 col-xl-3 border-right p-4 border-bottom v2board-queue-stat">
                <div>
                  <div className="v2board-queue-stat-label">当前作业量</div>
                  <div className="mt-4 font-size-h3 v2board-queue-stat-value">{stats?.jobsPerMinute ?? 0}</div>
                </div>
              </div>
              <div className="col-lg-6 col-xl-3 border-right p-4 border-bottom v2board-queue-stat">
                <div>
                  <div className="v2board-queue-stat-label">近一小时处理量</div>
                  <div className="mt-4 font-size-h3 v2board-queue-stat-value">{stats?.recentJobs ?? 0}</div>
                </div>
              </div>
              <div className="col-lg-6 col-xl-3 border-right p-4 border-bottom v2board-queue-stat">
                <div>
                  <div className="v2board-queue-stat-label">7日内报错数量</div>
                  <div className="mt-4 font-size-h3 v2board-queue-stat-value">{stats?.failedJobs ?? 0}</div>
                </div>
              </div>
              <div className="col-lg-6 col-xl-3 p-4 border-bottom overflow-hidden position-relative v2board-queue-stat">
                <div>
                  <div className="v2board-queue-stat-label">状态</div>
                  <div className="mt-4 font-size-h3 v2board-queue-stat-value">{stats?.status ? '运行中' : '未启动'}</div>
                  {stats ? (
                    <i
                      className={`${stats.status ? 'si si-check text-success' : 'si si-close text-danger'} v2board-queue-status-icon`}
                      style={{ position: 'absolute', fontSize: 100, right: -20, bottom: -20 }}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="block border-bottom v2board-queue-detail">
        <div className="block-header block-header-default">
          <h3 className="block-title">当前作业详情</h3>
        </div>
        <div className="block-content p-0">
          {loading ? (
            <div className="content content-full v2board-page-loading">
              <div className="spinner-grow text-primary" role="status">
                <span className="sr-only">Loading...</span>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped table-vcenter mb-0">
                <thead>
                  <tr>
                    <th>队列名称</th>
                    <th style={{ width: 96 }}>作业量</th>
                    <th style={{ width: 96 }}>任务量</th>
                    <th style={{ width: 112 }}>占用时间</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? (
                    rows.map((item, index) => (
                      <tr key={`${String(item.name ?? index)}-${index}`}>
                        <td><span className="v2board-queue-name">{item.displayName}</span></td>
                        <td>{Number(item.processes ?? 0)}</td>
                        <td>{Number(item.length ?? 0)}</td>
                        <td>{formatWait(item.wait)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="text-center text-muted py-4 v2board-list-empty">
                        暂无负载数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
