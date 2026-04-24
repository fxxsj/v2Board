import { apiClient } from '@/api/client'
import type { ApiEnvelope } from '@/api/types'

export interface InviteCode {
  id: number
  code: string
  created_at: number
  status?: number
  pv?: number
  updated_at?: number
}

export interface InviteData {
  codes?: InviteCode[]
  /**
   * 原版主题为数组：
   * [0]=已注册用户数 [1]=累计获得佣金 [2]=确认中的佣金 [3]=佣金比例(%) [4]=保留字段/可能为累计充值等
   */
  stat: number[]
}

export interface CommissionLog {
  id: number
  get_amount: number
  created_at: number
}

export async function getInviteData() {
  const response = await apiClient.get<ApiEnvelope<InviteData>>('/user/invite/fetch')
  return response.data.data
}

export async function createInviteCode() {
  const response = await apiClient.get<ApiEnvelope<boolean>>('/user/invite/save')
  return response.data.data
}

export async function getCommissionLogs(params?: { current?: number; page_size?: number }) {
  const response = await apiClient.get<ApiEnvelope<CommissionLog[]>>('/user/invite/details', { params })
  return { data: response.data.data ?? [], total: Number(response.data.total ?? 0) }
}

export async function transferCommission(amount: number) {
  const response = await apiClient.post<ApiEnvelope<boolean>>('/user/transfer', {
    transfer_amount: amount,
  })
  return response.data.data
}

export interface WithdrawParams {
  withdraw_method: string
  withdraw_account: string
}

export async function withdrawCommission(params: WithdrawParams) {
  const response = await apiClient.post<ApiEnvelope<boolean>>('/user/ticket/withdraw', params)
  return response.data.data
}
