import { LoadingOutlined, PayCircleOutlined, QuestionCircleOutlined, TransactionOutlined } from '@ant-design/icons'
import type { AxiosError } from 'axios'
import { Modal, Select, Table, Tooltip, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createInviteCode,
  getCommissionLogs,
  getInviteData,
  transferCommission,
  withdrawCommission,
  type CommissionLog,
  type InviteCode,
  type InviteData,
} from '@/api/invite'
import { getUserConfig, getUserInfo, type UserConfig, type UserInfo } from '@/api/user'
import i18n from '@/i18n'
import { buildHashUrl } from '@/utils/url'

const formatDateTime = (value: number | null | undefined) => {
  if (!value) return '-'
  const date = new Date(value * 1000)
  const pad2 = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

const buildRegisterLink = (code: string) => {
  if (typeof window === 'undefined') return ''
  return buildHashUrl(`/register?code=${encodeURIComponent(code)}`)
}

const getAppTitle = () => {
  if (typeof window === 'undefined') return 'V2Board'
  const legacyTitle = (window as any)?.settings?.title
  if (legacyTitle && typeof legacyTitle === 'string') return legacyTitle
  const appName = (window as any)?.__APP_CONFIG__?.appName
  if (appName && typeof appName === 'string') return appName
  return 'V2Board'
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

export default function InvitePage() {
  const navigate = useNavigate()
  const [inviteData, setInviteData] = useState<InviteData | null>(null)
  const [config, setConfig] = useState<UserConfig | null>(null)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [logsLoading, setLogsLoading] = useState(false)
  const [commissionLogs, setCommissionLogs] = useState<CommissionLog[]>([])
  const [logsPagination, setLogsPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [transferVisible, setTransferVisible] = useState(false)
  const [transferAmount, setTransferAmount] = useState('')
  const [transferLoading, setTransferLoading] = useState(false)
  const [withdrawVisible, setWithdrawVisible] = useState(false)
  const [withdrawMethod, setWithdrawMethod] = useState('')
  const [withdrawAccount, setWithdrawAccount] = useState('')
  const [withdrawLoading, setWithdrawLoading] = useState(false)

  const loadAll = async () => {
    const [data, cfg, info] = await Promise.all([getInviteData(), getUserConfig(), getUserInfo()])
    setInviteData(data)
    setConfig(cfg)
    setUserInfo(info)
  }

  const loadLogs = async (current: number, pageSize: number) => {
    setLogsLoading(true)
    try {
      const result = await getCommissionLogs({ current, page_size: pageSize })
      setCommissionLogs(result.data || [])
      setLogsPagination({ current, pageSize, total: result.total || 0 })
    } catch {
      setCommissionLogs([])
      setLogsPagination({ current, pageSize, total: 0 })
    } finally {
      setLogsLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      setLoading(true)
      setError(null)
      try {
        await loadAll()
        if (cancelled) return
        await loadLogs(1, 10)
      } catch (e) {
        const axiosError = e as AxiosError<{ message?: string }>
        if (!cancelled) {
          setError(axiosError.response?.data?.message || axiosError.message || i18n.t('加载失败'))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void init()
    return () => {
      cancelled = true
    }
  }, [])

  const currency = config?.currency ?? ''
  const currencySymbol = config?.currency_symbol ?? ''
  const stat = inviteData?.stat ?? []
  const invitedCount = typeof stat[0] === 'number' ? stat[0] : null
  const totalCommission = typeof stat[1] === 'number' ? stat[1] : null
  const pendingCommission = typeof stat[2] === 'number' ? stat[2] : null
  const commissionRate = typeof stat[3] === 'number' ? stat[3] : null

  const distributionText = useMemo(() => {
    if (!config?.commission_distribution_enable || commissionRate == null) return null
    const l1 = config.commission_distribution_l1
    const l2 = config.commission_distribution_l2
    const l3 = config.commission_distribution_l3
    if (l1 == null || l2 == null || l3 == null) return null
    const factor = commissionRate / 100
    return `${l1 * factor}%,${l2 * factor}%,${l3 * factor}%`
  }, [
    commissionRate,
    config?.commission_distribution_enable,
    config?.commission_distribution_l1,
    config?.commission_distribution_l2,
    config?.commission_distribution_l3,
  ])

  const handleCreate = async () => {
    if (creating) return
    setCreating(true)
    try {
      await createInviteCode()
      message.success(i18n.t('邀请码已生成'))
      await loadAll()
    } catch (e) {
      const axiosError = e as AxiosError<{ message?: string }>
      message.error(axiosError.response?.data?.message || i18n.t('生成失败'))
    } finally {
      setCreating(false)
    }
  }

  const handleTransfer = async () => {
    if (transferLoading) return
    setTransferLoading(true)
    try {
      const amount = Number(transferAmount)
      const transferAmountCents = Number.isFinite(amount) ? Math.round(amount * 100) : 0
      await transferCommission(transferAmountCents)
      setTransferVisible(false)
      setTransferAmount('')
      await loadAll()
    } catch (e) {
      const axiosError = e as AxiosError<{ message?: string }>
      message.error(axiosError.response?.data?.message || axiosError.message || i18n.t('请求失败'))
    } finally {
      setTransferLoading(false)
    }
  }

  const handleWithdraw = async () => {
    if (withdrawLoading) return
    setWithdrawLoading(true)
    try {
      await withdrawCommission({
        withdraw_method: withdrawMethod,
        withdraw_account: withdrawAccount,
      })
      setWithdrawVisible(false)
      setWithdrawMethod('')
      setWithdrawAccount('')
      navigate('/ticket')
    } catch (e) {
      const axiosError = e as AxiosError<{ message?: string }>
      message.error(axiosError.response?.data?.message || axiosError.message || i18n.t('请求失败'))
    } finally {
      setWithdrawLoading(false)
    }
  }

  const codes: InviteCode[] = inviteData?.codes || []

  const codeColumns = [
    {
      title: i18n.t('邀请码'),
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => (
        <>
          <span>{code}</span>
          <a
            style={{ marginLeft: 5 }}
            href="javascript:void(0);"
            onClick={async (event) => {
              event.preventDefault()
              const ok = await copyToClipboard(buildRegisterLink(code))
              if (ok) message.success(i18n.t('复制成功'))
              else message.error(i18n.t('复制失败'))
            }}
          >
            {i18n.t('复制链接')}
          </a>
        </>
      ),
    },
    {
      title: i18n.t('创建时间'),
      dataIndex: 'created_at',
      key: 'created_at',
      align: 'right' as const,
      render: (ts: number) => formatDateTime(ts),
    },
  ]

  const logColumns = [
    {
      title: i18n.t('发放时间'),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (ts: number) => formatDateTime(ts),
    },
    {
      title: i18n.t('佣金'),
      dataIndex: 'get_amount',
      key: 'get_amount',
      align: 'right' as const,
      render: (amount: number) => (amount / 100).toFixed(2),
    },
  ]

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        <p className="mb-0">{error}</p>
      </div>
    )
  }

  return (
    <>
      <div className="row mb-3 mb-md-0">
        <div className="col-md-12">
          <div className={`block block-rounded js-appear-enabled ${loading ? 'block-mode-loading' : ''}`}>
            <div className="block-content pb-3">
              <i className="fa fa-user-plus fa-2x text-gray-light float-right" />
              <div className="pb-sm-3">
                <p className="text-muted w-75">{i18n.t('我的邀请')}</p>
                <p className="display-4 text-black font-w300 mb-2">
                  {userInfo?.commission_balance != null
                    ? (parseInt(String(userInfo.commission_balance), 10) / 100).toFixed(2)
                    : '--.--'}
                  <span className="font-size-h5 text-muted ml-4">{currency}</span>
                </p>
                <span className="text-muted" style={{ cursor: 'pointer' }}>
                  {i18n.t('当前剩余佣金')}
                </span>
                <div className="pt-3">
                  <button
                    type="button"
                    className="btn btn-primary mr-2"
                    onClick={() => {
                      setTransferAmount('')
                      setTransferVisible(true)
                    }}
                  >
                    <TransactionOutlined className="mr-1" /> {i18n.t('划转')}
                  </button>
                  {!config?.withdraw_close ? (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        setWithdrawMethod(config?.withdraw_methods?.[0] ?? '')
                        setWithdrawAccount('')
                        setWithdrawVisible(true)
                      }}
                    >
                      <PayCircleOutlined className="mr-1" /> {i18n.t('推广佣金提现')}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row mb-3 mb-md-0">
        <div className="col-md-12">
          <div className={`block block-rounded js-appear-enabled ${loading ? 'block-mode-loading' : ''}`}>
            <div className="block-content pb-3">
              <div style={{ display: 'flex', padding: '5px 0' }}>
                <div style={{ flex: 1 }}>{i18n.t('已注册用户数')}</div>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  {invitedCount != null ? invitedCount : <LoadingOutlined />}
                  {i18n.t('人')}
                </div>
              </div>

              <div style={{ display: 'flex', padding: '5px 0' }}>
                <div style={{ flex: 1 }}>
                  {config?.commission_distribution_enable ? (
                    <>
                      {i18n.t('三级分销比例')}{' '}
                      <Tooltip title={i18n.t('您邀请的用户再次邀请用户将按照订单金额乘以分销等级的比例进行分成。')}>
                        <span style={{ cursor: 'help' }}>
                          <QuestionCircleOutlined />
                        </span>
                      </Tooltip>
                    </>
                  ) : (
                    i18n.t('佣金比例')
                  )}
                </div>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  {config?.commission_distribution_enable ? (
                    distributionText ?? <LoadingOutlined />
                  ) : commissionRate != null ? (
                    `${commissionRate}%`
                  ) : (
                    <LoadingOutlined />
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', padding: '5px 0' }}>
                <div style={{ flex: 1 }}>
                  {i18n.t('确认中的佣金')}{' '}
                  <Tooltip title={i18n.t('佣金将会在确认后会到达你的佣金账户。')}>
                    <span style={{ cursor: 'help' }}>
                      <QuestionCircleOutlined />
                    </span>
                  </Tooltip>
                </div>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  {pendingCommission != null ? `${currencySymbol} ${pendingCommission / 100}` : <LoadingOutlined />}
                </div>
              </div>

              <div style={{ display: 'flex', padding: '5px 0' }}>
                <div style={{ flex: 1 }}>{i18n.t('累计获得佣金')}</div>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  {totalCommission != null ? `${currencySymbol} ${totalCommission / 100}` : <LoadingOutlined />}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row mb-3 mb-md-0">
        <div className="col-md-12">
          <div className={`block block-rounded js-appear-enabled ${loading ? 'block-mode-loading' : ''}`}>
            <div className="block-header block-header-default">
              <h3 className="block-title">{i18n.t('邀请码管理')}</h3>
              <div className="block-options">
                <button
                  type="button"
                  className="btn btn-primary btn-sm btn-primary btn-rounded px-3"
                  onClick={() => void handleCreate()}
                >
                  {creating ? <LoadingOutlined /> : i18n.t('生成邀请码')}
                </button>
              </div>
            </div>
            <div className="block-content p-0">
              <Table tableLayout="auto" columns={codeColumns} dataSource={codes} rowKey="code" pagination={false} />
            </div>
          </div>
        </div>
      </div>

      <div className="row mb-3 mb-md-0">
        <div className="col-md-12">
          <div className={`block block-rounded js-appear-enabled ${loading ? 'block-mode-loading' : ''}`}>
            <div className="block-header block-header-default">
              <h3 className="block-title">{i18n.t('佣金发放记录')}</h3>
            </div>
            <div className="block-content p-0">
              <Table
                tableLayout="auto"
                columns={logColumns}
                dataSource={commissionLogs}
                rowKey={(record) => record.id}
                loading={logsLoading}
                pagination={{
                  current: logsPagination.current,
                  pageSize: logsPagination.pageSize,
                  total: logsPagination.total,
                  pageSizeOptions: [10, 50, 100, 150],
                  showSizeChanger: true,
                  size: 'small',
                }}
                onChange={(pagination) => {
                  void loadLogs(pagination.current ?? 1, pagination.pageSize ?? 10)
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <Modal
        title={i18n.t('推广佣金划转至余额')}
        open={transferVisible}
        onOk={() => void handleTransfer()}
        onCancel={() => {
          setTransferVisible(false)
          setTransferAmount('')
        }}
        okText={transferLoading ? <LoadingOutlined /> : i18n.t('确认')}
        cancelText={i18n.t('取消')}
      >
        <div className="alert alert-danger d-flex align-items-center" role="alert">
          <div className="flex-00-auto">
            <i className="fa fa-fw fa-info-circle" />
          </div>
          <div className="flex-fill ml-3">
            <p className="mb-0">
              {i18n.t('划转后的余额仅用于{title}消费使用', {
                title: getAppTitle(),
              })}
            </p>
          </div>
        </div>

        <div className="form-group">
          <label>{i18n.t('当前推广佣金余额')}</label>
          <input
            disabled
            type="text"
            className="form-control"
            readOnly
            value={
              userInfo?.commission_balance != null ? (parseInt(String(userInfo.commission_balance), 10) / 100).toFixed(2) : ''
            }
          />
        </div>

        <div className="form-group">
          <label>{i18n.t('划转金额')}</label>
          <input
            type="text"
            className="form-control"
            placeholder={i18n.t('请输入需要划转到余额的金额')}
            value={transferAmount}
            onChange={(event) => setTransferAmount((event.target as HTMLInputElement).value)}
          />
        </div>
      </Modal>

      <Modal
        title={i18n.t('申请提现')}
        open={withdrawVisible}
        onOk={() => void handleWithdraw()}
        onCancel={() => {
          setWithdrawVisible(false)
          setWithdrawMethod('')
          setWithdrawAccount('')
        }}
        okText={withdrawLoading ? <LoadingOutlined /> : i18n.t('确认')}
        cancelText={i18n.t('取消')}
      >
        <div className="form-group">
          <label>{i18n.t('提现方式')}</label>
          <div>
            <Select
              style={{ width: '100%' }}
              placeholder={i18n.t('请选择提现方式')}
              value={withdrawMethod || undefined}
              onChange={setWithdrawMethod}
            >
              {(config?.withdraw_methods ?? []).map((method) => (
                <Select.Option key={method} value={method}>
                  {method}
                </Select.Option>
              ))}
            </Select>
          </div>
        </div>

        <div className="form-group">
          <label>{i18n.t('提现账号')}</label>
          <input
            type="text"
            className="form-control"
            placeholder={i18n.t('请输入提现账号')}
            value={withdrawAccount}
            onChange={(event) => setWithdrawAccount((event.target as HTMLInputElement).value)}
          />
        </div>
      </Modal>
    </>
  )
}
