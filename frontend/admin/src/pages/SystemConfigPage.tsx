import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Button, Select, Switch, Tabs, message } from 'antd'
import type { TabsProps } from 'antd'
import {
  getAdminPlans,
  getEmailTemplates,
  getSiteConfig,
  saveAdminConfig,
  setTelegramWebhook,
  testSendMail,
  type AdminPlan,
} from '@/api/admin'

type ConfigState = Record<string, Record<string, any>>

function ConfigRow({
  title,
  description,
  children,
  isChildren = false,
}: {
  title: string
  description?: string
  children: ReactNode
  isChildren?: boolean
}) {
  return (
    <div
      className={`row v2board-config-row ${isChildren ? 'v2board-config-children' : ''}`}
    >
      <div className="col-lg-6 v2board-config-col">
        <div className="v2board-config-title">{title}</div>
        {description ? <div className="v2board-config-description">{description}</div> : null}
      </div>
      <div className="col-lg-6 text-left text-lg-right mt-3 mt-lg-0 v2board-config-col v2board-config-control">{children}</div>
    </div>
  )
}

function asNumber(value: unknown, fallback = 0) {
  const next = Number(value)
  return Number.isNaN(next) ? fallback : next
}

function asCommaArray(value: unknown) {
  if (Array.isArray(value)) return value
  if (typeof value === 'string' && value.trim()) return value.split(',')
  return []
}

