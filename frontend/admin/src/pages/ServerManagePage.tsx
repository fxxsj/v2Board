import { useEffect, useMemo, useState } from 'react'
import { Drawer, Dropdown, Input, Modal, Select, Tag, message } from 'antd'
import type { MenuProps } from 'antd'
import {
  copyAdminServerNode,
  deleteAdminServerNode,
  getAdminServerNodes,
  getServerGroups,
  getServerRoutes,
  saveAdminServerNode,
  sortAdminServerNodes,
  updateAdminServerNode,
  type AdminServerNode,
  type ServerGroup,
  type ServerRoute,
} from '@/api/admin'

type ServerType = 'shadowsocks' | 'vmess' | 'trojan' | 'hysteria' | 'tuic' | 'vless' | 'anytls' | 'v2node'
type ServerFormState = Record<string, unknown>

const serverTypeOptions: Array<{ value: ServerType; label: string; color: string }> = [
  { value: 'v2node', label: 'V2node', color: '#FF0000' },
  { value: 'shadowsocks', label: 'Shadowsocks', color: '#489851' },
  { value: 'vmess', label: 'VMess', color: '#CB3180' },
  { value: 'trojan', label: 'Trojan', color: '#EAB854' },
  { value: 'hysteria', label: 'Hysteria', color: '#1A1A1A' },
  { value: 'tuic', label: 'Tuic', color: '#9400D3' },
  { value: 'vless', label: 'VLess', color: '#4080FF' },
  { value: 'anytls', label: 'AnyTLS', color: '#FF8C00' },
]

const typeLabelMap = Object.fromEntries(serverTypeOptions.map((item) => [item.value, item.label])) as Record<ServerType, string>
const typeColorMap = Object.fromEntries(serverTypeOptions.map((item) => [item.value, item.color])) as Record<ServerType, string>

const statusColorMap: Record<number, string> = {
  0: 'red',
  1: 'orange',
  2: 'processing',
}

const networkOptions = [
  'tcp',
  'kcp',
  'ws',
  'http',
  'domainsocket',
  'quic',
  'grpc',
  'httpupgrade',
  'xhttp',
]

const v2nodeProtocolOptions = ['shadowsocks', 'vmess', 'vless', 'trojan', 'tuic', 'hysteria2', 'anytls']
const v2nodeProtocolLabelMap: Record<string, string> = {
  anytls: 'AnyTLS',
  hysteria2: 'Hysteria2',
  shadowsocks: 'Shadowsocks',
  trojan: 'Trojan',
  tuic: 'Tuic',
  vless: 'VLess',
  vmess: 'VMess',
}
const cipherOptions = [
  'aes-128-gcm',
  'aes-192-gcm',
  'aes-256-gcm',
  'chacha20-ietf-poly1305',
  '2022-blake3-aes-128-gcm',
  '2022-blake3-aes-256-gcm',
]
const yesNoOptions = [
  { value: 0, label: '否' },
  { value: 1, label: '是' },
]
const displayOptions = [
  { value: 1, label: '显示' },
  { value: 0, label: '隐藏' },
]
const vlessNetworkOptions = ['tcp', 'ws', 'grpc', 'kcp', 'httpupgrade', 'xhttp']
const trojanNetworkOptions = ['tcp', 'ws', 'grpc', 'httpupgrade', 'xhttp']
const v2nodeTuicUdpRelayModeOptions = [
  { value: 'native', label: 'native' },
  { value: 'quic', label: 'quic' },
]
const v2nodeTuicCongestionOptions = [
  { value: 'cubic', label: 'cubic' },
  { value: 'new_reno', label: 'new_reno' },
  { value: 'bbr', label: 'bbr' },
]
const networkSettingsTemplateMap: Record<string, string> = {
  tcp: JSON.stringify(
    {
      header: {
        type: 'http',
        request: {
          path: ['/'],
          headers: {
            Host: ['www.baidu.com', 'www.bing.com'],
          },
        },
        response: {},
      },
    },
    null,
    2,
  ),
  ws: JSON.stringify(
    {
      security: 'auto',
      path: '/',
      headers: {
        Host: 'xtls.github.io',
      },
    },
    null,
    2,
  ),
  grpc: JSON.stringify(
    {
      serviceName: 'GunService',
    },
    null,
    2,
  ),
  kcp: JSON.stringify(
    {
      header: {
        type: 'none',
      },
      seed: '',
    },
    null,
    2,
  ),
  http: JSON.stringify(
    {
      host: ['www.baidu.com'],
      path: '/',
    },
    null,
    2,
  ),
  httpupgrade: JSON.stringify(
    {
      path: '/',
      host: 'xtls.github.io',
    },
    null,
    2,
  ),
  xhttp: JSON.stringify(
    {
      path: '/',
      host: 'xtls.github.io',
      mode: 'auto',
      extra: {},
    },
    null,
    2,
  ),
}
const anytlsPaddingSchemeTemplate = JSON.stringify(
  [
    'stop=8',
    '0=30-30',
    '1=100-400',
    '2=400-500,c,500-1000,c,500-1000,c,500-1000,c,500-1000',
    '3=9-9,500-1000',
    '4=500-1000',
    '5=500-1000',
    '6=500-1000',
    '7=500-1000',
  ],
  null,
  2,
)
const realityTlsSettingsTemplate = JSON.stringify(
  {
    server_port: 443,
    server_name: 'example.com',
    private_key: '',
    public_key: '',
    short_id: '',
  },
  null,
  2,
)
const mlkemEncryptionSettingsTemplate = JSON.stringify(
  {
    mode: 'native',
    rtt: '0rtt',
    ticket: '600s',
    private_key: '',
    password: '',
  },
  null,
  2,
)

function getPageSize() {
  const stored = localStorage.getItem('server_manage_page_size')
  return stored ? Number(stored) : 10
}

function asArray(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => String(item))
  return []
}

function stringifyJson(value: unknown) {
  if (!value) return ''
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return ''
  }
}

function parseNullableNumber(value: unknown) {
  const text = String(value ?? '').trim()
  if (!text) return null
  const result = Number(text)
  return Number.isNaN(result) ? null : result
}

function parseJsonText(label: string, value: unknown) {
  const text = String(value ?? '').trim()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`${label} JSON 格式不正确`)
  }
}

function getTlsSettingsPlaceholder(tls: unknown) {
  return Number(tls) === 2 ? realityTlsSettingsTemplate : ''
}

function getNetworkSettingsPlaceholder(network: unknown) {
  return networkSettingsTemplateMap[String(network ?? '')] ?? ''
}

function getEncryptionSettingsPlaceholder(encryption: unknown) {
  return String(encryption ?? '') === 'mlkem768x25519plus' ? mlkemEncryptionSettingsTemplate : ''
}

function getV2nodeNetworkOptions(protocol: unknown) {
  const currentProtocol = String(protocol ?? '')
  if (currentProtocol === 'shadowsocks') {
    return [
      { value: 'tcp', label: 'TCP' },
      { value: 'http', label: 'HTTP伪装' },
    ]
  }
  if (currentProtocol === 'hysteria2' || currentProtocol === 'tuic') {
    return []
  }
  return [
    { value: 'tcp', label: 'TCP' },
    { value: 'ws', label: 'WebSocket' },
    { value: 'grpc', label: 'gRPC' },
    ...(currentProtocol === 'trojan'
      ? []
      : [
          { value: 'httpupgrade', label: 'HTTPUpgrade' },
          { value: 'xhttp', label: 'XHTTP' },
        ]),
  ]
}

