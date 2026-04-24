import { apiClient, type ApiEnvelope } from '@/api/client'
import { appConfig } from '@/config/app'

export interface OverviewStats {
  online_user: number
  month_income: number
  month_register_total: number
  day_register_total: number
  ticket_pending_total: number
  commission_pending_total: number
  day_income: number
  last_month_income: number
  commission_month_payout: number
  commission_last_month_payout: number
}

export interface SiteConfigResponse {
  site?: {
    currency?: string
    currency_symbol?: string
  }
}

export interface OrderStatItem {
  type: string
  date: string
  value: number
}

export interface ServerRankItem {
  server_name?: string
  total: number
  u?: number
  d?: number
  [key: string]: unknown
}

export interface UserRankItem {
  email?: string
  total: number
  user_id?: number
  [key: string]: unknown
}

export interface QueueStats {
  failedJobs?: number
  jobsPerMinute?: number
  pausedMasters?: number
  processes?: number
  recentJobs?: number
  status?: boolean
  queueWithMaxRuntime?: string | null
  queueWithMaxThroughput?: string | null
  wait?: Array<Record<string, unknown>>
}

export interface AdminPlan {
  id: number
  name: string
  content?: string | null
  show?: number
  renew?: number
  transfer_enable?: number | null
  device_limit?: number | null
  group_id?: number | null
  month_price?: number | null
  quarter_price?: number | null
  half_year_price?: number | null
  year_price?: number | null
  two_year_price?: number | null
  three_year_price?: number | null
  onetime_price?: number | null
  reset_price?: number | null
  reset_traffic_method?: number | null
  capacity_limit?: number | null
  speed_limit?: number | null
  sort?: number
  count?: number
  [key: string]: unknown
}

export interface ServerGroup {
  id: number
  name: string
  user_count?: number
  server_count?: number
  [key: string]: unknown
}

export interface ServerRoute {
  id: number
  remarks: string
  match: string[] | string
  action: string
  action_value?: string | null
  [key: string]: unknown
}

export interface AdminServerNode {
  id: number
  type: string
  show: number
  name: string
  host: string
  port: number | string
  rate: number
  group_id: Array<number | string>
  parent_id?: number | null
  online?: number
  available_status?: number
  sort?: number
  [key: string]: unknown
}

export interface PaymentConfigField {
  label: string
  description?: string
  type?: string
  value?: string
}

export interface AdminThemeField {
  label: string
  placeholder?: string
  field_name: string
  field_type: 'select' | 'input' | 'textarea'
  select_options?: Record<string, string>
  default_value?: string
}

export interface AdminThemeMeta {
  name: string
  description?: string
  version?: string
  images?: string
  configs: AdminThemeField[]
}

export interface AdminThemesResponse {
  themes: Record<string, AdminThemeMeta>
  active?: string
}

export interface AdminNotice {
  id: number
  show: number
  title: string
  content: string
  img_url?: string | null
  tags?: string[] | null
  updated_at: number
  created_at: number
  [key: string]: unknown
}

export interface AdminKnowledgeSummary {
  id: number
  show: number
  title: string
  category: string
  updated_at: number
  [key: string]: unknown
}

export interface AdminKnowledgeDetail extends AdminKnowledgeSummary {
  language: string
  body: string
}

export interface AdminPayment {
  id: number
  enable: number
  name: string
  icon?: string | null
  payment: string
  notify_domain?: string | null
  notify_url?: string
  handling_fee_percent?: number | null
  handling_fee_fixed?: number | null
  config?: Record<string, string>
  sort?: number
  [key: string]: unknown
}

export interface EmailTemplateItem extends String {}

export interface TicketSummary {
  id: number
  user_id: number
  subject: string
  level: number
  status: number
  reply_status: number
  created_at: number
  updated_at: number
  [key: string]: unknown
}

export interface TicketMessage {
  id: number
  ticket_id: number
  user_id: number
  message: string
  created_at: number
  is_me?: boolean
  [key: string]: unknown
}

export interface TicketDetail extends TicketSummary {
  message: TicketMessage[]
}

export interface AdminUser {
  id: number
  email: string
  banned: number
  password?: string
  invite_user_id?: number | null
  invite_user_email?: string
  plan_id: number | null
  plan_name?: string
  group_id: number | null
  u?: number
  d?: number
  total_used: number
  transfer_enable: number
  alive_ip?: number
  device_limit?: number | null
  ips?: string
  expired_at: number | null
  balance: number
  discount?: number | null
  commission_type?: number
  commission_rate?: number | null
  commission_balance: number
  is_admin?: number
  is_staff?: number
  remarks?: string | null
  speed_limit?: number | null
  created_at: number
  t?: number
  token?: string
  uuid?: string
  subscribe_url?: string
  [key: string]: unknown
}

