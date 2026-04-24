import { apiClient } from '@/api/client'
import type { ApiEnvelope } from '@/api/types'

export interface UserInfo {
  email: string
  balance: number | null
  expired_at: number | null
  transfer_enable?: number | null
  device_limit?: number | null
  last_login_at?: number | null
  created_at?: number | null
  banned?: number | null
  auto_renewal?: number | null
  remind_expire?: number | null
  remind_traffic?: number | null
  commission_balance?: number | null
  plan_id?: number | null
  discount?: number | null
  commission_rate?: number | null
  telegram_id?: string | number | null
  uuid?: string | null
  avatar_url?: string | null
}

export interface UserPlan {
  id?: number
  name?: string
  [key: string]: unknown
}

export interface UserSubscribe {
  plan_id?: number | null
  token?: string | null
  expired_at?: number | null
  transfer_enable: number | null
  u: number | null
  d: number | null
  device_limit?: number | null
  email?: string | null
  uuid?: string | null
  alive_ip?: number | null
  subscribe_url?: string | null
  reset_day?: number | null
  allow_new_period?: number | null
  plan?: UserPlan | null
}

export interface UserConfig {
  currency: string
  currency_symbol: string
  stripe_pk?: string | null
  is_telegram?: number | null
  telegram_discuss_link?: string | null
  withdraw_methods?: string[] | null
  withdraw_close?: number | null
  commission_distribution_enable?: number | null
  commission_distribution_l1?: number | null
  commission_distribution_l2?: number | null
  commission_distribution_l3?: number | null
}

export type UserStat = [number, number, number]

export async function getUserInfo() {
  const response = await apiClient.get<ApiEnvelope<UserInfo>>('/user/info')
  return response.data.data
}

export async function getUserSubscribe() {
  const response = await apiClient.get<ApiEnvelope<UserSubscribe>>('/user/getSubscribe')
  return response.data.data
}

export async function getUserConfig() {
  const response = await apiClient.get<ApiEnvelope<UserConfig>>('/user/comm/config')
  return response.data.data
}

export async function getStripePublicKey(paymentId: number) {
  const response = await apiClient.post<ApiEnvelope<string>>('/user/comm/getStripePublicKey', { id: paymentId })
  return response.data.data
}

export async function getUserStat() {
  const response = await apiClient.get<ApiEnvelope<UserStat>>('/user/getStat')
  return response.data.data
}

export interface TelegramBotInfo {
  username: string
}

export async function getTelegramBotInfo() {
  const response = await apiClient.get<ApiEnvelope<TelegramBotInfo>>('/user/telegram/getBotInfo')
  return response.data.data
}

export interface ChangePasswordParams {
  old_password: string
  new_password: string
}

export async function changePassword(data: ChangePasswordParams) {
  const response = await apiClient.post<ApiEnvelope<boolean>>('/user/changePassword', data)
  return response.data.data
}

export async function unbindTelegram() {
  const response = await apiClient.get<ApiEnvelope<boolean>>('/user/unbindTelegram')
  return response.data.data
}

export interface ResetSecurityResult {
  url: string
}

export interface UpdateUserParams {
  auto_renewal?: number
  remind_expire?: number
  remind_traffic?: number
}

export async function resetSecurity() {
  const response = await apiClient.get<ApiEnvelope<string>>('/user/resetSecurity')
  return response.data.data
}

export async function updateUser(data: UpdateUserParams) {
  const response = await apiClient.post<ApiEnvelope<boolean>>('/user/update', data)
  return response.data.data
}

export async function checkLogin() {
  const response = await apiClient.get<ApiEnvelope<boolean>>('/user/checkLogin')
  return response.data.data
}

export async function newPeriod() {
  const response = await apiClient.post<ApiEnvelope<boolean>>('/user/newPeriod')
  return response.data.data
}

export interface RedeemGiftcardResult {
  data: boolean
  type?: number
  value?: number
}

export async function redeemGiftcard(giftcard: string) {
  const response = await apiClient.post<ApiEnvelope<boolean>>('/user/redeemgiftcard', { giftcard })
  // 后端会额外返回 type/value，这里按 envelope 扩展字段读取
  return {
    data: response.data.data,
    type: typeof response.data.type === 'number' ? (response.data.type as number) : undefined,
    value: typeof response.data.value === 'number' ? (response.data.value as number) : undefined,
  } satisfies RedeemGiftcardResult
}

export async function getQuickLoginUrl(redirect?: string) {
  const response = await apiClient.post<ApiEnvelope<string>>('/user/getQuickLoginUrl', redirect ? { redirect } : {})
  return response.data.data
}
