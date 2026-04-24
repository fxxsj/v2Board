import { apiClient } from '@/api/client'
import type { ApiEnvelope } from '@/api/types'

export interface GuestConfig {
  tos_url: string | null
  is_email_verify: number
  is_invite_force: number
  email_whitelist_suffix: string[] | 0
  is_recaptcha: number
  recaptcha_site_key: string | null
  app_description: string | null
  app_url: string | null
  logo: string | null
}

export async function getGuestConfig() {
  const response = await apiClient.get<ApiEnvelope<GuestConfig>>('/guest/comm/config')
  return response.data.data
}
