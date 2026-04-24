import { apiClient } from '@/api/client'
import type { ApiEnvelope } from '@/api/types'

export interface Coupon {
  id: number
  code: string
  name?: string | null
  type?: number
  value?: number
  started_at?: number | null
  ended_at?: number | null
  limit_use?: number | null
  limit_plan_ids?: number[] | null
  [key: string]: unknown
}

export async function checkCoupon(code: string, planId?: number) {
  const response = await apiClient.post<ApiEnvelope<Coupon>>('/user/coupon/check', {
    code,
    plan_id: planId,
  })
  return response.data.data
}

