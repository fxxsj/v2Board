import { apiClient } from '@/api/client'
import type { ApiEnvelope } from '@/api/types'

export interface ActiveSession {
  id: number
  user_id: number
  session_id: string
  ip: string
  device: string
  browser: string
  os: string
  country: string
  country_code: string
  city: string
  is_current: number
  created_at: number
  last_activity: number
}

export async function getActiveSessions() {
  const response = await apiClient.get<ApiEnvelope<ActiveSession[]>>('/user/getActiveSession')
  return response.data.data
}

export async function removeActiveSession(id: number) {
  const response = await apiClient.post<ApiEnvelope<boolean>>('/user/removeActiveSession', { id })
  return response.data.data
}
