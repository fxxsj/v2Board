import { apiClient } from '@/api/client'
import type { ApiEnvelope } from '@/api/types'

export interface TrafficLogRecord {
  u: number
  d: number
  record_at: number
  user_id: number
  server_rate: number
  [key: string]: unknown
}

export async function getTrafficLog() {
  const response = await apiClient.get<ApiEnvelope<TrafficLogRecord[]>>('/user/stat/getTrafficLog')
  return response.data.data
}