function getV2nodeTlsOptions(protocol: unknown) {
  const currentProtocol = String(protocol ?? '')
  const options: Array<{ value: number; label: string }> = []
  if (currentProtocol === 'vless' || currentProtocol === 'vmess') {
    options.push({ value: 0, label: '无' })
  }
  options.push({ value: 1, label: 'TLS' })
  if (currentProtocol === 'vless' || currentProtocol === 'anytls') {
    options.push({ value: 2, label: 'Reality' })
  }
  return options
}

function normalizeV2nodeProtocolState(current: ServerFormState, protocol: string): ServerFormState {
  const next: ServerFormState = {
    ...current,
    protocol,
  }

  if (['anytls', 'hysteria2', 'trojan', 'tuic'].includes(protocol)) {
    next.tls = 1
  } else if (![0, 1, 2].includes(Number(current.tls ?? 0))) {
    next.tls = 0
  }

  if (protocol === 'shadowsocks') {
    next.network = ['tcp', 'http'].includes(String(current.network ?? '')) ? current.network : 'tcp'
    next.cipher = String(current.cipher ?? '') || 'aes-128-gcm'
  } else if (protocol === 'hysteria2' || protocol === 'tuic' || protocol === 'anytls') {
    next.network = 'tcp'
  } else {
    const currentNetwork = String(current.network ?? '')
    const availableNetworks = getV2nodeNetworkOptions(protocol).map((item) => item.value)
    next.network = availableNetworks.includes(currentNetwork) ? currentNetwork : 'tcp'
  }

  if (protocol === 'tuic') {
    next.udp_relay_mode = String(current.udp_relay_mode ?? '') || 'native'
    next.congestion_control = String(current.congestion_control ?? '') || 'cubic'
  }

  if (protocol !== 'vless') {
    next.flow = ''
    next.encryption = ''
    next.encryption_settings = ''
  }

  if (protocol !== 'hysteria2') {
    next.obfs = ''
    next.obfs_password = ''
    next.up_mbps = ''
    next.down_mbps = ''
  }

  if (protocol !== 'tuic') {
    next.disable_sni = Number(current.disable_sni ?? 0)
    next.udp_relay_mode = protocol === 'tuic' ? next.udp_relay_mode : ''
    next.zero_rtt_handshake = Number(current.zero_rtt_handshake ?? 0)
    next.congestion_control = protocol === 'tuic' ? next.congestion_control : ''
  }

  if (protocol !== 'anytls') {
    next.padding_scheme = ''
  }

  if (protocol !== 'shadowsocks') {
    next.cipher = protocol === 'shadowsocks' ? next.cipher : ''
  }

  return next
}

function createEmptyServerForm(type: ServerType): ServerFormState {
  const base: ServerFormState = {
    show: 1,
    name: '',
    group_id: [],
    route_id: [],
    parent_id: undefined,
    host: '',
    port: '',
    server_port: '',
    tags: [],
    rate: '1',
  }

  switch (type) {
    case 'shadowsocks':
      return { ...base, cipher: 'aes-128-gcm', obfs: '', obfs_settings: '' }
    case 'vmess':
      return { ...base, tls: 0, network: 'ws', networkSettings: '', ruleSettings: '', tlsSettings: '', dnsSettings: '' }
    case 'trojan':
      return { ...base, network: 'tcp', network_settings: '', allow_insecure: 0, server_name: '' }
    case 'hysteria':
      return { ...base, version: 2, up_mbps: '', down_mbps: '', obfs: '', obfs_password: '', server_name: '', insecure: 0 }
    case 'tuic':
      return { ...base, server_name: '', insecure: 0, disable_sni: 0, udp_relay_mode: '', zero_rtt_handshake: 0, congestion_control: '' }
    case 'vless':
      return { ...base, tls: 0, tls_settings: '', flow: '', network: 'ws', network_settings: '', encryption: '', encryption_settings: '' }
    case 'anytls':
      return { ...base, server_name: '', insecure: 0, padding_scheme: '' }
    case 'v2node':
      return {
        ...base,
        listen_ip: '',
        protocol: 'vmess',
        tls: 0,
        tls_settings: '',
        flow: '',
        network: 'ws',
        network_settings: '',
        encryption: '',
        encryption_settings: '',
        disable_sni: 0,
        udp_relay_mode: '',
        zero_rtt_handshake: 0,
        congestion_control: '',
        cipher: '',
        up_mbps: '',
        down_mbps: '',
        obfs: '',
        obfs_password: '',
        padding_scheme: '',
      }
  }
}

function normalizeServerForm(type: ServerType, record?: AdminServerNode | null) {
  if (!record) return createEmptyServerForm(type)

  return {
    ...createEmptyServerForm(type),
    ...record,
    group_id: asArray(record.group_id),
    route_id: asArray(record.route_id),
    tags: asArray(record.tags),
    parent_id: record.parent_id ?? undefined,
    rate: String(record.rate ?? 1),
    show: Number(record.show ?? 1),
    port: String(record.port ?? ''),
    server_port: String(record.server_port ?? ''),
    tls: record.tls === undefined ? 0 : Number(record.tls),
    insecure: record.insecure === undefined ? 0 : Number(record.insecure),
    allow_insecure: record.allow_insecure === undefined ? 0 : Number(record.allow_insecure),
    disable_sni: record.disable_sni === undefined ? 0 : Number(record.disable_sni),
    zero_rtt_handshake: record.zero_rtt_handshake === undefined ? 0 : Number(record.zero_rtt_handshake),
    version: record.version === undefined ? 2 : Number(record.version),
    up_mbps: record.up_mbps === undefined || record.up_mbps === null ? '' : String(record.up_mbps),
    down_mbps: record.down_mbps === undefined || record.down_mbps === null ? '' : String(record.down_mbps),
    obfs_settings: stringifyJson(record.obfs_settings),
    networkSettings: stringifyJson(record.networkSettings),
    ruleSettings: stringifyJson(record.ruleSettings),
    tlsSettings: stringifyJson(record.tlsSettings),
    dnsSettings: stringifyJson(record.dnsSettings),
    network_settings: stringifyJson(record.network_settings),
    tls_settings: stringifyJson(record.tls_settings),
    encryption_settings: stringifyJson(record.encryption_settings),
    padding_scheme: typeof record.padding_scheme === 'string' ? record.padding_scheme : stringifyJson(record.padding_scheme),
  }
}

function ServerDetailModal({
  open,
  record,
  onCancel,
}: {
  open: boolean
  record: AdminServerNode | null
  onCancel: () => void
}) {
  return (
    <Modal
      className="v2board-detail-modal"
      title="节点详情"
      open={open}
      footer={null}
      width="100%"
      style={{ maxWidth: 1000, padding: '0 10px', top: 20 }}
      styles={{ body: { padding: 0 } }}
      onCancel={onCancel}
    >
      <pre className="v2board-queue-json v2board-json-detail v2board-detail-pre">{record ? JSON.stringify(record, null, 2) : '{}'}</pre>
    </Modal>
  )
}

