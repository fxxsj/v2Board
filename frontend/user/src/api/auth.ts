import { apiClient } from '@/api/client'
import type { ApiEnvelope } from '@/api/types'

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  is_admin: boolean
  auth_data: string
}

export async function loginWithPassword(payload: LoginPayload) {
  const response = await apiClient.post<ApiEnvelope<LoginResponse>>('/passport/auth/login', payload)
  return response.data.data
}

export async function logout() {
  return
}

export interface RegisterPayload {
  email: string
  password: string
  invite_code?: string
  email_code?: string
  recaptcha_data?: string
}

export async function register(payload: RegisterPayload) {
  const response = await apiClient.post<ApiEnvelope<LoginResponse>>('/passport/auth/register', payload)
  return response.data.data
}

export interface SendEmailVerifyPayload {
  email: string
  recaptcha_data?: string
  isforget?: 0 | 1
}

export async function sendEmailVerify(payload: SendEmailVerifyPayload) {
  const response = await apiClient.post<ApiEnvelope<boolean>>('/passport/comm/sendEmailVerify', payload)
  return response.data.data
}

export interface ForgetPasswordPayload {
  email: string
  password: string
  email_code: string
}

export async function resetPassword(payload: ForgetPasswordPayload) {
  const response = await apiClient.post<ApiEnvelope<boolean>>('/passport/auth/forget', payload)
  return response.data.data
}

export interface Token2LoginParams {
  verify: string
  redirect?: string
}

export async function token2Login(params: Token2LoginParams) {
  const response = await apiClient.get<ApiEnvelope<LoginResponse>>('/passport/auth/token2Login', { params })
  return response.data.data
}
