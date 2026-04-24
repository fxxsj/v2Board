import { apiClient } from '@/api/client'
import type { ApiEnvelope } from '@/api/types'

export interface OrderPlan {
  id: number
  name: string
  show?: number
  renew?: number
  [key: string]: unknown
}

export interface Order {
  trade_no: string
  plan_id: number
  period: string
  total_amount: number
  balance_amount: number
  discount_amount?: number | null
  surplus_amount?: number | null
  refund_amount?: number | null
  pre_handling_amount?: number | null
  status: number
  created_at: number
  updated_at: number
  plan?: OrderPlan
  try_out_plan_id?: number
  bonus_amount?: number
  get_amount?: number
  surplus_orders?: Order[]
}

export interface OrderDetail extends Order {
  plan: OrderPlan | { id: number; name: string }
  try_out_plan_id?: number
  bonus_amount?: number
  get_amount?: number
  surplus_orders?: Order[]
}

export interface PaymentMethod {
  id: number
  name: string
  payment: string
  icon: string
  handling_fee_fixed: number | null
  handling_fee_percent: number | null
}

export async function fetchOrders(status?: number) {
  const params = status !== undefined ? { status } : {}
  const response = await apiClient.get<ApiEnvelope<Order[]>>('/user/order/fetch', { params })
  return response.data.data
}

export async function getOrderDetail(tradeNo: string) {
  const response = await apiClient.get<ApiEnvelope<OrderDetail>>('/user/order/detail', {
    params: { trade_no: tradeNo },
  })
  return response.data.data
}

export async function getPaymentMethods() {
  const response = await apiClient.get<ApiEnvelope<PaymentMethod[]>>('/user/order/getPaymentMethod')
  return response.data.data
}

export async function checkoutOrder(tradeNo: string, method: number, token?: string) {
  const response = await apiClient.post<ApiEnvelope<{ type: number; data: unknown }>>('/user/order/checkout', {
    trade_no: tradeNo,
    method,
    token,
  })
  return response.data.data
}

export async function cancelOrder(tradeNo: string) {
  const response = await apiClient.post<ApiEnvelope<boolean>>('/user/order/cancel', {
    trade_no: tradeNo,
  })
  return response.data.data
}

export async function checkOrderStatus(tradeNo: string) {
  const response = await apiClient.get<ApiEnvelope<number>>('/user/order/check', {
    params: { trade_no: tradeNo },
  })
  return response.data.data
}

export async function createOrder(planId: number, period: string, couponCode?: string, depositAmount?: number) {
  const payload: Record<string, unknown> = {
    plan_id: planId,
    period,
  }
  if (couponCode) {
    payload.coupon_code = couponCode
  }
  if (depositAmount !== undefined) {
    payload.deposit_amount = depositAmount
  }
  const response = await apiClient.post<ApiEnvelope<string>>('/user/order/save', payload)
  return response.data.data
}