export interface AdminCoupon {
  id: number
  show: number
  name: string
  type: number
  value: number
  code: string
  limit_use: number | null
  limit_use_with_user?: number | null
  limit_plan_ids?: string[] | null
  limit_period?: string[] | null
  started_at: number
  ended_at: number
  [key: string]: unknown
}

export interface AdminGiftcard {
  id: number
  name: string
  type: number
  value: number
  plan_id?: number | null
  code: string
  limit_use: number | null
  started_at: number
  ended_at: number
  [key: string]: unknown
}

export interface AdminUserProfile {
  id: number
  email: string
  invite_user_id?: number | null
  [key: string]: unknown
}

export interface AdminUserDetail extends AdminUser {
  invite_user?: AdminUserProfile | null
}

export interface AdminStatUserRecord {
  id: number
  user_id: number
  record_at: number
  record_type?: string
  server_rate: number
  u: number
  d: number
  created_at?: number
  updated_at?: number
  [key: string]: unknown
}

export interface CommissionLogItem {
  id: number
  trade_no: string
  user_id: number
  get_amount: number
  created_at: number
  updated_at: number
  [key: string]: unknown
}

export interface AdminOrder {
  id: number
  user_id: number
  invite_user_id?: number | null
  plan_id: number | null
  trade_no: string
  type: number
  period: string
  status: number
  total_amount: number
  balance_amount?: number
  discount_amount?: number
  refund_amount?: number
  surplus_amount?: number
  commission_balance?: number
  actual_commission_balance?: number | null
  commission_status?: number
  callback_no?: string | null
  plan_name?: string
  created_at: number
  updated_at: number
  [key: string]: unknown
}

export interface AdminOrderDetail extends AdminOrder {
  commission_log?: CommissionLogItem[]
  surplus_order_ids?: number[] | null
  surplus_orders?: AdminOrder[]
}

export async function getAdminOverview() {
  const response = await apiClient.get<ApiEnvelope<OverviewStats>>(`/${appConfig.securePath}/stat/getOverride`)
  return response.data.data
}

export async function getSiteConfig() {
  const response = await apiClient.get<ApiEnvelope<SiteConfigResponse>>(`/${appConfig.securePath}/config/fetch`)
  return response.data.data
}

export async function getAdminPayments() {
  const response = await apiClient.get<ApiEnvelope<AdminPayment[]>>(`/${appConfig.securePath}/payment/fetch`)
  return response.data.data
}

export async function getAdminThemes() {
  const response = await apiClient.get<ApiEnvelope<AdminThemesResponse>>(`/${appConfig.securePath}/theme/getThemes`)
  return response.data.data
}

export async function getAdminThemeConfig(name: string) {
  const response = await apiClient.post<ApiEnvelope<Record<string, string>>>(
    `/${appConfig.securePath}/theme/getThemeConfig`,
    { name },
  )
  return response.data.data
}

export async function saveAdminThemeConfig(name: string, configBase64: string) {
  const response = await apiClient.post<ApiEnvelope<Record<string, string>>>(
    `/${appConfig.securePath}/theme/saveThemeConfig`,
    { name, config: configBase64 },
  )
  return response.data.data
}

export async function getAdminNotices() {
  const response = await apiClient.get<ApiEnvelope<AdminNotice[]>>(`/${appConfig.securePath}/notice/fetch`)
  return response.data.data
}

export async function saveAdminNotice(payload: Record<string, unknown>) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/notice/save`, payload)
  return response.data.data
}

export async function deleteAdminNotice(id: number) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/notice/drop`, { id })
  return response.data.data
}

export async function toggleAdminNotice(id: number) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/notice/show`, { id })
  return response.data.data
}

export async function getAdminKnowledges() {
  const response = await apiClient.get<ApiEnvelope<AdminKnowledgeSummary[]>>(`/${appConfig.securePath}/knowledge/fetch`)
  return response.data.data
}

export async function getAdminKnowledgeById(id: number) {
  const response = await apiClient.get<ApiEnvelope<AdminKnowledgeDetail>>(`/${appConfig.securePath}/knowledge/fetch`, {
    params: { id },
  })
  return response.data.data
}

export async function getAdminKnowledgeCategories() {
  const response = await apiClient.get<ApiEnvelope<string[]>>(`/${appConfig.securePath}/knowledge/getCategory`)
  return response.data.data
}

export async function saveAdminKnowledge(payload: Record<string, unknown>) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/knowledge/save`, payload)
  return response.data.data
}

