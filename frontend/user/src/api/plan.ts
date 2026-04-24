import { apiClient } from '@/api/client'
import type { ApiEnvelope } from '@/api/types'

export interface Plan {
  id: number
  group_id?: number
  name: string
  content?: string | null
  show?: number
  renew?: number
  capacity_limit?: number | null
  transfer_enable?: number | null
  device_limit?: number | null
  speed_limit?: number | null
  sort?: number | null
  // price fields
  month_price?: number | null
  quarter_price?: number | null
  half_year_price?: number | null
  year_price?: number | null
  two_year_price?: number | null
  three_year_price?: number | null
  onetime_price?: number | null
  reset_price?: number | null
  [key: string]: unknown
}

export async function fetchPlans() {
  const response = await apiClient.get<ApiEnvelope<Plan[]>>('/user/plan/fetch')
  return response.data.data
}

export async function fetchPlanById(id: number) {
  const response = await apiClient.get<ApiEnvelope<Plan>>('/user/plan/fetch', { params: { id } })
  return response.data.data
}

