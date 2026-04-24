import { apiClient, type ApiEnvelope } from '@/api/client'

export interface UserInfo {
  email: string
  avatar_url?: string
  [key: string]: unknown
}

export async function getUserInfo() {
  const response = await apiClient.get<ApiEnvelope<UserInfo>>('/user/info')
  return response.data.data
}
