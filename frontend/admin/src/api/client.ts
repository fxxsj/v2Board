import axios from 'axios'
import { message } from 'antd'
import { appConfig } from '@/config/app'

export const AUTH_TOKEN_STORAGE_KEY = 'authorization'

export type ApiEnvelope<T> = {
  data: T
  message?: string
  msg?: string
  errors?: Record<string, string[]>
}

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
}

export function setAuthToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token)
}

export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
}

export const apiClient = axios.create({
  baseURL: appConfig.apiBase,
  withCredentials: true,
})

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) {
    config.headers.Authorization = token
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const payload = error?.response?.data
    const firstError = payload?.errors
      ? (Object.values(payload.errors)[0] as string[] | undefined)?.[0]
      : undefined

    const description =
      payload?.message ??
      payload?.msg ??
      firstError ??
      error?.message

    if (status === 403) {
      clearAuthToken()
      if (window.location.hash !== '#/login') {
        window.location.hash = '#/login'
      }
      return Promise.reject(error)
    }

    if (description) {
      message.error(description)
    }

    return Promise.reject(error)
  },
)