export async function deleteAdminKnowledge(id: number) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/knowledge/drop`, { id })
  return response.data.data
}

export async function toggleAdminKnowledge(id: number) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/knowledge/show`, { id })
  return response.data.data
}

export async function sortAdminKnowledge(knowledgeIds: number[]) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/knowledge/sort`, {
    knowledge_ids: knowledgeIds,
  })
  return response.data.data
}

export async function getPaymentMethods() {
  const response = await apiClient.get<ApiEnvelope<string[]>>(`/${appConfig.securePath}/payment/getPaymentMethods`)
  return response.data.data
}

export async function getPaymentForm(payment: string, id?: number) {
  const response = await apiClient.post<ApiEnvelope<Record<string, PaymentConfigField>>>(
    `/${appConfig.securePath}/payment/getPaymentForm`,
    {
      payment,
      id,
    },
  )
  return response.data.data
}

export async function saveAdminPayment(payload: Record<string, unknown>) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/payment/save`, payload)
  return response.data.data
}

export async function toggleAdminPayment(id: number) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/payment/show`, { id })
  return response.data.data
}

export async function deleteAdminPayment(id: number) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/payment/drop`, { id })
  return response.data.data
}

export async function sortAdminPayments(ids: number[]) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/payment/sort`, { ids })
  return response.data.data
}

export async function getOrderStats() {
  const response = await apiClient.get<ApiEnvelope<OrderStatItem[]>>(`/${appConfig.securePath}/stat/getOrder`)
  return response.data.data
}

export async function getServerTodayRank() {
  const response = await apiClient.get<ApiEnvelope<ServerRankItem[]>>(`/${appConfig.securePath}/stat/getServerTodayRank`)
  return response.data.data
}

export async function getServerLastRank() {
  const response = await apiClient.get<ApiEnvelope<ServerRankItem[]>>(`/${appConfig.securePath}/stat/getServerLastRank`)
  return response.data.data
}

export async function getUserTodayRank() {
  const response = await apiClient.get<ApiEnvelope<UserRankItem[]>>(`/${appConfig.securePath}/stat/getUserTodayRank`)
  return response.data.data
}

export async function getUserLastRank() {
  const response = await apiClient.get<ApiEnvelope<UserRankItem[]>>(`/${appConfig.securePath}/stat/getUserLastRank`)
  return response.data.data
}

export async function getQueueStats() {
  const response = await apiClient.get<ApiEnvelope<QueueStats>>(`/${appConfig.securePath}/system/getQueueStats`)
  return response.data.data
}

export async function getQueueWorkload() {
  const response = await apiClient.get<ApiEnvelope<Array<Record<string, unknown>>>>(
    `/${appConfig.securePath}/system/getQueueWorkload`,
  )
  return response.data.data
}

export async function getQueueMonitorStatus() {
  const origin = new URL(appConfig.apiBase).origin
  const response = await fetch(`${origin}/monitor/api/stats`, { credentials: 'include' })
  if (!response.ok) {
    throw new Error('Failed to fetch queue monitor status')
  }
  return response.json() as Promise<{ status?: string }>
}

export async function getAdminPlans() {
  const response = await apiClient.get<ApiEnvelope<AdminPlan[]>>(`/${appConfig.securePath}/plan/fetch`)
  return response.data.data
}

export async function saveAdminPlan(payload: Record<string, unknown>) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/plan/save`, payload)
  return response.data.data
}

export async function updateAdminPlan(id: number, payload: { show?: number; renew?: number }) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/plan/update`, {
    id,
    ...payload,
  })
  return response.data.data
}

export async function deleteAdminPlan(id: number) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/plan/drop`, { id })
  return response.data.data
}

export async function sortAdminPlans(planIds: number[]) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/plan/sort`, {
    plan_ids: planIds,
  })
  return response.data.data
}

export async function getEmailTemplates() {
  const response = await apiClient.get<ApiEnvelope<string[]>>(`/${appConfig.securePath}/config/getEmailTemplate`)
  return response.data.data
}

export async function saveAdminConfig(payload: Record<string, unknown>) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/config/save`, payload)
  return response.data.data
}

export async function testSendMail() {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/config/testSendMail`)
  return response.data.data
}

export async function setTelegramWebhook() {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/config/setTelegramWebhook`)
  return response.data.data
}

