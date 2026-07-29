import axios, { AxiosError, AxiosInstance } from 'axios'
import { env } from './env'

/**
 * Axios client for Lodgify API v2 (read: properties, availability, rates, bookings).
 * Auth: X-ApiKey header. Failures are logged but never crash the process.
 */
export const lodgifyClient: AxiosInstance = axios.create({
  baseURL: env.lodgifyBaseUrl.replace(/\/$/, ''),
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(env.lodgifyApiKey ? { 'X-ApiKey': env.lodgifyApiKey } : {}),
  },
})

/**
 * Axios client for Lodgify API v1 (write: create/update bookings).
 * Booking creation is still on v1: POST /v1/reservation/booking
 */
export const lodgifyV1Client: AxiosInstance = axios.create({
  baseURL: env.lodgifyV1BaseUrl.replace(/\/$/, ''),
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(env.lodgifyApiKey ? { 'X-ApiKey': env.lodgifyApiKey } : {}),
  },
})

function attachErrorLogger(client: AxiosInstance, label: string) {
  client.interceptors.response.use(
    (res) => res,
    (error: AxiosError) => {
      const status = error.response?.status
      const url = error.config?.url
      const method = error.config?.method?.toUpperCase()
      const data = error.response?.data
      console.error(`[Lodgify ${label}] ${method ?? '?'} ${url ?? '?'} → ${status ?? 'network error'}`, data ?? error.message)
      return Promise.reject(error)
    },
  )
}

attachErrorLogger(lodgifyClient, 'v2')
attachErrorLogger(lodgifyV1Client, 'v1')

export function isLodgifyConfigured(): boolean {
  return Boolean(env.lodgifyApiKey?.trim())
}
