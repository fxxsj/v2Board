export interface ApiEnvelope<T> {
  data: T
  message?: string
  total?: number
  [key: string]: unknown
}