export async function getServerGroups() {
  const response = await apiClient.get<ApiEnvelope<ServerGroup[]>>(`/${appConfig.securePath}/server/group/fetch`)
  return response.data.data
}

export async function saveServerGroup(payload: Record<string, unknown>) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/server/group/save`, payload)
  return response.data.data
}

export async function deleteServerGroup(id: number) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/server/group/drop`, { id })
  return response.data.data
}

export async function getServerRoutes() {
  const response = await apiClient.get<ApiEnvelope<ServerRoute[]>>(`/${appConfig.securePath}/server/route/fetch`)
  return response.data.data
}

export async function saveServerRoute(payload: Record<string, unknown>) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/server/route/save`, payload)
  return response.data.data
}

export async function deleteServerRoute(id: number) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/server/route/drop`, { id })
  return response.data.data
}

export async function getAdminServerNodes() {
  const response = await apiClient.get<ApiEnvelope<AdminServerNode[]>>(`/${appConfig.securePath}/server/manage/getNodes`)
  return response.data.data
}

export async function saveAdminServerNode(type: string, payload: Record<string, unknown>) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/server/${type}/save`, payload)
  return response.data.data
}

export async function updateAdminServerNode(type: string, id: number, payload: Record<string, unknown>) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/server/${type}/update`, {
    id,
    ...payload,
  })
  return response.data.data
}

export async function copyAdminServerNode(type: string, id: number) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/server/${type}/copy`, { id })
  return response.data.data
}

export async function deleteAdminServerNode(type: string, id: number) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/server/${type}/drop`, { id })
  return response.data.data
}

export async function sortAdminServerNodes(payload: Record<string, Record<number, number>>) {
  const formData = new FormData()

  Object.entries(payload).forEach(([type, entries]) => {
    Object.entries(entries).forEach(([id, sort]) => {
      formData.append(`${type}[${id}]`, String(sort))
    })
  })

  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/server/manage/sort`, formData)
  return response.data.data
}

export async function getTickets(params?: Record<string, unknown>) {
  const response = await apiClient.get<ApiEnvelope<TicketSummary[]> & { total?: number }>(
    `/${appConfig.securePath}/ticket/fetch`,
    { params },
  )
  return {
    data: response.data.data,
    total: response.data.total ?? 0,
  }
}

export async function getTicketDetail(id: number) {
  const response = await apiClient.get<ApiEnvelope<TicketDetail>>(`/${appConfig.securePath}/ticket/fetch`, {
    params: { id },
  })
  return response.data.data
}

export async function closeTicket(id: number) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/ticket/close`, { id })
  return response.data.data
}

export async function replyTicket(id: number, message: string) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/ticket/reply`, {
    id,
    message,
  })
  return response.data.data
}

export async function getAdminUsers(params?: {
  current?: number
  pageSize?: number
  sort?: string
  sort_type?: 'ASC' | 'DESC'
  filter?: Array<{ key: string; condition: string; value: unknown }>
}) {
  const response = await apiClient.get<ApiEnvelope<AdminUser[]> & { total?: number }>(
    `/${appConfig.securePath}/user/fetch`,
    {
      params,
    },
  )
  return {
    data: response.data.data,
    total: response.data.total ?? 0,
  }
}

export async function getAdminCoupons(params?: {
  current?: number
  pageSize?: number
  sort?: string
  sort_type?: 'ASC' | 'DESC'
}) {
  const response = await apiClient.get<ApiEnvelope<AdminCoupon[]> & { total?: number }>(
    `/${appConfig.securePath}/coupon/fetch`,
    { params },
  )
  return {
    data: response.data.data,
    total: response.data.total ?? 0,
  }
}

export async function generateAdminCoupon(payload: Record<string, unknown>) {
  if (payload.generate_count) {
    const response = await apiClient.post<ArrayBuffer>(`/${appConfig.securePath}/coupon/generate`, payload, {
      responseType: 'arraybuffer',
    })
    return response.data
  }

  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/coupon/generate`, payload)
  return response.data.data
}

export async function deleteAdminCoupon(id: number) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/coupon/drop`, { id })
  return response.data.data
}

export async function toggleAdminCoupon(id: number) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/coupon/show`, { id })
  return response.data.data
}

