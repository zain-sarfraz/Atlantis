// Backend API client for Serrano Hotel frontend
const BASE = import.meta.env.VITE_API_URL ?? '/api'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers as Record<string, string> ?? {}) },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export interface SearchParams {
  checkIn: string
  checkOut: string
  adults: number
  children: number
  rooms: number
  currency: string
  promoCode?: string
}

export interface SearchResponse {
  checkIn: string
  checkOut: string
  nights: number
  adults: number
  children: number
  rooms: number
  currency: string
  categories: ApiRoomCategory[]
}

export interface ApiRatePlan {
  id: string
  name: string
  description: string
  nightlyRate: number
  breakdown: {
    nightlyRate: number
    nights: number
    subtotal: number
    serviceCharge: number
    municipalityFee: number
    vat: number
    total: number
  }
  currency: string
}

export interface ApiRoom {
  id: string
  name: string
  slug: string
  bedType: string
  view: string
  maxOccupancy: number
  sizeSqm: number
  description: string
  image: string
  gallery: string[]
  amenities: string[]
  perks: string[]
  ratePlans: ApiRatePlan[]
}

export interface ApiRoomCategory {
  id: string
  name: string
  slug: string
  rooms: ApiRoom[]
}

export interface CreateBookingPayload {
  checkIn: string
  checkOut: string
  adults: number
  children: number
  roomsCount: number
  currency: string
  promoCode?: string
  items: Array<{ roomTypeId: string; ratePlanId: string }>
  guestPrefix?: string
  firstName: string
  lastName: string
  email: string
  phone: string
  country?: string
  city?: string
  zipCode?: string
  specialRequests?: string
  newsletter?: boolean
}

export const hotelApi = {
  search: (params: SearchParams): Promise<SearchResponse> => {
    const q = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') q.set(k, String(v)) })
    return request<SearchResponse>(`/search?${q}`)
  },

  getAlerts: () => request<Array<{ id: string; title: string; message: string; isActive?: boolean }>>('/alerts'),

  getCurrency: () => request<{ base: string; rates: Record<string, number> }>('/currency'),

  validatePromo: (code: string, roomTypeId?: string) =>
    request<{ valid: boolean; discountType: string; discountValue: number; description: string | null }>(
      '/bookings/validate-promo',
      { method: 'POST', body: JSON.stringify({ code, roomTypeId }) },
    ),

  createBooking: (payload: CreateBookingPayload) =>
    request<{ booking: unknown; bookingRef: string }>(
      '/bookings',
      { method: 'POST', body: JSON.stringify(payload) },
    ),

  getBooking: (ref: string) => request<unknown>(`/bookings/${ref}`),

  getGuestBookings: (email: string) => request<unknown[]>(`/bookings/guest/${encodeURIComponent(email)}`),
}
