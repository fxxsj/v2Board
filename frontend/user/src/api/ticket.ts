import { apiClient } from '@/api/client'
import type { ApiEnvelope } from '@/api/types'

export interface TicketMessage {
  id: number
  ticket_id: number
  user_id: number
  message: string
  is_me: boolean
  created_at: number
}

export interface Ticket {
  id: number
  subject: string
  level: number
  status: number
  reply_status?: number
  created_at: number
  updated_at: number
  message?: TicketMessage[]
}

export async function fetchTickets() {
  const response = await apiClient.get<ApiEnvelope<Ticket[]>>('/user/ticket/fetch')
  return response.data.data
}

export async function getTicketDetail(ticketId: number) {
  const response = await apiClient.get<ApiEnvelope<Ticket>>('/user/ticket/fetch', {
    params: { id: ticketId },
  })
  return response.data.data
}

export async function createTicket(subject: string, message: string, level: number = 1) {
  const response = await apiClient.post<ApiEnvelope<boolean>>('/user/ticket/save', {
    subject,
    message,
    level,
  })
  return response.data.data
}

export async function replyTicket(ticketId: number, message: string) {
  const response = await apiClient.post<ApiEnvelope<boolean>>('/user/ticket/reply', {
    id: ticketId,
    message,
  })
  return response.data.data
}

export async function closeTicket(ticketId: number) {
  const response = await apiClient.post<ApiEnvelope<boolean>>('/user/ticket/close', {
    id: ticketId,
  })
  return response.data.data
}
