import { apiClient } from '@/api/client'
import type { ApiEnvelope } from '@/api/types'

export interface Notice {
  id: number
  title: string
  content: string
  type: number
  created_at: number
  [key: string]: unknown
}

export interface NoticeListResponse {
  data: Notice[]
  total: number
}

export async function fetchNotices(current?: number, pageSize?: number) {
  const params: Record<string, unknown> = {}
  if (current !== undefined) params.current = current
  if (pageSize !== undefined) params.pageSize = pageSize
  const response = await apiClient.get<ApiEnvelope<Notice[]>>('/user/notice/fetch', { params })
  return {
    data: (response.data.data as Notice[]) ?? [],
    total: typeof response.data.total === 'number' ? response.data.total : 0,
  } satisfies NoticeListResponse
}

export async function getNoticeDetail(id: number) {
  const response = await apiClient.get<ApiEnvelope<Notice>>('/user/notice/fetch', { params: { id } })
  return response.data.data
}

// 兼容旧组件命名：默认取第一页（后端默认 pageSize=5）
export async function getNotices() {
  const { data } = await fetchNotices()
  return data
}
