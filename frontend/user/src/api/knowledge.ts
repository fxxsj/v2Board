import { apiClient } from '@/api/client'
import type { ApiEnvelope } from '@/api/types'

export interface KnowledgeCategory {
  [key: string]: Knowledge[]
}

export interface Knowledge {
  id: number
  category: string
  title: string
  body?: string
  updated_at?: number
}

export interface KnowledgeDetail extends Knowledge {
  body: string
}

export async function getKnowledgeList(language?: string, keyword?: string) {
  const params: Record<string, string> = {}
  if (language) params.language = language
  if (keyword) params.keyword = keyword
  
  const response = await apiClient.get<ApiEnvelope<KnowledgeCategory>>('/user/knowledge/fetch', { params })
  return response.data.data
}

export async function getKnowledgeDetail(id: number) {
  const response = await apiClient.get<ApiEnvelope<KnowledgeDetail>>('/user/knowledge/fetch', {
    params: { id }
  })
  return response.data.data
}

export async function getKnowledgeCategory() {
  const response = await apiClient.get<ApiEnvelope<KnowledgeCategory>>('/user/knowledge/getCategory')
  return response.data.data
}