function ServerEditorModal({
  open,
  type,
  record,
  groups,
  routes,
  nodes,
  loading,
  onCancel,
  onSubmit,
}: {
  open: boolean
  type: ServerType | null
  record: AdminServerNode | null
  groups: ServerGroup[]
  routes: ServerRoute[]
  nodes: AdminServerNode[]
  loading: boolean
  onCancel: () => void
  onSubmit: (type: ServerType, payload: Record<string, unknown>) => Promise<void>
}) {
  const [form, setForm] = useState<ServerFormState>({})
  const [childDrawer, setChildDrawer] = useState<{
    open: boolean
    title: string
    field: string
    placeholder?: string
    description?: string
    rows?: number
  }>({
    open: false,
    title: '',
    field: '',
  })

  useEffect(() => {
    if (!open || !type) return
    setForm(normalizeServerForm(type, record))
  }, [open, type, record])

  useEffect(() => {
    if (!open) {
      setChildDrawer({
        open: false,
        title: '',
        field: '',
      })
    }
  }, [open])

  const parentOptions = useMemo(() => {
    if (!type) return []
    return nodes
      .filter((item) => item.type === type && item.id !== record?.id)
      .map((item) => ({
        value: item.id,
        label: `${item.id} - ${item.name}`,
      }))
  }, [nodes, record?.id, type])

  if (!type) return null

  const v2nodeProtocol = String(form.protocol ?? 'vmess')
  const v2nodeTlsOptions = getV2nodeTlsOptions(v2nodeProtocol)
  const v2nodeNetworkOptions = getV2nodeNetworkOptions(v2nodeProtocol)

  const openChildDrawer = (
    title: string,
    field: string,
    rows = 6,
    placeholder = '',
    description?: string,
  ) => {
    setChildDrawer({
      open: true,
      title,
      field,
      rows,
      placeholder,
      description,
    })
  }

  const closeChildDrawer = () => {
    setChildDrawer((current) => ({
      ...current,
      open: false,
    }))
  }

  const renderConfigTrigger = (
    label: string,
    field: string,
    title: string,
    rows = 6,
    placeholder = '',
    description?: string,
    colClassName = 'col-md-6 mb-3',
  ) => {
    const hasValue = String(form[field] ?? '').trim().length > 0
    return (
      <div className={colClassName}>
        <label className="mb-2 d-flex justify-content-between align-items-center">
          <span>{label}</span>
          <button
            type="button"
            className="v2board-link-button"
            onClick={() => openChildDrawer(title, field, rows, placeholder, description)}
          >
            编辑配置
          </button>
        </label>
        <div className="font-size-sm text-muted">
          {hasValue ? '已配置' : description ?? '留空时使用默认配置'}
        </div>
      </div>
    )
  }

  const renderTypeFields = () => {
    switch (type) {
      case 'shadowsocks':
        return (
          <>
            <div className="col-md-6 mb-3">
              <label className="mb-2">加密方式</label>
              <Select className="w-100" value={form.cipher as string} onChange={(value) => setForm((current) => ({ ...current, cipher: value }))} options={cipherOptions.map((value) => ({ value, label: value }))} />
            </div>
            <div className="col-md-6 mb-3">
              <label className="mb-2">混淆</label>
              <Select className="w-100" allowClear value={(form.obfs as string) || undefined} onChange={(value) => setForm((current) => ({ ...current, obfs: value ?? '' }))} options={[{ value: 'http', label: 'HTTP' }]} />
            </div>
            {String(form.obfs ?? '') ? renderConfigTrigger('混淆设置', 'obfs_settings', '编辑混淆配置', 6, '', '留空则不启用额外混淆配置', 'col-md-12 mb-3') : null}
          </>
        )
      case 'vmess':
        return (
          <>
            <div className="col-md-6 mb-3">
              <label className="mb-2 d-flex justify-content-between align-items-center">
                <span>TLS</span>
                <button type="button" className="v2board-link-button" onClick={() => openChildDrawer('编辑 TLS 配置', 'tlsSettings', 8, getTlsSettingsPlaceholder(form.tls), '留空时使用默认 TLS 配置')}>
                  编辑配置
                </button>
              </label>
              <Select className="w-100" value={Number(form.tls ?? 0)} onChange={(value) => setForm((current) => ({ ...current, tls: value }))} options={[{ value: 0, label: '关闭' }, { value: 1, label: '开启' }]} />
            </div>
            <div className="col-md-6 mb-3">
              <label className="mb-2 d-flex justify-content-between align-items-center">
                <span>传输协议</span>
                <button type="button" className="v2board-link-button" onClick={() => openChildDrawer('编辑协议配置', 'networkSettings', 8, getNetworkSettingsPlaceholder(form.network), '留空则使用协议默认模板')}>
                  编辑配置
                </button>
              </label>
              <Select className="w-100" value={form.network as string} onChange={(value) => setForm((current) => ({ ...current, network: value }))} options={networkOptions.map((value) => ({ value, label: value }))} />
            </div>
            {renderConfigTrigger('规则设置', 'ruleSettings', '编辑规则配置', 8, '', '留空时不启用额外规则')}
            {renderConfigTrigger('DNS 设置', 'dnsSettings', '编辑 DNS 配置', 8, '', '留空时使用默认 DNS')}
          </>
        )
      case 'trojan':
        return (
          <>
            <div className="col-md-6 mb-3">
              <label className="mb-2 d-flex justify-content-between align-items-center">
                <span>传输协议</span>
                <button type="button" className="v2board-link-button" onClick={() => openChildDrawer('编辑协议配置', 'network_settings', 8, getNetworkSettingsPlaceholder(form.network), '留空则使用协议默认模板')}>
                  编辑配置
                </button>
              </label>
              <Select className="w-100" value={form.network as string} onChange={(value) => setForm((current) => ({ ...current, network: value }))} options={trojanNetworkOptions.map((value) => ({ value, label: value }))} />
            </div>
            <div className="col-md-6 mb-3">
              <label className="mb-2">SNI</label>
              <Input value={String(form.server_name ?? '')} onChange={(event) => setForm((current) => ({ ...current, server_name: event.target.value }))} />
            </div>
            <div className="col-md-6 mb-3">
              <label className="mb-2">允许不安全</label>
              <Select className="w-100" value={Number(form.allow_insecure ?? 0)} onChange={(value) => setForm((current) => ({ ...current, allow_insecure: value }))} options={[{ value: 0, label: '否' }, { value: 1, label: '是' }]} />
            </div>
          </>
        )
      case 'hysteria':
        return (
          <>
            <div className="col-md-4 mb-3">
              <label className="mb-2">版本</label>
              <Select className="w-100" value={Number(form.version ?? 2)} onChange={(value) => setForm((current) => ({ ...current, version: value }))} options={[{ value: 1, label: '1' }, { value: 2, label: '2' }]} />
            </div>
            <div className="col-md-4 mb-3">
              <label className="mb-2">上行限速</label>
              <Input value={String(form.up_mbps ?? '')} suffix="Mbps" onChange={(event) => setForm((current) => ({ ...current, up_mbps: event.target.value }))} />
            </div>
            <div className="col-md-4 mb-3">
              <label className="mb-2">下行限速</label>
              <Input value={String(form.down_mbps ?? '')} suffix="Mbps" onChange={(event) => setForm((current) => ({ ...current, down_mbps: event.target.value }))} />
            </div>
            <div className="col-md-4 mb-3">
              <label className="mb-2">混淆</label>
              <Input value={String(form.obfs ?? '')} onChange={(event) => setForm((current) => ({ ...current, obfs: event.target.value }))} />
            </div>
            <div className="col-md-4 mb-3">
              <label className="mb-2">混淆密码</label>
              <Input value={String(form.obfs_password ?? '')} onChange={(event) => setForm((current) => ({ ...current, obfs_password: event.target.value }))} />
            </div>
            <div className="col-md-4 mb-3">
              <label className="mb-2">SNI</label>
              <Input value={String(form.server_name ?? '')} onChange={(event) => setForm((current) => ({ ...current, server_name: event.target.value }))} />
            </div>
            <div className="col-md-4 mb-3">
              <label className="mb-2">允许不安全</label>
              <Select className="w-100" value={Number(form.insecure ?? 0)} onChange={(value) => setForm((current) => ({ ...current, insecure: value }))} options={yesNoOptions} />
            </div>
          </>
        )
      case 'tuic':
        return (
          <>
            <div className="col-md-4 mb-3">
              <label className="mb-2">SNI</label>
              <Input value={String(form.server_name ?? '')} onChange={(event) => setForm((current) => ({ ...current, server_name: event.target.value }))} />
            </div>
            <div className="col-md-4 mb-3">
              <label className="mb-2">允许不安全</label>
              <Select className="w-100" value={Number(form.insecure ?? 0)} onChange={(value) => setForm((current) => ({ ...current, insecure: value }))} options={yesNoOptions} />
            </div>
            <div className="col-md-4 mb-3">
              <label className="mb-2">关闭 SNI</label>
              <Select className="w-100" value={Number(form.disable_sni ?? 0)} onChange={(value) => setForm((current) => ({ ...current, disable_sni: value }))} options={yesNoOptions} />
            </div>
            <div className="col-md-6 mb-3">
              <label className="mb-2">UDP Relay Mode</label>
              <Select className="w-100" value={String(form.udp_relay_mode ?? 'native')} onChange={(value) => setForm((current) => ({ ...current, udp_relay_mode: value }))} options={v2nodeTuicUdpRelayModeOptions} />
            </div>
            <div className="col-md-6 mb-3">
              <label className="mb-2">Congestion Control</label>
              <Select className="w-100" value={String(form.congestion_control ?? 'cubic')} onChange={(value) => setForm((current) => ({ ...current, congestion_control: value }))} options={v2nodeTuicCongestionOptions} />
            </div>
            <div className="col-md-4 mb-3">
              <label className="mb-2">0 RTT 握手</label>
              <Select className="w-100" value={Number(form.zero_rtt_handshake ?? 0)} onChange={(value) => setForm((current) => ({ ...current, zero_rtt_handshake: value }))} options={yesNoOptions} />
            </div>
          </>
        )
      case 'vless':
        return (
          <>
            <div className="col-md-4 mb-3">
              <label className="mb-2 d-flex justify-content-between align-items-center">
                <span>TLS</span>
                {Number(form.tls ?? 0) ? (
                  <button
                    type="button"
                    className="v2board-link-button"
                    onClick={() =>
                      openChildDrawer(
                        '编辑安全性配置',
                        'tls_settings',
                        8,
                        getTlsSettingsPlaceholder(form.tls),
                        Number(form.tls ?? 0) === 2 ? 'Reality 留空时由后端补齐密钥' : '留空时使用默认 TLS 配置',
                      )
                    }
                  >
                    编辑配置
                  </button>
                ) : null}
              </label>
              <Select className="w-100" value={Number(form.tls ?? 0)} onChange={(value) => setForm((current) => ({ ...current, tls: value }))} options={[{ value: 0, label: '关闭' }, { value: 1, label: 'TLS' }, { value: 2, label: 'Reality' }]} />
            </div>
            <div className="col-md-4 mb-3">
              <label className="mb-2 d-flex justify-content-between align-items-center">
                <span>传输协议</span>
                <button type="button" className="v2board-link-button" onClick={() => openChildDrawer('编辑协议配置', 'network_settings', 8, getNetworkSettingsPlaceholder(form.network), '留空则使用协议默认模板')}>
                  编辑配置
                </button>
              </label>
              <Select className="w-100" value={form.network as string} onChange={(value) => setForm((current) => ({ ...current, network: value, flow: value === 'tcp' ? current.flow : '' }))} options={vlessNetworkOptions.map((value) => ({ value, label: value }))} />
            </div>
            <div className="col-md-6 mb-3">
              <label className="mb-2 d-flex justify-content-between align-items-center">
                <span>加密方式</span>
                {String(form.encryption ?? '') ? (
                  <button type="button" className="v2board-link-button" onClick={() => openChildDrawer('编辑加密配置', 'encryption_settings', 8, getEncryptionSettingsPlaceholder(form.encryption), '留空时由后端补齐 MLKEM 默认参数')}>
                    编辑配置
                  </button>
                ) : null}
              </label>
              <Select className="w-100" value={String(form.encryption ?? '')} onChange={(value) => setForm((current) => ({ ...current, encryption: value }))} options={[{ value: '', label: '无' }, { value: 'mlkem768x25519plus', label: 'MLKEM768X25519PLUS' }]} />
            </div>
            {String(form.network ?? '') === 'tcp' ? (
              <div className="col-md-6 mb-3">
                <label className="mb-2">XTLS 流控算法</label>
                <Select className="w-100" value={String(form.flow ?? '')} onChange={(value) => setForm((current) => ({ ...current, flow: value }))} options={[{ value: '', label: '无' }, { value: 'xtls-rprx-vision', label: 'xtls-rprx-vision' }]} />
              </div>
            ) : null}
          </>
        )
      case 'anytls':
        return (
          <>
            <div className="col-md-6 mb-3">
              <label className="mb-2">SNI</label>
              <Input value={String(form.server_name ?? '')} onChange={(event) => setForm((current) => ({ ...current, server_name: event.target.value }))} />
            </div>
            <div className="col-md-6 mb-3">
              <label className="mb-2">允许不安全</label>
              <Select className="w-100" value={Number(form.insecure ?? 0)} onChange={(value) => setForm((current) => ({ ...current, insecure: value }))} options={yesNoOptions} />
            </div>
            {renderConfigTrigger('Padding Scheme', 'padding_scheme', '编辑填充方案', 10, anytlsPaddingSchemeTemplate, '留空则使用默认填充方案', 'col-md-12 mb-3')}
          </>
        )
      case 'v2node':
        return (
          <>
            <div className="col-md-4 mb-3">
              <label className="mb-2">协议</label>
              <Select
                className="w-100"
                value={v2nodeProtocol}
                onChange={(value) => setForm((current) => normalizeV2nodeProtocolState(current, value))}
                options={v2nodeProtocolOptions.map((value) => ({ value, label: v2nodeProtocolLabelMap[value] ?? value }))}
              />
            </div>
            <div className="col-md-4 mb-3">
              <label className="mb-2">监听 IP</label>
              <Input value={String(form.listen_ip ?? '')} onChange={(event) => setForm((current) => ({ ...current, listen_ip: event.target.value }))} />
            </div>
            {v2nodeProtocol !== 'shadowsocks' ? (
              <div className="col-md-4 mb-3">
                <label className="mb-2">安全性</label>
                <Select className="w-100" value={Number(form.tls ?? (['hysteria2', 'trojan', 'tuic'].includes(v2nodeProtocol) ? 1 : 0))} onChange={(value) => setForm((current) => ({ ...current, tls: value }))} options={v2nodeTlsOptions} />
              </div>
            ) : null}
            {v2nodeNetworkOptions.length ? (
              <div className="col-md-12 mb-3">
                <label className="mb-2 d-flex justify-content-between align-items-center">
                  <span>传输协议</span>
                  <button type="button" className="v2board-link-button" onClick={() => openChildDrawer('编辑协议配置', 'network_settings', 8, getNetworkSettingsPlaceholder(form.network), '留空则使用协议默认模板')}>
                    编辑配置
                  </button>
                </label>
                <Select
                  className="w-100"
                  value={String(form.network ?? 'tcp')}
                  onChange={(value) => setForm((current) => ({ ...current, network: value, flow: value === 'tcp' ? current.flow : '' }))}
                  options={v2nodeNetworkOptions}
                />
              </div>
            ) : null}
            {v2nodeProtocol === 'anytls' ? renderConfigTrigger('Padding Scheme', 'padding_scheme', '编辑填充方案', 10, anytlsPaddingSchemeTemplate, '留空则使用默认填充方案', 'col-md-12 mb-3') : null}
            {v2nodeProtocol === 'hysteria2' ? (
              <>
                <div className="col-md-6 mb-3">
                  <label className="mb-2">混淆方式 obfs</label>
                  <Select className="w-100" value={String(form.obfs ?? '')} onChange={(value) => setForm((current) => ({ ...current, obfs: value, obfs_password: value === 'salamander' ? current.obfs_password : '' }))} options={[{ value: '', label: '无' }, { value: 'salamander', label: 'salamander' }]} />
                </div>
                {String(form.obfs ?? '') === 'salamander' ? (
                  <div className="col-md-6 mb-3">
                    <label className="mb-2">混淆密码 obfs_password</label>
                    <Input placeholder="留空自动生成" value={String(form.obfs_password ?? '')} onChange={(event) => setForm((current) => ({ ...current, obfs_password: event.target.value }))} />
                  </div>
                ) : null}
                <div className="col-md-6 mb-3">
                  <label className="mb-2">上行带宽</label>
                  <Input placeholder="留空或填 0 使用 BBR" value={String(form.up_mbps ?? '')} suffix="Mbps" onChange={(event) => setForm((current) => ({ ...current, up_mbps: event.target.value }))} />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="mb-2">下行带宽</label>
                  <Input placeholder="留空或填 0 使用 BBR" value={String(form.down_mbps ?? '')} suffix="Mbps" onChange={(event) => setForm((current) => ({ ...current, down_mbps: event.target.value }))} />
                </div>
              </>
            ) : null}
            {v2nodeProtocol === 'tuic' ? (
              <>
                <div className="col-md-6 mb-3">
                  <label className="mb-2">禁用 SNI</label>
                  <Select className="w-100" value={Number(form.disable_sni ?? 0)} onChange={(value) => setForm((current) => ({ ...current, disable_sni: value }))} options={yesNoOptions} />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="mb-2">数据包中继模式</label>
                  <Select className="w-100" value={String(form.udp_relay_mode ?? 'native')} onChange={(value) => setForm((current) => ({ ...current, udp_relay_mode: value }))} options={v2nodeTuicUdpRelayModeOptions} />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="mb-2">拥塞控制算法</label>
                  <Select className="w-100" value={String(form.congestion_control ?? 'cubic')} onChange={(value) => setForm((current) => ({ ...current, congestion_control: value }))} options={v2nodeTuicCongestionOptions} />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="mb-2">客户端启用 0-RTT</label>
                  <Select className="w-100" value={Number(form.zero_rtt_handshake ?? 0)} onChange={(value) => setForm((current) => ({ ...current, zero_rtt_handshake: value }))} options={yesNoOptions} />
                </div>
              </>
            ) : null}
            {v2nodeProtocol === 'shadowsocks' ? (
              <div className="col-md-12 mb-3">
                <label className="mb-2">加密算法</label>
                <Select className="w-100" value={String(form.cipher ?? 'aes-128-gcm')} onChange={(value) => setForm((current) => ({ ...current, cipher: value }))} options={cipherOptions.map((value) => ({ value, label: value }))} />
              </div>
            ) : null}
            {v2nodeProtocol === 'vless' ? (
              <>
                <div className="col-md-12 mb-3">
                  <label className="mb-2 d-flex justify-content-between align-items-center">
                    <span>加密方式</span>
                    {String(form.encryption ?? '') ? (
                      <button type="button" className="v2board-link-button" onClick={() => openChildDrawer('编辑加密配置', 'encryption_settings', 8, getEncryptionSettingsPlaceholder(form.encryption), '留空时由后端补齐 MLKEM 默认参数')}>
                        编辑配置
                      </button>
                    ) : null}
                  </label>
                  <Select className="w-100" value={String(form.encryption ?? '')} onChange={(value) => setForm((current) => ({ ...current, encryption: value }))} options={[{ value: '', label: '无' }, { value: 'mlkem768x25519plus', label: 'MLKEM768X25519PLUS' }]} />
                </div>
                <div className="col-md-12 mb-3">
                  <label className="mb-2">XTLS 流控算法</label>
                  <Select className="w-100" value={String(form.flow ?? '')} onChange={(value) => setForm((current) => ({ ...current, flow: value }))} options={[{ value: '', label: '无' }, ...(String(form.network ?? 'tcp') === 'tcp' ? [{ value: 'xtls-rprx-vision', label: 'xtls-rprx-vision' }] : [])]} />
                </div>
              </>
            ) : null}
            {v2nodeProtocol !== 'shadowsocks' ? renderConfigTrigger('TLS 设置', 'tls_settings', '编辑安全性配置', 8, getTlsSettingsPlaceholder(form.tls), Number(form.tls ?? 0) === 2 ? 'Reality 留空时由后端补齐密钥' : '留空时使用默认 TLS 配置', 'col-md-6 mb-3') : null}
          </>
        )
    }
  }

  return (
    <Drawer
      title={`${record ? '编辑' : '添加'}${typeLabelMap[type]}节点`}
      open={open}
      width="80%"
      className="v2board-editor-drawer v2board-server-editor-drawer"
      destroyOnHidden
      onClose={onCancel}
      footer={
        <div className="v2board-drawer-action">
          <button type="button" className="btn btn-alt-secondary mr-2" onClick={onCancel}>
            取消
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={loading}
            onClick={async () => {
              try {
                const payload: Record<string, unknown> = {
                  ...(record ? { id: record.id } : {}),
                  show: Number(form.show ?? 1),
                  name: String(form.name ?? '').trim(),
                  group_id: asArray(form.group_id),
                  route_id: asArray(form.route_id).length ? asArray(form.route_id) : null,
                  parent_id: parseNullableNumber(form.parent_id),
                  host: String(form.host ?? '').trim(),
                  port: String(form.port ?? '').trim(),
                  server_port: String(form.server_port ?? '').trim(),
                  tags: asArray(form.tags).length ? asArray(form.tags) : null,
                  rate: parseNullableNumber(form.rate),
                }

                if (!payload.name || !payload.host || !payload.port || !payload.server_port || !payload.rate || !(payload.group_id as string[]).length) {
                  message.error('请完整填写节点基础信息')
                  return
                }

                switch (type) {
                  case 'shadowsocks':
                    payload.cipher = form.cipher
                    payload.obfs = String(form.obfs ?? '').trim() || null
                    payload.obfs_settings = parseJsonText('混淆设置', form.obfs_settings)
                    break
                  case 'vmess':
                    payload.tls = Number(form.tls ?? 0)
                    payload.network = form.network
                    payload.networkSettings = parseJsonText('传输设置', form.networkSettings)
                    payload.ruleSettings = parseJsonText('规则设置', form.ruleSettings)
                    payload.tlsSettings = parseJsonText('TLS 设置', form.tlsSettings)
                    payload.dnsSettings = parseJsonText('DNS 设置', form.dnsSettings)
                    break
                  case 'trojan':
                    payload.network = form.network
                    payload.network_settings = parseJsonText('网络设置', form.network_settings)
                    payload.allow_insecure = Number(form.allow_insecure ?? 0)
                    payload.server_name = String(form.server_name ?? '').trim() || null
                    break
                  case 'hysteria':
                    payload.version = Number(form.version ?? 2)
                    payload.up_mbps = parseNullableNumber(form.up_mbps)
                    payload.down_mbps = parseNullableNumber(form.down_mbps)
                    payload.obfs = String(form.obfs ?? '').trim() || null
                    payload.obfs_password = String(form.obfs_password ?? '').trim() || null
                    payload.server_name = String(form.server_name ?? '').trim() || null
                    payload.insecure = Number(form.insecure ?? 0)
                    break
                  case 'tuic':
                    payload.server_name = String(form.server_name ?? '').trim() || null
                    payload.insecure = Number(form.insecure ?? 0)
                    payload.disable_sni = Number(form.disable_sni ?? 0)
                    payload.udp_relay_mode = String(form.udp_relay_mode ?? '').trim() || null
                    payload.zero_rtt_handshake = Number(form.zero_rtt_handshake ?? 0)
                    payload.congestion_control = String(form.congestion_control ?? '').trim() || null
                    break
                  case 'vless':
                    payload.tls = Number(form.tls ?? 0)
                    payload.tls_settings = parseJsonText('TLS 设置', form.tls_settings)
                    payload.flow = String(form.flow ?? '').trim() || null
                    payload.network = form.network
                    payload.network_settings = parseJsonText('传输设置', form.network_settings)
                    payload.encryption = String(form.encryption ?? '').trim() || null
                    payload.encryption_settings = payload.encryption ? parseJsonText('加密设置', form.encryption_settings) : null
                    break
                  case 'anytls':
                    payload.server_name = String(form.server_name ?? '').trim() || null
                    payload.insecure = Number(form.insecure ?? 0)
                    payload.padding_scheme = String(form.padding_scheme ?? '').trim() || null
                    break
                  case 'v2node':
                    payload.listen_ip = String(form.listen_ip ?? '').trim() || null
                    payload.protocol = form.protocol
                    payload.tls = Number(form.tls ?? (['anytls', 'hysteria2', 'trojan', 'tuic'].includes(String(form.protocol ?? '')) ? 1 : 0))
                    payload.tls_settings = String(form.protocol ?? '') === 'shadowsocks' ? null : parseJsonText('TLS 设置', form.tls_settings)
                    payload.network = v2nodeNetworkOptions.length ? form.network : 'tcp'
                    payload.network_settings = v2nodeNetworkOptions.length ? parseJsonText('传输设置', form.network_settings) : null
                    payload.disable_sni = String(form.protocol ?? '') === 'tuic' ? Number(form.disable_sni ?? 0) : 0
                    payload.udp_relay_mode = String(form.protocol ?? '') === 'tuic' ? String(form.udp_relay_mode ?? '').trim() || 'native' : null
                    payload.zero_rtt_handshake = String(form.protocol ?? '') === 'tuic' ? Number(form.zero_rtt_handshake ?? 0) : 0
                    payload.congestion_control = String(form.protocol ?? '') === 'tuic' ? String(form.congestion_control ?? '').trim() || 'cubic' : null
                    payload.cipher = String(form.protocol ?? '') === 'shadowsocks' ? String(form.cipher ?? '').trim() || 'aes-128-gcm' : null
                    payload.up_mbps = String(form.protocol ?? '') === 'hysteria2' ? parseNullableNumber(form.up_mbps) : null
                    payload.down_mbps = String(form.protocol ?? '') === 'hysteria2' ? parseNullableNumber(form.down_mbps) : null
                    payload.obfs = String(form.protocol ?? '') === 'hysteria2' ? String(form.obfs ?? '').trim() || null : null
                    payload.obfs_password = String(form.protocol ?? '') === 'hysteria2' ? String(form.obfs_password ?? '').trim() || null : null
                    payload.padding_scheme = String(form.protocol ?? '') === 'anytls' ? String(form.padding_scheme ?? '').trim() || null : null
                    payload.encryption = String(form.protocol ?? '') === 'vless' ? String(form.encryption ?? '').trim() || null : null
                    payload.encryption_settings = payload.encryption ? parseJsonText('加密设置', form.encryption_settings) : null
                    payload.flow = String(form.protocol ?? '') === 'vless' ? String(form.flow ?? '').trim() || null : null
                    break
                }

                await onSubmit(type, payload)
              } catch (error) {
                message.error(error instanceof Error ? error.message : '保存失败')
              }
            }}
          >
            {loading ? '提交中...' : '提交'}
          </button>
        </div>
      }
    >
      <div className="v2board-editor-form">
        <div className="v2board-editor-section">
          <div className="v2board-editor-section-title">基础信息</div>
          <div className="row">
            <div className="col-md-4 mb-3">
              <label className="mb-2">显示</label>
              <Select className="w-100" value={Number(form.show ?? 1)} onChange={(value) => setForm((current) => ({ ...current, show: value }))} options={displayOptions} />
            </div>
            <div className="col-md-8 mb-3">
              <label className="mb-2">节点名称</label>
              <Input value={String(form.name ?? '')} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </div>

            <div className="col-md-6 mb-3">
              <label className="mb-2">权限组</label>
              <Select mode="multiple" className="w-100" value={asArray(form.group_id)} onChange={(value) => setForm((current) => ({ ...current, group_id: value }))} options={groups.map((group) => ({ value: String(group.id), label: group.name }))} />
            </div>
            <div className="col-md-6 mb-3">
              <label className="mb-2">路由组</label>
              <Select mode="multiple" className="w-100" value={asArray(form.route_id)} onChange={(value) => setForm((current) => ({ ...current, route_id: value }))} options={routes.map((route) => ({ value: String(route.id), label: route.remarks }))} />
            </div>

            <div className="col-md-4 mb-3">
              <label className="mb-2">父节点</label>
              <Select allowClear className="w-100" value={form.parent_id as number | undefined} onChange={(value) => setForm((current) => ({ ...current, parent_id: value }))} options={parentOptions} />
            </div>
            <div className="col-md-4 mb-3">
              <label className="mb-2">地址</label>
              <Input value={String(form.host ?? '')} onChange={(event) => setForm((current) => ({ ...current, host: event.target.value }))} />
            </div>
            <div className="col-md-2 mb-3">
              <label className="mb-2">端口</label>
              <Input value={String(form.port ?? '')} onChange={(event) => setForm((current) => ({ ...current, port: event.target.value }))} />
            </div>
            <div className="col-md-2 mb-0">
              <label className="mb-2">后端端口</label>
              <Input value={String(form.server_port ?? '')} onChange={(event) => setForm((current) => ({ ...current, server_port: event.target.value }))} />
            </div>
          </div>
        </div>

        <div className="v2board-editor-section">
          <div className="v2board-editor-section-title">标签与倍率</div>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="mb-2">标签</label>
              <Select mode="tags" className="w-100" value={asArray(form.tags)} onChange={(value) => setForm((current) => ({ ...current, tags: value }))} />
            </div>
            <div className="col-md-6 mb-0">
              <label className="mb-2">倍率</label>
              <Input value={String(form.rate ?? '1')} onChange={(event) => setForm((current) => ({ ...current, rate: event.target.value }))} />
            </div>
          </div>
        </div>

        <div className="v2board-editor-section mb-0">
          <div className="v2board-editor-section-title">协议配置</div>
          <div className="row">{renderTypeFields()}</div>
        </div>
      </div>
      <Drawer
        closable={false}
        destroyOnHidden
        open={childDrawer.open}
        width="80%"
        className="v2board-editor-drawer v2board-editor-drawer-child v2board-server-editor-drawer"
        title={childDrawer.title}
        onClose={closeChildDrawer}
      >
        <div className="v2board-editor-form">
          <div className="v2board-editor-section mb-0">
            {childDrawer.description ? <div className="v2board-editor-inline-note">{childDrawer.description}</div> : null}
            <div className="form-group mb-0">
              <Input.TextArea
                rows={childDrawer.rows ?? 8}
                placeholder={childDrawer.placeholder}
                value={String(form[childDrawer.field] ?? '')}
                onChange={(event) => setForm((current) => ({ ...current, [childDrawer.field]: event.target.value }))}
              />
            </div>
          </div>
        </div>
      </Drawer>
    </Drawer>
  )
}

