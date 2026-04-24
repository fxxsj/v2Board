import type { AxiosError } from 'axios'
import { Table, Tag, Tooltip, message } from 'antd'
import { useEffect, useRef, useState } from 'react'
import type { ColumnsType } from 'antd/es/table'
import { getTrafficLog, type TrafficLogRecord } from '@/api/stat'
import i18n from '@/i18n'

const formatBytes = (value: number | null | undefined) => {
  if (value == null) return '-'
  const kb = 1024
  const mb = 1024 * 1024
  const gb = 1024 * 1024 * 1024
  if (value >= gb) return `${(value / gb).toFixed(2)} GB`
  if (value >= mb) return `${(value / mb).toFixed(2)} MB`
  if (value >= kb) return `${(value / kb).toFixed(2)} KB`
  return `${value.toFixed(2)} B`
}

const formatRecordDate = (value: number | null | undefined) => {
  if (!value) return '-'
  const date = new Date(value * 1000)
  const pad2 = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}`
}

export default function TrafficPage() {
  const [data, setData] = useState<TrafficLogRecord[]>([])
  const [loading, setLoading] = useState(true)
  const isMountedRef = useRef(true)

  const loadTraffic = async () => {
    if (!isMountedRef.current) return
    setLoading(true)

    try {
      const records = await getTrafficLog()
      if (!isMountedRef.current) return
      setData(records ?? [])
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>
      message.error(axiosError.response?.data?.message || axiosError.message || i18n.t('请求失败'))
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    isMountedRef.current = true
    void loadTraffic()
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const columns: ColumnsType<TrafficLogRecord> = [
    {
      title: i18n.t('记录时间'),
      dataIndex: 'record_at',
      key: 'record_at',
      render: (value: number | null | undefined) => formatRecordDate(value),
    },
    {
      title: i18n.t('实际上行'),
      dataIndex: 'u',
      key: 'u',
      align: 'right',
      render: (value: number, record) => (record.server_rate ? formatBytes(parseInt(String(value), 10)) : 0),
    },
    {
      title: i18n.t('实际下行'),
      dataIndex: 'd',
      key: 'd',
      align: 'right',
      render: (value: number, record) => (record.server_rate ? formatBytes(parseInt(String(value), 10)) : 0),
    },
    {
      title: i18n.t('扣费倍率'),
      dataIndex: 'server_rate',
      key: 'server_rate',
      align: 'center',
      render: (value: number) => (
        <Tag style={{ minWidth: 60 }}>
          {value ? `${Number(value).toFixed(2)} x` : '-'}
        </Tag>
      ),
    },
    {
      title: (
        <Tooltip placement="topRight" title={i18n.t('公式：(实际上行 + 实际下行) x 扣费倍率 = 扣除流量')}>
          <span>
            {i18n.t('合计')} <i className="far fa-question-circle" />
          </span>
        </Tooltip>
      ),
      key: 'total',
      align: 'right',
      fixed: 'right',
      render: (_: unknown, record) => {
        const rate = record.server_rate ? Number(record.server_rate) : 0
        const total = (parseInt(String(record.u ?? 0), 10) + parseInt(String(record.d ?? 0), 10)) * rate
        return formatBytes(total)
      },
    },
  ]

  return (
    <>
      <div className={`block block-rounded ${loading ? 'block-mode-loading' : ''}`}>
        <div className="bg-white">
          <div className="row p-3">
            <div className="col-lg-12">
              <div className="alert alert-info mb-0" role="alert">
                <p className="mb-0">{i18n.t('流量明细仅保留近月数据以供查询。')}</p>
              </div>
            </div>
          </div>

          <Table
            tableLayout="auto"
            style={{ borderTop: '1px solid #e8e8e8' }}
            columns={columns}
            dataSource={data}
            rowKey={(row, idx) => `${row.record_at ?? 0}-${idx}`}
            pagination={false}
            scroll={{ x: 800 }}
          />
        </div>
      </div>
    </>
  )
}
