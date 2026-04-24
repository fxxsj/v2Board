import axios from 'axios'
import { appConfig } from '@/config/app'
import { AUTH_TOKEN_STORAGE_KEY } from '@/stores/auth'

export const apiClient = axios.create({
  baseURL: appConfig.apiBase,
  withCredentials: true,
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
  if (token) {
    config.headers.Authorization = token
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 || error?.response?.status === 403) {
      console.warn('Unauthorized, should redirect to login in next phase.')
    }
    return Promise.reject(error)
  },
)
