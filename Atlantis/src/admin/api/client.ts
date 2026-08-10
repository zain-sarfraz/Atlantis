/** Backend origin, e.g. https://atlantisbackend.toolkitpro.cloud — empty = same-origin / Vite proxy */
const API_ORIGIN = String(import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
const BASE = API_ORIGIN ? `${API_ORIGIN}/api/admin` : '/api/admin'

/** Resolve relative upload paths against the API host when admin is on another domain */
export function assetUrl(path?: string | null): string {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  return API_ORIGIN ? `${API_ORIGIN}${normalized}` : normalized
}

function getToken(): string | null {
  return localStorage.getItem('serrano_admin_token')
}

export function setToken(token: string): void {
  localStorage.setItem('serrano_admin_token', token)
}

export function clearToken(): void {
  localStorage.removeItem('serrano_admin_token')
  localStorage.removeItem('serrano_admin_refresh')
}

export function setRefreshToken(token: string): void {
  localStorage.setItem('serrano_admin_refresh', token)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('serrano_admin_refresh')
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  isRetry = false,
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  if (options.body instanceof FormData) {
    delete headers['Content-Type']
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers: { ...headers, ...(options.headers as Record<string, string> ?? {}) } })

  if (res.status === 401 && !isRetry) {
    const refresh = getRefreshToken()
    if (refresh) {
      const refreshRes = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: refresh }),
      })
      if (refreshRes.ok) {
        const { accessToken } = await refreshRes.json()
        setToken(accessToken)
        return request<T>(path, options, true)
      }
    }
    // Only force-redirect when a session existed — never loop on the login page
    const hadSession = Boolean(token || refresh)
    clearToken()
    if (hadSession && !window.location.pathname.endsWith('/admin/login')) {
      window.location.href = '/admin/login'
    }
    throw new Error('Session expired')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    const details = Array.isArray(err.details)
      ? err.details.map((d: { path?: string; message?: string }) =>
          d.path ? `${d.path}: ${d.message}` : d.message).filter(Boolean).join('; ')
      : ''
    throw new Error(details || err.error || `HTTP ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, form: FormData) =>
    request<T>(path, { method: 'POST', body: form }),
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ accessToken: string; refreshToken: string; admin: AdminUser }>('/auth/login', { email, password }),
  me: () => api.get<AdminUser>('/auth/me'),
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardApi = {
  get: () => api.get<DashboardData>('/dashboard'),
}

// ─── Rooms ────────────────────────────────────────────────────────────────────
export const roomsApi = {
  listCategories: () => api.get<RoomCategory[]>('/categories'),
  createCategory: (data: Partial<RoomCategory>) => api.post<RoomCategory>('/categories', data),
  updateCategory: (id: string, data: Partial<RoomCategory>) => api.put<RoomCategory>(`/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/categories/${id}`),

  listRooms: (params?: { categoryId?: string }) => {
    const q = params?.categoryId ? `?categoryId=${params.categoryId}` : ''
    return api.get<RoomType[]>(`/rooms${q}`)
  },
  getRoom: (id: string) => api.get<RoomType>(`/rooms/${id}`),
  createRoom: (data: Partial<RoomType>) => api.post<RoomType>('/rooms', data),
  updateRoom: (id: string, data: Partial<RoomType>) => api.put<RoomType>(`/rooms/${id}`, data),
  deleteRoom: (id: string) => api.delete(`/rooms/${id}`),
  uploadImage: (id: string, form: FormData) => api.upload<RoomImage>(`/rooms/${id}/images`, form),
  deleteImage: (roomId: string, imageId: string) => api.delete(`/rooms/${roomId}/images/${imageId}`),

  listRatePlans: (roomTypeId: string) => api.get<RatePlan[]>(`/rooms/${roomTypeId}/rate-plans`),
  createRatePlan: (roomTypeId: string, data: Partial<RatePlan>) => api.post<RatePlan>(`/rooms/${roomTypeId}/rate-plans`, data),
  updateRatePlan: (id: string, data: Partial<RatePlan>) => api.put<RatePlan>(`/rate-plans/${id}`, data),
  deleteRatePlan: (id: string) => api.delete(`/rate-plans/${id}`),

  listOverrides: (ratePlanId: string) => api.get<PriceOverride[]>(`/rate-plans/${ratePlanId}/overrides`),
  upsertOverride: (ratePlanId: string, data: { date: string; price: number }) => api.put<PriceOverride>(`/rate-plans/${ratePlanId}/overrides`, data),
  deleteOverride: (ratePlanId: string, overrideId: string) => api.delete(`/rate-plans/${ratePlanId}/overrides/${overrideId}`),
}

// ─── Availability ─────────────────────────────────────────────────────────────
export const availabilityApi = {
  getCalendar: (roomTypeId: string, month: string) =>
    api.get<AvailabilityDay[]>(`/availability/${roomTypeId}?month=${month}`),
  set: (roomTypeId: string, data: { date: string; available: number }) =>
    api.put(`/availability/${roomTypeId}`, data),
  bulkSet: (roomTypeId: string, data: { from: string; to: string; available: number }) =>
    api.post(`/availability/${roomTypeId}/bulk`, data),
}

export const lodgifyApi = {
  sync: () =>
    api.post<{
      success: boolean
      availability: { ok: boolean; message: string; datesUpdated: number }
      bookings: { ok: boolean; message: string; bookingsSynced: number }
    }>('/sync/lodgify', {}),
}

// ─── Bookings ─────────────────────────────────────────────────────────────────
export const bookingsApi = {
  list: (params?: BookingListParams) => {
    const q = new URLSearchParams()
    if (params?.page) q.set('page', String(params.page))
    if (params?.limit) q.set('limit', String(params.limit))
    if (params?.status) q.set('status', params.status)
    if (params?.search) q.set('search', params.search)
    if (params?.from) q.set('from', params.from)
    if (params?.to) q.set('to', params.to)
    if (params?.channels?.length) q.set('channels', params.channels.join(','))
    return api.get<BookingListResponse>(`/bookings?${q}`)
  },
  get: (id: string) => api.get<Booking>(`/bookings/${id}`),
  updateStatus: (id: string, status: string) => api.put(`/bookings/${id}/status`, { status }),
  delete: (id: string) => api.delete(`/bookings/${id}`),
}

// ─── Promos ───────────────────────────────────────────────────────────────────
export const promosApi = {
  list: () => api.get<PromoCode[]>('/promos'),
  get: (id: string) => api.get<PromoCode>(`/promos/${id}`),
  create: (data: Partial<PromoCode>) => api.post<PromoCode>('/promos', data),
  update: (id: string, data: Partial<PromoCode>) => api.put<PromoCode>(`/promos/${id}`, data),
  delete: (id: string) => api.delete(`/promos/${id}`),
}

// ─── Currency ─────────────────────────────────────────────────────────────────
export const currencyApi = {
  list: () => api.get<CurrencyRate[]>('/currency'),
  upsert: (data: { toCurrency: string; rate: number }) => api.put<CurrencyRate>('/currency', data),
  sync: () => api.post('/currency/sync', {}),
}

// ─── Villa rates (yearly / monthly / date) ────────────────────────────────────
export const villaRatesApi = {
  list: (villaId: string) =>
    api.get<{ rates: VillaRateRow[]; exchangeRates: Record<string, number> }>(
      `/villas/${villaId}/rates`,
    ),
  calendar: (villaId: string, month: string) =>
    api.get<VillaRatesCalendarResponse>(`/villas/${villaId}/rates/calendar?month=${month}`),
  setYearly: (villaId: string, data: { basePrice: number; syncLodgify?: boolean }) =>
    api.put<VillaRateMutationResponse>(`/villas/${villaId}/rates/yearly`, data),
  setMonthly: (villaId: string, data: { month: number; basePrice: number }) =>
    api.put<VillaRateMutationResponse>(`/villas/${villaId}/rates/monthly`, data),
  setDates: (
    villaId: string,
    data: { from: string; to: string; basePrice: number; syncLodgify?: boolean },
  ) => api.put<VillaRateMutationResponse & { updated: number }>(`/villas/${villaId}/rates/dates`, data),
  delete: (id: string) => api.delete(`/villa-rates/${id}`),
  preview: (amount: number) =>
    api.get<{ amountAed: number; currencies: CurrencyPreview; exchangeRates: Record<string, number> }>(
      `/villa-rates/preview?amount=${amount}`,
    ),
}

// ─── Guests ───────────────────────────────────────────────────────────────────
export const guestsApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) => {
    const q = new URLSearchParams()
    if (params?.page) q.set('page', String(params.page))
    if (params?.limit) q.set('limit', String(params.limit))
    if (params?.search) q.set('search', params.search)
    return api.get<GuestListResponse>(`/guests?${q}`)
  },
  get: (id: string) => api.get<Guest>(`/guests/${id}`),
  update: (id: string, data: Partial<Guest>) => api.put<Guest>(`/guests/${id}`, data),
  delete: (id: string) => api.delete(`/guests/${id}`),
}

// ─── Staff ────────────────────────────────────────────────────────────────────
export const staffApi = {
  list: () => api.get<AdminUser[]>('/staff'),
  create: (data: Partial<AdminUser> & { password: string }) => api.post<AdminUser>('/staff', data),
  update: (id: string, data: Partial<AdminUser>) => api.put<AdminUser>(`/staff/${id}`, data),
  delete: (id: string) => api.delete(`/staff/${id}`),
}

// ─── Alerts ───────────────────────────────────────────────────────────────────
export const alertsApi = {
  list: () => api.get<HotelAlert[]>('/alerts'),
  create: (data: Partial<HotelAlert>) => api.post<HotelAlert>('/alerts', data),
  update: (id: string, data: Partial<HotelAlert>) => api.put<HotelAlert>(`/alerts/${id}`, data),
  delete: (id: string) => api.delete(`/alerts/${id}`),
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AdminUser { id: string; email: string; firstName: string; lastName: string; role: string; isActive: boolean; lastLogin?: string; createdAt?: string }
export interface RoomCategory { id: string; name: string; slug: string; displayOrder: number; description?: string; isActive: boolean; _count?: { rooms: number } }
export interface RoomType { id: string; categoryId: string; category?: { name: string }; name: string; slug: string; bedType: string; maxOccupancy: number; sizeSqm: number; viewType: string; description: string; mainImage?: string; isActive: boolean; displayOrder: number; lodgifyPropertyId?: number | null; lodgifyRoomTypeId?: number | null; images: RoomImage[]; amenities: RoomAmenity[]; ratePlans: RatePlan[] }
export interface RoomImage { id: string; url: string; alt?: string; sortOrder: number }
export interface RoomAmenity { id: string; name: string; category: 'AMENITY' | 'PERK'; sortOrder: number }
export interface RatePlan { id: string; roomTypeId: string; name: string; description?: string; basePrice: number; isActive: boolean }
export interface PriceOverride { id: string; ratePlanId: string; date: string; price: number }
export interface AvailabilityDay { date: string; available: number }
export interface PromoCode { id: string; code: string; description?: string; discountType: string; discountValue: number; validFrom?: string; validTo?: string; maxUses?: number; usedCount: number; isActive: boolean; applicableToAll: boolean; roomTypes?: Array<{ roomType: { name: string } }> }
export interface CurrencyRate { id: string; fromCurrency: string; toCurrency: string; rate: number; lastUpdated: string }
export interface Guest { id: string; email: string; firstName: string; lastName: string; phone?: string; country?: string; city?: string; newsletter: boolean; createdAt: string; bookings?: Booking[]; _count?: { bookings: number } }
export interface Booking { id: string; bookingRef: string; guestPrefix?: string; firstName: string; lastName: string; email: string; phone: string; country?: string; city?: string; status: string; totalAmount: number; currency: string; checkIn: string; checkOut: string; adults: number; children: number; roomsCount: number; createdAt: string; confirmedAt?: string; cancelledAt?: string; specialRequests?: string; lodgifySource?: string; channel?: string; items: BookingItem[]; promoCode?: PromoCode; guest?: Guest }
export interface BookingItem { id: string; roomType: { name: string; category?: { name: string }; mainImage?: string; images?: RoomImage[] }; ratePlan: { name: string }; nightlyRate: number; nights: number; subtotal: number; serviceCharge: number; municipalityFee: number; vat: number; total: number }
export interface HotelAlert { id: string; title: string; message: string; isActive: boolean; sortOrder: number }
export interface DashboardData { stats: { totalBookings: number; confirmedBookings: number; pendingBookings: number; cancelledBookings: number; monthRevenue: number; totalRevenue: number; checkInsToday: number; checkOutsToday: number; totalGuests: number }; recentBookings: Booking[]; topRoomTypes: { roomTypeId: string; name: string; bookings: number; revenue: number }[]; revenueByDay: { date: string; revenue: number }[] }
export interface BookingListParams {
  page?: number
  limit?: number
  status?: string
  search?: string
  from?: string
  to?: string
  channels?: string[]
}
export interface BookingListResponse { bookings: Booking[]; total: number; page: number; limit: number; pages: number }
export interface GuestListResponse { guests: Guest[]; total: number; page: number; limit: number; pages: number }
export type CurrencyCode = 'AED' | 'USD' | 'EUR' | 'GBP'
export type CurrencyPreview = Record<CurrencyCode, number>
export interface VillaRateRow {
  id: string
  villaId: string
  rateType: 'YEARLY' | 'MONTHLY' | 'SPECIFIC_DATE'
  month: number | null
  date: string | null
  basePrice: number
}
export interface VillaRateDay {
  date: string
  priceAed: number
  source: 'SPECIFIC_DATE' | 'MONTHLY' | 'YEARLY' | 'PRICE_OVERRIDE' | 'BASE'
}
export interface VillaRatesCalendarResponse {
  days: VillaRateDay[]
  yearly: number | null
  monthly: number | null
  exchangeRates: Record<string, number>
  yearlyCurrencies: CurrencyPreview | null
  monthlyCurrencies: CurrencyPreview | null
}
export interface VillaRateMutationResponse {
  rate?: VillaRateRow
  currencies: CurrencyPreview
  message?: string
  lodgify?: { ok: boolean; message: string }
}