export async function getAdminGiftcards(params?: {
  current?: number
  pageSize?: number
  sort?: string
  sort_type?: 'ASC' | 'DESC'
}) {
  const response = await apiClient.get<ApiEnvelope<AdminGiftcard[]> & { total?: number }>(
    `/${appConfig.securePath}/giftcard/fetch`,
    { params },
  )
  return {
    data: response.data.data,
    total: response.data.total ?? 0,
  }
}

export async function generateAdminGiftcard(payload: Record<string, unknown>) {
  if (payload.generate_count) {
    const response = await apiClient.post<ArrayBuffer>(`/${appConfig.securePath}/giftcard/generate`, payload, {
      responseType: 'arraybuffer',
    })
    return response.data
  }

  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/giftcard/generate`, payload)
  return response.data.data
}

export async function deleteAdminGiftcard(id: number) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/giftcard/drop`, { id })
  return response.data.data
}

export async function resetAdminUserSecret(id: number) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/user/resetSecret`, { id })
  return response.data.data
}

export async function deleteAdminUser(id: number) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/user/delUser`, { id })
  return response.data.data
}

export async function getAdminUserInfoById(id: number) {
  const response = await apiClient.get<ApiEnvelope<AdminUserDetail>>(
    `/${appConfig.securePath}/user/getUserInfoById`,
    {
      params: { id },
    },
  )
  return response.data.data
}

export async function updateAdminUser(payload: Record<string, unknown>) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/user/update`, payload)
  return response.data.data
}

export async function generateAdminUser(payload: Record<string, unknown>) {
  if (payload.generate_count) {
    const response = await apiClient.post<ArrayBuffer>(`/${appConfig.securePath}/user/generate`, payload, {
      responseType: 'arraybuffer',
    })
    return response.data
  }

  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/user/generate`, payload)
  return response.data.data
}

export async function dumpAdminUsersCsv(params: {
  filter?: Array<{ key: string; condition: string; value: unknown }>
}) {
  const response = await apiClient.post<ArrayBuffer>(`/${appConfig.securePath}/user/dumpCSV`, params, {
    responseType: 'arraybuffer',
  })
  return response.data
}

export async function sendAdminUserMail(payload: {
  subject: string
  content: string
  filter?: Array<{ key: string; condition: string; value: unknown }>
  sort?: string
  sort_type?: 'ASC' | 'DESC'
}) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/user/sendMail`, payload)
  return response.data.data
}

export async function bulkBanAdminUsers(params: {
  filter?: Array<{ key: string; condition: string; value: unknown }>
  sort?: string
  sort_type?: 'ASC' | 'DESC'
}) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/user/ban`, params)
  return response.data.data
}

export async function bulkDeleteAdminUsers(params: {
  filter?: Array<{ key: string; condition: string; value: unknown }>
  sort?: string
  sort_type?: 'ASC' | 'DESC'
}) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/user/allDel`, params)
  return response.data.data
}

export async function getAdminStatUser(params: {
  user_id: number
  current?: number
  pageSize?: number
}) {
  const response = await apiClient.get<ApiEnvelope<AdminStatUserRecord[]> & { total?: number }>(
    `/${appConfig.securePath}/stat/getStatUser`,
    {
      params,
    },
  )
  return {
    data: response.data.data,
    total: response.data.total ?? 0,
  }
}

export async function getOrders(params?: {
  current?: number
  pageSize?: number
  is_commission?: number
  filter?: Array<{ key: string; condition: string; value: unknown }>
}) {
  const response = await apiClient.get<ApiEnvelope<AdminOrder[]> & { total?: number }>(
    `/${appConfig.securePath}/order/fetch`,
    {
      params,
    },
  )
  return {
    data: response.data.data,
    total: response.data.total ?? 0,
  }
}

export async function getOrderDetail(id: number) {
  const response = await apiClient.post<ApiEnvelope<AdminOrderDetail>>(`/${appConfig.securePath}/order/detail`, {
    id,
  })
  return response.data.data
}

export async function updateOrder(tradeNo: string, payload: { commission_status?: number }) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/order/update`, {
    trade_no: tradeNo,
    ...payload,
  })
  return response.data.data
}

export async function paidOrder(tradeNo: string) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/order/paid`, {
    trade_no: tradeNo,
  })
  return response.data.data
}

export async function cancelOrder(tradeNo: string) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/${appConfig.securePath}/order/cancel`, {
    trade_no: tradeNo,
  })
  return response.data.data
}

export async function assignOrder(payload: {
  email: string
  plan_id: number
  period: string
  total_amount: number
}) {
  const response = await apiClient.post<ApiEnvelope<string>>(`/${appConfig.securePath}/order/assign`, payload)
  return response.data.data
}
