import { AxiosError } from 'axios'
import { isLodgifyConfigured, lodgifyClient, lodgifyV1Client } from '../config/lodgify'

export type LodgifyBookingPayload = {
  propertyId: number
  roomTypeId: number
  arrival: string // YYYY-MM-DD
  departure: string // YYYY-MM-DD
  guestName: string
  guestEmail?: string
  guestPhone?: string
  adults: number
  children?: number
  infants?: number
  status?: 'booked' | 'tentative' | 'declined' | 'confirmed'
  source?: string
  notes?: string
  totalAmount?: number
  currency?: string
}

export type LodgifyCreateBookingResult = {
  id: number | string
  raw: unknown
}

function assertConfigured(): void {
  if (!isLodgifyConfigured()) {
    throw new Error('Lodgify is not configured (LODGIFY_API_KEY is missing)')
  }
}

function rethrowLodgify(err: unknown, context: string): never {
  if (err instanceof AxiosError) {
    const msg =
      typeof err.response?.data === 'object'
        ? JSON.stringify(err.response.data)
        : err.message
    throw new Error(`Lodgify ${context} failed (${err.response?.status ?? 'network'}): ${msg}`)
  }
  throw err
}

/** GET /v2/properties — list all properties/listings */
export async function getProperties(params?: {
  page?: number
  size?: number
  includeCount?: boolean
}): Promise<unknown> {
  assertConfigured()
  try {
    const { data } = await lodgifyClient.get('/properties', {
      params: {
        page: params?.page ?? 1,
        size: params?.size ?? 50,
        includeCount: params?.includeCount ?? true,
      },
    })
    return data
  } catch (err) {
    rethrowLodgify(err, 'getProperties')
  }
}

/** GET /v2/properties/:propertyId */
export async function getPropertyById(propertyId: number | string): Promise<unknown> {
  assertConfigured()
  try {
    const { data } = await lodgifyClient.get(`/properties/${propertyId}`)
    return data
  } catch (err) {
    rethrowLodgify(err, 'getPropertyById')
  }
}

/**
 * GET /v2/availability/:propertyId
 * Optional startDate/endDate map to `from` / `to` query params.
 */
export async function getAvailability(
  propertyId: number | string,
  startDate?: string,
  endDate?: string,
): Promise<unknown> {
  assertConfigured()
  try {
    const { data } = await lodgifyClient.get(`/availability/${propertyId}`, {
      params: {
        ...(startDate ? { from: startDate } : {}),
        ...(endDate ? { to: endDate } : {}),
      },
    })
    return data
  } catch (err) {
    rethrowLodgify(err, 'getAvailability')
  }
}

/**
 * GET /v2/rates/calendar
 * Lodgify expects HouseId + RoomTypeId (+ period).
 */
export async function getRates(
  propertyId: number | string,
  startDate: string,
  endDate: string,
  roomTypeId?: number | string,
): Promise<unknown> {
  assertConfigured()
  try {
    const { data } = await lodgifyClient.get('/rates/calendar', {
      params: {
        HouseId: propertyId,
        ...(roomTypeId != null ? { RoomTypeId: roomTypeId } : {}),
        StartDate: startDate,
        EndDate: endDate,
      },
    })
    return data
  } catch (err) {
    rethrowLodgify(err, 'getRates')
  }
}

/**
 * POST /v1/reservation/booking — push a booking into Lodgify so OTAs block dates.
 * Payload shape follows Lodgify v1 nested structure (guest + rooms[]).
 */
export async function createBookingInLodgify(
  bookingData: LodgifyBookingPayload,
): Promise<LodgifyCreateBookingResult> {
  assertConfigured()

  const nameParts = bookingData.guestName.trim().split(/\s+/)
  const firstName = nameParts[0] || ''
  const lastName = nameParts.slice(1).join(' ') || firstName

  const statusMap: Record<string, string> = {
    booked: 'Booked',
    tentative: 'Tentative',
    declined: 'Declined',
    confirmed: 'Booked',
  }

  const body = {
    property_id: bookingData.propertyId,
    arrival: bookingData.arrival,
    departure: bookingData.departure,
    status: statusMap[bookingData.status ?? 'booked'] ?? 'Booked',
    source_text: bookingData.source ?? 'Direct Website',
    guest: {
      guest_name: { first_name: firstName, last_name: lastName },
      email: bookingData.guestEmail ?? null,
      phone: bookingData.guestPhone ?? null,
    },
    rooms: [
      {
        room_type_id: bookingData.roomTypeId,
        guest_breakdown: {
          adults: bookingData.adults,
          children: bookingData.children ?? 0,
          infants: bookingData.infants ?? 0,
        },
      },
    ],
    ...(bookingData.notes ? { notes: bookingData.notes } : {}),
    ...(bookingData.totalAmount != null
      ? { total_amount: bookingData.totalAmount, currency_code: bookingData.currency }
      : {}),
  }

  try {
    const { data } = await lodgifyV1Client.post('/reservation/booking', body)

    // Lodgify often returns a bare booking id (number or numeric string)
    let id: number | string
    if (typeof data === 'number' || (typeof data === 'string' && /^\d+$/.test(data))) {
      id = typeof data === 'number' ? data : parseInt(data, 10)
    } else if (data && typeof data === 'object' && 'id' in data) {
      id = (data as { id: number | string }).id
    } else {
      id = String(data)
    }

    // Confirm status via book endpoint when possible (Lodgify may ignore status on create)
    if (bookingData.status === 'booked' || bookingData.status === 'confirmed' || !bookingData.status) {
      try {
        await lodgifyV1Client.put(`/reservation/booking/${id}/book`)
      } catch {
        // Non-fatal — booking may already be Booked
      }
    }

    return { id, raw: data }
  } catch (err) {
    rethrowLodgify(err, 'createBookingInLodgify')
  }
}