export function ServerManagePage() {
  const [loading, setLoading] = useState(true)
  const [servers, setServers] = useState<AdminServerNode[]>([])
  const [groups, setGroups] = useState<ServerGroup[]>([])
  const [routes, setRoutes] = useState<ServerRoute[]>([])
  const [searchKey, setSearchKey] = useState('')
  const [sortMode, setSortMode] = useState(false)
  const [pageSize, setPageSize] = useState(getPageSize())
  const [currentPage, setCurrentPage] = useState(1)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [detailRecord, setDetailRecord] = useState<AdminServerNode | null>(null)
  const [editorType, setEditorType] = useState<ServerType | null>(null)
  const [editorRecord, setEditorRecord] = useState<AdminServerNode | null>(null)
  const [editorLoading, setEditorLoading] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [serverResult, groupResult, routeResult] = await Promise.allSettled([
        getAdminServerNodes(),
        getServerGroups(),
        getServerRoutes(),
      ])
      if (serverResult.status === 'fulfilled') {
        setServers(serverResult.value)
        setSortMode(false)
      }
      if (groupResult.status === 'fulfilled') {
        setGroups(groupResult.value)
      }
      if (routeResult.status === 'fulfilled') {
        setRoutes(routeResult.value)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredServers = useMemo(() => {
    if (!searchKey.trim()) return servers
    return servers.filter((server) => JSON.stringify(server).includes(searchKey))
  }, [searchKey, servers])

  const pagedServers = useMemo(() => {
    if (sortMode) return filteredServers
    const start = (currentPage - 1) * pageSize
    return filteredServers.slice(start, start + pageSize)
  }, [currentPage, filteredServers, pageSize, sortMode])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredServers.length / pageSize)), [filteredServers.length, pageSize])

  const createMenuItems: MenuProps['items'] = serverTypeOptions.map((item) => ({
    key: item.value,
    label: (
      <span>
        <Tag color={item.color}>{item.label}</Tag>
      </span>
    ),
    onClick: () => {
      setEditorType(item.value)
      setEditorRecord(null)
    },
  }))

  return (
    <>
      <div className="block border-bottom v2board-server-page">
        <div className="bg-white">
          <div className="v2board-table-action v2board-list-toolbar p-3">
            <div className="v2board-list-toolbar-left">
              <Dropdown trigger={['click']} menu={{ items: createMenuItems }}>
                <button type="button" className="btn btn-sm btn-alt-primary v2board-toolbar-icon" title="添加节点">
                  <i className="fa fa-plus" />
                </button>
              </Dropdown>

              <Input
                className="ml-2 mt-2 mt-md-0"
                placeholder="输入任意关键词搜索"
                style={{ width: 200 }}
                value={searchKey}
                onChange={(event) => {
                  setCurrentPage(1)
                  setSearchKey(event.target.value)
                }}
              />
            </div>

            <div className="v2board-list-toolbar-right">
              <button
                type="button"
                className={`btn btn-sm mt-2 mt-md-0 ${sortMode ? 'btn-primary' : 'btn-alt-primary'}`}
                onClick={async () => {
                  if (sortMode) {
                    const payload: Record<string, Record<number, number>> = {}
                    servers.forEach((server, index) => {
                      if (!payload[server.type]) payload[server.type] = {}
                      payload[server.type][server.id] = index
                    })
                    await sortAdminServerNodes(payload)
                    message.success('排序已保存')
                    await loadData()
                    return
                  }
                  setSortMode(true)
                }}
              >
                {sortMode ? '保存排序' : '编辑排序'}
              </button>
            </div>
          </div>
        </div>

        <div className="block-content p-0">
          <div className="table-responsive">
            <table className="table table-striped table-vcenter mb-0">
              <thead>
                <tr>
                  {sortMode ? <th style={{ width: 100 }}>排序</th> : null}
                  <th style={{ width: 140 }}>节点 ID</th>
                  {!sortMode ? <th style={{ width: 78 }}>显隐</th> : null}
                  <th>节点</th>
                  {!sortMode ? <th style={{ width: 220 }}>地址</th> : null}
                  {!sortMode ? <th style={{ width: 88 }}>人数</th> : null}
                  {!sortMode ? <th style={{ width: 88 }}>倍率</th> : null}
                  {!sortMode ? <th style={{ width: 170 }}>权限组</th> : null}
                  {!sortMode ? <th className="text-right" style={{ width: 110 }}>操作</th> : null}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={sortMode ? 3 : 8} className="text-center py-4 v2board-table-loading-row">
                      <div className="spinner-grow text-primary" role="status">
                        <span className="sr-only">Loading...</span>
                      </div>
                    </td>
                  </tr>
                ) : pagedServers.length ? (
                  pagedServers.map((server, index) => {
                    const menuItems: MenuProps['items'] = [
                      {
                        key: 'edit',
                        label: <span><i className="fa fa-pencil mr-2" />编辑</span>,
                        onClick: () => {
                          setEditorType(server.type as ServerType)
                          setEditorRecord(server)
                        },
                      },
                      {
                        key: 'detail',
                        label: <span><i className="fa fa-file-text-o mr-2" />详情</span>,
                        onClick: () => setDetailRecord(server),
                      },
                      {
                        key: 'copy',
                        label: <span><i className="fa fa-copy mr-2" />复制</span>,
                        onClick: async () => {
                          await copyAdminServerNode(server.type, server.id)
                          message.success('节点已复制')
                          await loadData()
                        },
                      },
                      {
                        key: 'delete',
                        label: <span className="text-danger"><i className="fa fa-trash mr-2" />删除</span>,
                        onClick: () =>
                          Modal.confirm({
                            title: '删除节点',
                            content: '确定删除该节点吗？',
                            onOk: async () => {
                              await deleteAdminServerNode(server.type, server.id)
                              message.success('节点已删除')
                              await loadData()
                            },
                          }),
                      },
                    ]

                    return (
                      <tr
                        key={`${server.type}-${server.id}`}
                        draggable={sortMode}
                        className={dragIndex === index ? 'v2board-drag-row' : server.parent_id ? 'child_node' : ''}
                        onDragStart={() => sortMode && setDragIndex(index)}
                        onDragOver={(event) => sortMode && event.preventDefault()}
                        onDragEnd={() => setDragIndex(null)}
                        onDrop={() => {
                          if (!sortMode || dragIndex === null || dragIndex === index) return
                          const next = [...servers]
                          const absoluteTargetIndex = servers.findIndex((item) => item.type === server.type && item.id === server.id)
                          const visibleCurrent = pagedServers[dragIndex]
                          const absoluteDragIndex = servers.findIndex((item) => item.type === visibleCurrent.type && item.id === visibleCurrent.id)
                          const [moved] = next.splice(absoluteDragIndex, 1)
                          next.splice(absoluteTargetIndex, 0, moved)
                          setServers(next)
                          setDragIndex(null)
                        }}
                      >
                        {sortMode ? (
                          <td>
                            <i className="fa fa-bars text-muted v2board-drag-handle mr-2" />
                          </td>
                        ) : null}
                        <td>
                          <Tag color={typeColorMap[server.type as ServerType]}>
                            {server.parent_id ? `${server.id} => ${server.parent_id}` : server.id}
                          </Tag>
                        </td>
                        {!sortMode ? (
                          <td>
                            <label className="css-control css-control-sm css-switch mb-0 v2board-server-switch">
                              <input
                                type="checkbox"
                                className="css-control-input"
                                checked={Boolean(Number(server.show))}
                                onChange={async () => {
                                  await updateAdminServerNode(server.type, server.id, {
                                    show: Number(server.show) ? 0 : 1,
                                  })
                                  await loadData()
                                }}
                              />
                              <span className="css-control-indicator" />
                            </label>
                          </td>
                        ) : null}
                        <td>
                          {!sortMode ? (
                            <div className="v2board-server-name-cell">
                              <Tag color={statusColorMap[server.available_status ?? 1]}>
                                {server.available_status === 0 ? '未运行' : server.available_status === 1 ? '异常/空闲' : '正常'}
                              </Tag>
                              <span>{server.name}</span>
                            </div>
                          ) : (
                            server.name
                          )}
                        </td>
                        {!sortMode ? (
                          <td>
                            <button
                              type="button"
                              className="v2board-link-button"
                              onClick={async () => {
                                await navigator.clipboard.writeText(`${server.host}:${server.port}`)
                                message.success('复制成功')
                              }}
                            >
                              {server.host}:{server.port}
                            </button>
                          </td>
                        ) : null}
                        {!sortMode ? (
                          <td>
                            <i className="fa fa-user mr-1" />
                            {server.online ?? 0}
                          </td>
                        ) : null}
                        {!sortMode ? <td><Tag>{server.rate} x</Tag></td> : null}
                        {!sortMode ? (
                          <td className="v2board-server-group-cell">
                            {(server.group_id ?? []).map((groupId) => {
                              const group = groups.find((item) => item.id === Number(groupId))
                              return <Tag key={`${server.id}-${groupId}`}>{group?.name ?? groupId}</Tag>
                            })}
                          </td>
                        ) : null}
                        {!sortMode ? (
                          <td className="text-right">
                            <Dropdown trigger={['click']} menu={{ items: menuItems }}>
                              <button type="button" className="v2board-link-button v2board-dropdown-trigger v2board-row-action">
                                <span>操作</span>
                                <i className="fa fa-caret-down" />
                              </button>
                            </Dropdown>
                          </td>
                        ) : null}
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={sortMode ? 3 : 8} className="text-center text-muted py-4 v2board-list-empty">
                      暂无节点
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {!sortMode ? (
            <div className="d-flex justify-content-between align-items-center px-3 py-3 border-top v2board-list-pagination">
              <div className="v2board-pagination-tools">
                <span className="text-muted">共 {filteredServers.length} 条</span>
                <select
                  className="form-control form-control-sm"
                  value={pageSize}
                  style={{ width: 100 }}
                  onChange={(event) => {
                    const next = Number(event.target.value)
                    setPageSize(next)
                    setCurrentPage(1)
                    localStorage.setItem('server_manage_page_size', String(next))
                  }}
                >
                  {[10, 50, 100, 500].map((size) => (
                    <option key={size} value={size}>
                      {size} / 页
                    </option>
                  ))}
                </select>
              </div>
              <div className="v2board-pagination-tools">
                <button type="button" className="btn btn-sm btn-alt-secondary mr-2" disabled={currentPage <= 1} onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}>
                  上一页
                </button>
                <span className="text-muted mr-2">
                  {currentPage} / {totalPages}
                </span>
                <button type="button" className="btn btn-sm btn-alt-secondary" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))}>
                  下一页
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <ServerDetailModal open={detailRecord !== null} record={detailRecord} onCancel={() => setDetailRecord(null)} />
      <ServerEditorModal
        open={editorType !== null}
        type={editorType}
        record={editorRecord}
        groups={groups}
        routes={routes}
        nodes={servers}
        loading={editorLoading}
        onCancel={() => {
          setEditorType(null)
          setEditorRecord(null)
        }}
        onSubmit={async (type, payload) => {
          setEditorLoading(true)
          try {
            await saveAdminServerNode(type, payload)
            message.success(editorRecord ? '节点已保存' : '节点已创建')
            setEditorType(null)
            setEditorRecord(null)
            await loadData()
          } finally {
            setEditorLoading(false)
          }
        }}
      />
    </>
  )
}