export function SystemConfigPage() {
  const [loading, setLoading] = useState(true)
  const [savingKeys, setSavingKeys] = useState<Record<string, boolean>>({})
  const [config, setConfig] = useState<ConfigState>({})
  const [plans, setPlans] = useState<AdminPlan[]>([])
  const [emailTemplates, setEmailTemplates] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState('site')
  const [testMailLoading, setTestMailLoading] = useState(false)
  const [telegramWebhookLoading, setTelegramWebhookLoading] = useState(false)
  const timersRef = useRef<Record<string, number>>({})

  useEffect(() => {
    let active = true

    Promise.allSettled([getSiteConfig(), getAdminPlans(), getEmailTemplates()]).then(([configResult, plansResult, templatesResult]) => {
      if (!active) return
      setConfig(configResult.status === 'fulfilled' ? (configResult.value as ConfigState) : {})
      setPlans(plansResult.status === 'fulfilled' ? plansResult.value : [])
      setEmailTemplates(templatesResult.status === 'fulfilled' ? templatesResult.value : [])
      setLoading(false)
    })

    return () => {
      active = false
      Object.values(timersRef.current).forEach((timer) => window.clearTimeout(timer))
    }
  }, [])

  const saveGroup = useCallback(
    async (groupKey: string, nextValue: Record<string, unknown>) => {
      setSavingKeys((state) => ({ ...state, [groupKey]: true }))
      try {
        await saveAdminConfig(nextValue)
      } finally {
        setSavingKeys((state) => ({ ...state, [groupKey]: false }))
      }
    },
    [],
  )

  const setField = useCallback(
    (groupKey: string, field: string, value: unknown) => {
      setConfig((state) => {
        const group = state[groupKey] ?? {}
        const nextGroup = {
          ...group,
          [field]: value,
        }

        if (timersRef.current[groupKey]) {
          window.clearTimeout(timersRef.current[groupKey])
        }

        timersRef.current[groupKey] = window.setTimeout(() => {
          saveGroup(groupKey, nextGroup)
        }, 1500)

        return {
          ...state,
          [groupKey]: nextGroup,
        }
      })
    },
    [saveGroup],
  )

  const tabs = useMemo<TabsProps['items']>(() => {
    const site = config.site ?? {}
    const safe = config.safe ?? {}
    const subscribe = config.subscribe ?? {}
    const invite = config.invite ?? {}
    const frontend = config.frontend ?? {}
    const server = config.server ?? {}
    const email = config.email ?? {}
    const telegram = config.telegram ?? {}
    const app = config.app ?? {}
    const ticket = config.ticket ?? {}
    const deposit = config.deposit ?? {}

    return [
      {
        key: 'site',
        label: '站点',
        children: (
          <div>
            <ConfigRow title="站点名称" description="用于显示需要站点名称的地方。">
              <input className="form-control" value={site.app_name ?? ''} onChange={(e) => setField('site', 'app_name', e.target.value)} />
            </ConfigRow>
            <ConfigRow title="站点描述" description="用于显示需要站点描述的地方。">
              <input className="form-control" value={site.app_description ?? ''} onChange={(e) => setField('site', 'app_description', e.target.value)} />
            </ConfigRow>
            <ConfigRow title="站点网址" description="当前网站最新地址，将会在邮件等需要站点网址处体现。">
              <input className="form-control" value={site.app_url ?? ''} onChange={(e) => setField('site', 'app_url', e.target.value)} />
            </ConfigRow>
            <ConfigRow title="强制 HTTPS" description="站点在 CDN 或反代后启用 HTTPS 时需要开启。">
              <Switch checked={!!asNumber(site.force_https)} onChange={(checked) => setField('site', 'force_https', checked ? 1 : 0)} />
            </ConfigRow>
            <ConfigRow title="LOGO" description="用于显示需要 LOGO 的地方。">
              <input className="form-control" value={site.logo ?? ''} onChange={(e) => setField('site', 'logo', e.target.value)} />
            </ConfigRow>
            <ConfigRow title="订阅 URL" description="留空则为站点 URL，多个域名可用逗号分隔。">
              <textarea className="form-control" rows={4} value={site.subscribe_url ?? ''} onChange={(e) => setField('site', 'subscribe_url', e.target.value)} />
            </ConfigRow>
            <ConfigRow title="订阅路径" description="留空则为 `/api/v1/client/subscribe`。">
              <input className="form-control" value={site.subscribe_path ?? ''} onChange={(e) => setField('site', 'subscribe_path', e.target.value)} />
            </ConfigRow>
            <ConfigRow title="用户条款 (TOS) URL">
              <input className="form-control" value={site.tos_url ?? ''} onChange={(e) => setField('site', 'tos_url', e.target.value)} />
            </ConfigRow>
            <ConfigRow title="停止新用户注册" description="开启后任何人都将无法进行注册。">
              <Switch checked={!!asNumber(site.stop_register)} onChange={(checked) => setField('site', 'stop_register', checked ? 1 : 0)} />
            </ConfigRow>
            <ConfigRow title="注册试用" description="选择需要试用的订阅。">
              <select className="form-control" value={site.try_out_plan_id ?? 0} onChange={(e) => setField('site', 'try_out_plan_id', asNumber(e.target.value))}>
                <option value={0}>关闭</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </ConfigRow>
            {asNumber(site.try_out_plan_id) !== 0 ? (
              <ConfigRow isChildren title="试用时间 (小时)">
                <input className="form-control" value={site.try_out_hour ?? ''} onChange={(e) => setField('site', 'try_out_hour', e.target.value)} />
              </ConfigRow>
            ) : null}
            <ConfigRow title="货币单位">
              <input className="form-control" value={site.currency ?? ''} onChange={(e) => setField('site', 'currency', e.target.value)} />
            </ConfigRow>
            <ConfigRow title="货币符号">
              <input className="form-control" value={site.currency_symbol ?? ''} onChange={(e) => setField('site', 'currency_symbol', e.target.value)} />
            </ConfigRow>
          </div>
        ),
      },
      {
        key: 'safe',
        label: '安全',
        children: (
          <div>
            <ConfigRow title="邮箱验证" description="开启后将会强制要求用户进行邮箱验证。">
              <Switch checked={!!asNumber(safe.email_verify)} onChange={(checked) => setField('safe', 'email_verify', checked ? 1 : 0)} />
            </ConfigRow>
            <ConfigRow title="禁止使用 Gmail 多别名">
              <Switch checked={!!asNumber(safe.email_gmail_limit_enable)} onChange={(checked) => setField('safe', 'email_gmail_limit_enable', checked ? 1 : 0)} />
            </ConfigRow>
            <ConfigRow title="安全模式" description="开启后除了站点 URL 以外的绑定域名访问都将返回 403。">
              <Switch checked={!!asNumber(safe.safe_mode_enable)} onChange={(checked) => setField('safe', 'safe_mode_enable', checked ? 1 : 0)} />
            </ConfigRow>
            <ConfigRow title="后台路径">
              <input className="form-control" value={safe.secure_path ?? ''} onChange={(e) => setField('safe', 'secure_path', e.target.value)} />
            </ConfigRow>
            <ConfigRow title="邮箱后缀白名单">
              <Switch checked={!!asNumber(safe.email_whitelist_enable)} onChange={(checked) => setField('safe', 'email_whitelist_enable', checked ? 1 : 0)} />
            </ConfigRow>
            {asNumber(safe.email_whitelist_enable) ? (
              <ConfigRow isChildren title="白名单后缀">
                <textarea className="form-control" rows={4} value={asCommaArray(safe.email_whitelist_suffix).join(',')} onChange={(e) => setField('safe', 'email_whitelist_suffix', e.target.value.split(','))} />
              </ConfigRow>
            ) : null}
            <ConfigRow title="防机器人">
              <Switch checked={!!asNumber(safe.recaptcha_enable)} onChange={(checked) => setField('safe', 'recaptcha_enable', checked ? 1 : 0)} />
            </ConfigRow>
            {asNumber(safe.recaptcha_enable) ? (
              <>
                <ConfigRow isChildren title="密钥">
                  <input className="form-control" value={safe.recaptcha_key ?? ''} onChange={(e) => setField('safe', 'recaptcha_key', e.target.value)} />
                </ConfigRow>
                <ConfigRow isChildren title="网站密钥">
                  <input className="form-control" value={safe.recaptcha_site_key ?? ''} onChange={(e) => setField('safe', 'recaptcha_site_key', e.target.value)} />
                </ConfigRow>
              </>
            ) : null}
            <ConfigRow title="IP 注册限制">
              <Switch checked={!!asNumber(safe.register_limit_by_ip_enable)} onChange={(checked) => setField('safe', 'register_limit_by_ip_enable', checked ? 1 : 0)} />
            </ConfigRow>
            {asNumber(safe.register_limit_by_ip_enable) ? (
              <>
                <ConfigRow isChildren title="次数">
                  <input className="form-control" value={safe.register_limit_count ?? ''} onChange={(e) => setField('safe', 'register_limit_count', e.target.value)} />
                </ConfigRow>
                <ConfigRow isChildren title="惩罚时间 (分钟)">
                  <input className="form-control" value={safe.register_limit_expire ?? ''} onChange={(e) => setField('safe', 'register_limit_expire', e.target.value)} />
                </ConfigRow>
              </>
            ) : null}
            <ConfigRow title="防爆破限制">
              <Switch checked={!!asNumber(safe.password_limit_enable, 1)} onChange={(checked) => setField('safe', 'password_limit_enable', checked ? 1 : 0)} />
            </ConfigRow>
            {asNumber(safe.password_limit_enable, 1) ? (
              <>
                <ConfigRow isChildren title="次数">
                  <input className="form-control" value={safe.password_limit_count ?? ''} onChange={(e) => setField('safe', 'password_limit_count', e.target.value)} />
                </ConfigRow>
                <ConfigRow isChildren title="惩罚时间 (分钟)">
                  <input className="form-control" value={safe.password_limit_expire ?? ''} onChange={(e) => setField('safe', 'password_limit_expire', e.target.value)} />
                </ConfigRow>
              </>
            ) : null}
          </div>
        ),
      },
      {
        key: 'subscribe',
        label: '订阅',
        children: (
          <div>
            <ConfigRow title="允许用户更改订阅">
              <Switch checked={!!asNumber(subscribe.plan_change_enable, 1)} onChange={(checked) => setField('subscribe', 'plan_change_enable', checked ? 1 : 0)} />
            </ConfigRow>
            <ConfigRow title="月流量重置方式">
              <select className="form-control" value={subscribe.reset_traffic_method ?? 0} onChange={(e) => setField('subscribe', 'reset_traffic_method', asNumber(e.target.value))}>
                <option value={0}>每月 1 号</option>
                <option value={1}>按月重置</option>
                <option value={2}>不重置</option>
                <option value={3}>每年 1 月 1 日</option>
                <option value={4}>按年重置</option>
              </select>
            </ConfigRow>
            <ConfigRow title="开启折抵方案">
              <Switch checked={!!asNumber(subscribe.surplus_enable, 1)} onChange={(checked) => setField('subscribe', 'surplus_enable', checked ? 1 : 0)} />
            </ConfigRow>
            <ConfigRow title="允许提前开启流量周期">
              <Switch checked={!!asNumber(subscribe.allow_new_period)} onChange={(checked) => setField('subscribe', 'allow_new_period', checked ? 1 : 0)} />
            </ConfigRow>
            <ConfigRow title="展示订阅方式">
              <select className="form-control" value={subscribe.show_subscribe_method ?? 0} onChange={(e) => setField('subscribe', 'show_subscribe_method', asNumber(e.target.value))}>
                <option value={0}>完整展示</option>
                <option value={1}>仅链接</option>
                <option value={2}>隐藏</option>
              </select>
            </ConfigRow>
            <ConfigRow title="显示订阅到期提醒天数">
              <input className="form-control" value={subscribe.show_subscribe_expire ?? ''} onChange={(e) => setField('subscribe', 'show_subscribe_expire', e.target.value)} />
            </ConfigRow>
            <ConfigRow title="向节点展示用户信息">
              <Switch checked={!!asNumber(subscribe.show_info_to_server_enable)} onChange={(checked) => setField('subscribe', 'show_info_to_server_enable', checked ? 1 : 0)} />
            </ConfigRow>
          </div>
        ),
      },
      {
        key: 'ticket',
        label: '工单',
        children: (
          <div>
            <ConfigRow title="工单设置" description="请选择工单的状态。">
              <select className="form-control" value={ticket.ticket_status ?? 0} onChange={(e) => setField('ticket', 'ticket_status', asNumber(e.target.value))}>
                <option value={0}>完全开放工单</option>
                <option value={1}>仅限有付费订单用户</option>
                <option value={2}>完全禁止工单</option>
              </select>
            </ConfigRow>
          </div>
        ),
      },
      {
        key: 'invite',
        label: '邀请&佣金',
        children: (
          <div>
            <ConfigRow title="开启强制邀请">
              <Switch checked={!!asNumber(invite.invite_force)} onChange={(checked) => setField('invite', 'invite_force', checked ? 1 : 0)} />
            </ConfigRow>
            <ConfigRow title="返佣比例 (%)">
              <input className="form-control" value={invite.invite_commission ?? ''} onChange={(e) => setField('invite', 'invite_commission', asNumber(e.target.value))} />
            </ConfigRow>
            <ConfigRow title="用户可创建邀请码上限">
              <input className="form-control" value={invite.invite_gen_limit ?? ''} onChange={(e) => setField('invite', 'invite_gen_limit', asNumber(e.target.value))} />
            </ConfigRow>
            <ConfigRow title="邀请码永不失效">
              <Switch checked={!!asNumber(invite.invite_never_expire)} onChange={(checked) => setField('invite', 'invite_never_expire', checked ? 1 : 0)} />
            </ConfigRow>
            <ConfigRow title="佣金仅首次发放">
              <Switch checked={!!asNumber(invite.commission_first_time_enable, 1)} onChange={(checked) => setField('invite', 'commission_first_time_enable', checked ? 1 : 0)} />
            </ConfigRow>
            <ConfigRow title="佣金自动确认">
              <Switch checked={!!asNumber(invite.commission_auto_check_enable, 1)} onChange={(checked) => setField('invite', 'commission_auto_check_enable', checked ? 1 : 0)} />
            </ConfigRow>
            <ConfigRow title="提现门槛 (元)">
              <input className="form-control" value={invite.commission_withdraw_limit ?? ''} onChange={(e) => setField('invite', 'commission_withdraw_limit', e.target.value)} />
            </ConfigRow>
            <ConfigRow title="提现方式">
              <textarea className="form-control" rows={4} value={asCommaArray(invite.commission_withdraw_method).join(',')} onChange={(e) => setField('invite', 'commission_withdraw_method', e.target.value.split(','))} />
            </ConfigRow>
            <ConfigRow title="关闭提现">
              <Switch checked={!!asNumber(invite.withdraw_close_enable)} onChange={(checked) => setField('invite', 'withdraw_close_enable', checked ? 1 : 0)} />
            </ConfigRow>
            <ConfigRow title="三级分销">
              <Switch checked={!!asNumber(invite.commission_distribution_enable)} onChange={(checked) => setField('invite', 'commission_distribution_enable', checked ? 1 : 0)} />
            </ConfigRow>
            {asNumber(invite.commission_distribution_enable) ? (
              <>
                <ConfigRow isChildren title="一级邀请人比例">
                  <input className="form-control" value={invite.commission_distribution_l1 ?? ''} onChange={(e) => setField('invite', 'commission_distribution_l1', e.target.value)} />
                </ConfigRow>
                <ConfigRow isChildren title="二级邀请人比例">
                  <input className="form-control" value={invite.commission_distribution_l2 ?? ''} onChange={(e) => setField('invite', 'commission_distribution_l2', e.target.value)} />
                </ConfigRow>
                <ConfigRow isChildren title="三级邀请人比例">
                  <input className="form-control" value={invite.commission_distribution_l3 ?? ''} onChange={(e) => setField('invite', 'commission_distribution_l3', e.target.value)} />
                </ConfigRow>
              </>
            ) : null}
          </div>
        ),
      },
      {
        key: 'frontend',
        label: '个性化',
        children: (
          <div>
            <div className="block-content">
              <div className="row">
                <div className="col-lg-12">
                  <div className="alert alert-warning" role="alert">
                    <p className="mb-0">如果你采用前后分离的方式部署 V2Board 管理端，本页配置将不会生效。</p>
                  </div>
                </div>
              </div>
            </div>
            <ConfigRow title="边栏风格">
              <Switch checkedChildren="亮" unCheckedChildren="暗" checked={frontend.frontend_theme_sidebar === 'light'} onChange={(checked) => setField('frontend', 'frontend_theme_sidebar', checked ? 'light' : 'dark')} />
            </ConfigRow>
            <ConfigRow title="头部风格">
              <Switch checkedChildren="亮" unCheckedChildren="暗" checked={frontend.frontend_theme_header === 'light'} onChange={(checked) => setField('frontend', 'frontend_theme_header', checked ? 'light' : 'dark')} />
            </ConfigRow>
            <ConfigRow title="主题色">
              <select className="form-control" value={frontend.frontend_theme_color ?? 'default'} onChange={(e) => setField('frontend', 'frontend_theme_color', e.target.value)}>
                <option value="default">默认</option>
                <option value="black">黑色</option>
                <option value="darkblue">暗蓝色</option>
                <option value="green">奶绿色</option>
              </select>
            </ConfigRow>
            <ConfigRow title="背景" description="将会在后台登录页面进行展示。">
              <input className="form-control" value={frontend.frontend_background_url ?? ''} onChange={(e) => setField('frontend', 'frontend_background_url', e.target.value)} />
            </ConfigRow>
          </div>
        ),
      },
      {
        key: 'server',
        label: '节点',
        children: (
          <div>
            <ConfigRow title="节点对接 API 地址">
              <input className="form-control" value={server.server_api_url ?? ''} onChange={(e) => setField('server', 'server_api_url', e.target.value)} />
            </ConfigRow>
            <ConfigRow title="通讯密钥">
              <input className="form-control" value={server.server_token ?? ''} onChange={(e) => setField('server', 'server_token', e.target.value)} />
            </ConfigRow>
            <ConfigRow title="节点拉取动作轮询间隔">
              <input className="form-control" value={server.server_pull_interval ?? ''} onChange={(e) => setField('server', 'server_pull_interval', asNumber(e.target.value, 60))} />
            </ConfigRow>
            <ConfigRow title="节点推送动作轮询间隔">
              <input className="form-control" value={server.server_push_interval ?? ''} onChange={(e) => setField('server', 'server_push_interval', asNumber(e.target.value, 60))} />
            </ConfigRow>
            <ConfigRow title="节点用户流量上报最低阈值">
              <input className="form-control" value={server.server_node_report_min_traffic ?? ''} onChange={(e) => setField('server', 'server_node_report_min_traffic', asNumber(e.target.value))} />
            </ConfigRow>
            <ConfigRow title="节点用户设备数统计最低阈值">
              <input className="form-control" value={server.server_device_online_min_traffic ?? ''} onChange={(e) => setField('server', 'server_device_online_min_traffic', asNumber(e.target.value))} />
            </ConfigRow>
            <ConfigRow title="全局设备数限制采用宽松模式">
              <Switch checked={!!asNumber(server.device_limit_mode)} onChange={(checked) => setField('server', 'device_limit_mode', checked ? 1 : 0)} />
            </ConfigRow>
          </div>
        ),
      },
      {
        key: 'email',
        label: '邮件',
        children: (
          <div>
            <div className="block-content">
              <div className="row">
                <div className="col-lg-12">
                  <div className="alert alert-warning" role="alert">
                    <p className="mb-0">更改本页配置后，需要对队列服务进行重启，本页配置优先级高于 `.env` 邮件配置。</p>
                  </div>
                </div>
              </div>
            </div>
            <ConfigRow title="SMTP 服务器地址">
              <input className="form-control" value={email.email_host ?? ''} onChange={(e) => setField('email', 'email_host', e.target.value)} />
            </ConfigRow>
            <ConfigRow title="SMTP 服务端口">
              <input className="form-control" value={email.email_port ?? ''} onChange={(e) => setField('email', 'email_port', e.target.value)} />
            </ConfigRow>
            <ConfigRow title="SMTP 加密方式">
              <input className="form-control" value={email.email_encryption ?? ''} onChange={(e) => setField('email', 'email_encryption', e.target.value)} />
            </ConfigRow>
            <ConfigRow title="SMTP 账号">
              <input className="form-control" value={email.email_username ?? ''} onChange={(e) => setField('email', 'email_username', e.target.value)} />
            </ConfigRow>
            <ConfigRow title="SMTP 密码">
              <input className="form-control" value={email.email_password ?? ''} onChange={(e) => setField('email', 'email_password', e.target.value)} />
            </ConfigRow>
            <ConfigRow title="发件地址">
              <input className="form-control" value={email.email_from_address ?? ''} onChange={(e) => setField('email', 'email_from_address', e.target.value)} />
            </ConfigRow>
            <ConfigRow title="邮件模板">
              <Select className="w-100" value={email.email_template ?? undefined} options={emailTemplates.map((item) => ({ label: item, value: item }))} onChange={(value) => setField('email', 'email_template', value)} />
            </ConfigRow>
            <ConfigRow title="发送测试邮件" description="邮件将会发送到当前登录用户邮箱。">
              <Button
                type="primary"
                loading={testMailLoading}
                onClick={async () => {
                  setTestMailLoading(true)
                  try {
                    await testSendMail()
                    message.success('测试邮件已发送')
                  } finally {
                    setTestMailLoading(false)
                  }
                }}
              >
                发送测试邮件
              </Button>
            </ConfigRow>
          </div>
        ),
      },
      {
        key: 'telegram',
        label: 'Telegram',
        children: (
          <div>
            <ConfigRow title="机器人 Token">
              <input className="form-control" value={telegram.telegram_bot_token ?? ''} onChange={(e) => setField('telegram', 'telegram_bot_token', e.target.value)} />
            </ConfigRow>
            {telegram.telegram_bot_token ? (
              <ConfigRow title="设置 Webhook" description="不设置将无法收到 Telegram 通知。">
                <Button
                  type="primary"
                  loading={telegramWebhookLoading}
                  onClick={async () => {
                    setTelegramWebhookLoading(true)
                    try {
                      await setTelegramWebhook()
                      message.success('Webhook 已设置')
                    } finally {
                      setTelegramWebhookLoading(false)
                    }
                  }}
                >
                  一键设置
                </Button>
              </ConfigRow>
            ) : null}
            <ConfigRow title="开启机器人通知">
              <Switch checked={!!asNumber(telegram.telegram_bot_enable)} onChange={(checked) => setField('telegram', 'telegram_bot_enable', checked ? 1 : 0)} />
            </ConfigRow>
            <ConfigRow title="群组地址">
              <input className="form-control" value={telegram.telegram_discuss_link ?? ''} onChange={(e) => setField('telegram', 'telegram_discuss_link', e.target.value)} />
            </ConfigRow>
          </div>
        ),
      },
      {
        key: 'app',
        label: 'APP',
        children: (
          <div>
            <div className="block-content">
              <div className="row">
                <div className="col-lg-12">
                  <div className="alert alert-warning" role="alert">
                    <p className="mb-0">用于自有客户端 (APP) 的版本管理及更新。</p>
                  </div>
                </div>
              </div>
            </div>
            <ConfigRow title="Windows" description="版本号及下载地址">
              <div>
                <input className="form-control" value={app.windows_version ?? ''} onChange={(e) => setField('app', 'windows_version', e.target.value)} />
                <input className="form-control mt-1" value={app.windows_download_url ?? ''} onChange={(e) => setField('app', 'windows_download_url', e.target.value)} />
              </div>
            </ConfigRow>
            <ConfigRow title="macOS" description="版本号及下载地址">
              <div>
                <input className="form-control" value={app.macos_version ?? ''} onChange={(e) => setField('app', 'macos_version', e.target.value)} />
                <input className="form-control mt-1" value={app.macos_download_url ?? ''} onChange={(e) => setField('app', 'macos_download_url', e.target.value)} />
              </div>
            </ConfigRow>
            <ConfigRow title="Android" description="版本号及下载地址">
              <div>
                <input className="form-control" value={app.android_version ?? ''} onChange={(e) => setField('app', 'android_version', e.target.value)} />
                <input className="form-control mt-1" value={app.android_download_url ?? ''} onChange={(e) => setField('app', 'android_download_url', e.target.value)} />
              </div>
            </ConfigRow>
          </div>
        ),
      },
      {
        key: 'deposit',
        label: '充值赠送',
        children: (
          <div>
            <ConfigRow title="充值赠送配置" description="格式：充值金额:奖励金额，逗号分隔，例如 50:18,100:38。">
              <textarea className="form-control" rows={4} value={asCommaArray(deposit.deposit_bounus).join(',')} onChange={(e) => setField('deposit', 'deposit_bounus', e.target.value.split(','))} />
            </ConfigRow>
          </div>
        ),
      },
    ]
  }, [config, emailTemplates, plans, setField, telegramWebhookLoading, testMailLoading])

  return (
    <div className={`mb-0 block border-bottom v2board-system-config ${loading ? 'block-mode-loading' : ''}`}>
      {loading ? (
        <div className="content content-full v2board-page-loading">
          <div className="spinner-grow text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
        </div>
      ) : (
        <div className="block-content p-0">
          <Tabs
            className="v2board-system-config-tabs"
            size="large"
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabs?.map((item) => ({
              ...item,
              label: (
                <span className="v2board-system-config-tab-label">
                  {item?.label}
                  {item?.key && savingKeys[item.key] ? <span className="text-muted ml-2 v2board-system-config-saving">保存中...</span> : null}
                </span>
              ),
            }))}
          />
        </div>
      )}
    </div>
  )
}