/**
 * GET /v2/reservations/bookings — fetch bookings (optionally filtered by property).
 * Pages through results (max 50 per page).
 */
export async function getBookings(
  propertyId?: number | string,
  options?: {
    stayFilter?: 'Upcoming' | 'Current' | 'Historic' | 'All'
    page?: number
    size?: number
    updatedSince?: string
  },
): Promise<unknown[]> {
  assertConfigured()

  const size = Math.min(options?.size ?? 50, 50)
  let page = options?.page ?? 1
  const all: unknown[] = []

  try {
    // If caller asked for a single page, return that page only
    if (options?.page != null) {
      const { data } = await lodgifyClient.get('/reservations/bookings', {
        params: {
          page,
          size,
          includeCount: true,
          stayFilter: options?.stayFilter ?? 'Upcoming',
          ...(propertyId != null ? { propertyId } : {}),
          ...(options?.updatedSince ? { updatedSince: options.updatedSince } : {}),
        },
      })
      const items = normalizeBookingList(data)
      return propertyId != null
        ? items.filter((b) => bookingMatchesProperty(b, propertyId))
        : items
    }

    // Otherwise page through Upcoming + Current for a fuller sync window
    for (const stayFilter of ['Upcoming', 'Current'] as const) {
      page = 1
      for (;;) {
        const { data } = await lodgifyClient.get('/reservations/bookings', {
          params: {
            page,
            size,
            includeCount: true,
            stayFilter,
            ...(propertyId != null ? { propertyId } : {}),
            ...(options?.updatedSince ? { updatedSince: options.updatedSince } : {}),
          },
        })
        const items = normalizeBookingList(data)
        all.push(...items)
        if (items.length < size) break
        page += 1
        if (page > 40) break // safety cap
      }
    }

    const filtered =
      propertyId != null
        ? all.filter((b) => bookingMatchesProperty(b, propertyId))
        : all

    // Deduplicate by id across stay filters
    const seen = new Set<string>()
    return filtered.filter((b) => {
      const id = extractBookingId(b)
      if (!id || seen.has(id)) return false
      seen.add(id)
      return true
    })
  } catch (err) {
    rethrowLodgify(err, 'getBookings')
  }
}

function normalizeBookingList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    if (Array.isArray(obj.items)) return obj.items
    if (Array.isArray(obj.data)) return obj.data
    if (Array.isArray(obj.results)) return obj.results
  }
  return []
}

function bookingMatchesProperty(booking: unknown, propertyId: number | string): boolean {
  if (!booking || typeof booking !== 'object') return false
  const b = booking as Record<string, unknown>
  const pid = b.property_id ?? b.propertyId ?? b.house_id ?? b.houseId
  return String(pid) === String(propertyId)
}

export function extractBookingId(booking: unknown): string | null {
  if (!booking || typeof booking !== 'object') return null
  const b = booking as Record<string, unknown>
  const id = b.id ?? b.booking_id ?? b.bookingId
  return id != null ? String(id) : null
}

export function extractBookingDates(booking: unknown): { arrival: string; departure: string } | null {
  if (!booking || typeof booking !== 'object') return null
  const b = booking as Record<string, unknown>
  const arrival = String(b.arrival ?? b.checkIn ?? b.check_in ?? b.date_arrival ?? '').slice(0, 10)
  const departure = String(b.departure ?? b.checkOut ?? b.check_out ?? b.date_departure ?? '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(arrival) || !/^\d{4}-\d{2}-\d{2}$/.test(departure)) return null
  return { arrival, departure }
}

export function extractBookingRoomTypeId(booking: unknown): number | null {
  if (!booking || typeof booking !== 'object') return null
  const b = booking as Record<string, unknown>
  const direct = b.room_type_id ?? b.roomTypeId
  if (typeof direct === 'number') return direct
  if (typeof direct === 'string' && /^\d+$/.test(direct)) return parseInt(direct, 10)

  const rooms = b.rooms ?? b.room_types ?? b.roomTypes
  if (Array.isArray(rooms) && rooms[0] && typeof rooms[0] === 'object') {
    const r = rooms[0] as Record<string, unknown>
    const rid = r.room_type_id ?? r.roomTypeId ?? r.id
    if (typeof rid === 'number') return rid
    if (typeof rid === 'string' && /^\d+$/.test(rid)) return parseInt(rid, 10)
  }
  return null
}

export function extractBookingPropertyId(booking: unknown): number | null {
  if (!booking || typeof booking !== 'object') return null
  const b = booking as Record<string, unknown>
  const pid = b.property_id ?? b.propertyId ?? b.house_id ?? b.houseId
  if (typeof pid === 'number') return pid
  if (typeof pid === 'string' && /^\d+$/.test(pid)) return parseInt(pid, 10)
  return null
}

export function extractBookingStatus(booking: unknown): string {
  if (!booking || typeof booking !== 'object') return ''
  const b = booking as Record<string, unknown>
  return String(b.status ?? b.booking_status ?? '').toLowerCase()
}
