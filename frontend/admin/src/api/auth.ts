import { apiClient, type ApiEnvelope } from '@/api/client'

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResponse {
  auth_data: string
  is_admin: boolean
}

export interface CheckLoginResponse {
  is_login: boolean
  is_admin?: boolean
}

export async function loginWithPassword(payload: LoginPayload) {
  const response = await apiClient.post<ApiEnvelope<LoginResponse>>('/passport/auth/login', payload)
  return response.data.data
}

export async function checkLogin() {
  const response = await apiClient.get<ApiEnvelope<CheckLoginResponse>>('/user/checkLogin')
  return response.data.data
}
