import { apiClient } from '@/api/client'
import type { ApiEnvelope } from '@/api/types'

export interface ServerNode {
  id: number
  name: string
  host?: string
  port?: number | string
  method?: string
  type?: string
  protocol?: string
  path?: string
  tls?: number
  show?: number
  sort?: number
  rate?: number
  tags?: string[] | null
  is_online?: number
  last_check_at?: number | null
  updated_at?: number | null
  password?: string
  network?: string
  sni?: string
  allow_insecure?: number
  [key: string]: unknown
}

export async function getServerNodes() {
  const response = await apiClient.get<ApiEnvelope<ServerNode[]>>('/user/server/fetch')
  return response.data.data
}

export async function getSubscribeUrl() {
  const response = await apiClient.get<ApiEnvelope<{ subscribe_url: string }>>('/user/getSubscribe')
  return response.data.data?.subscribe_url || null
}
