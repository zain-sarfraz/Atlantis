import { prisma } from '../config/database'
import { isLodgifyConfigured } from '../config/lodgify'
import { parseDate } from '../utils/pricing'
import {
  extractBookingDates,
  extractBookingId,
  extractBookingPropertyId,
  extractBookingRoomTypeId,
  extractBookingStatus,
  getAvailability,
  getBookings,
  getRates,
} from './lodgifyService'

export type SyncResult = {
  ok: boolean
  message: string
  roomsProcessed: number
  datesUpdated: number
  bookingsSynced: number
  errors: string[]
}

function eachDayInclusiveStartExclusiveEnd(start: Date, end: Date): string[] {
  const days: string[] = []
  const cur = new Date(start)
  while (cur < end) {
    days.push(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return days
}

function defaultSyncWindow(): { start: string; end: string } {
  const start = new Date()
  start.setUTCHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 180)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

/**
 * Pull availability (+ optional rates) from Lodgify and upsert local Availability / PriceOverride.
 * Idempotent: uses upsert on (roomTypeId, date) / (ratePlanId, date).
 */
export async function syncAvailabilityFromLodgify(): Promise<SyncResult> {
  const result: SyncResult = {
    ok: true,
    message: 'Availability sync completed',
    roomsProcessed: 0,
    datesUpdated: 0,
    bookingsSynced: 0,
    errors: [],
  }

  if (!isLodgifyConfigured()) {
    result.ok = false
    result.message = 'Lodgify is not configured (LODGIFY_API_KEY missing)'
    return result
  }

  const mappedRooms = await prisma.roomType.findMany({
    where: {
      isActive: true,
      lodgifyPropertyId: { not: null },
      lodgifyRoomTypeId: { not: null },
    },
    include: {
      ratePlans: { where: { isActive: true }, orderBy: { createdAt: 'asc' }, take: 1 },
    },
  })

  if (mappedRooms.length === 0) {
    result.message =
      'No room types mapped to Lodgify. Set lodgifyPropertyId and lodgifyRoomTypeId on RoomType records.'
    return result
  }

  const { start, end } = defaultSyncWindow()

  // Group by Lodgify property to avoid duplicate availability API calls
  const byProperty = new Map<number, typeof mappedRooms>()
  for (const room of mappedRooms) {
    const pid = room.lodgifyPropertyId!
    const list = byProperty.get(pid) ?? []
    list.push(room)
    byProperty.set(pid, list)
  }

  for (const [propertyId, rooms] of byProperty) {
    try {
      const availabilityRaw = await getAvailability(propertyId, start, end)
      const periodsByRoom = parseAvailabilityPeriods(availabilityRaw)

      for (const room of rooms) {
        result.roomsProcessed += 1
        const roomTypeIdLodgify = room.lodgifyRoomTypeId!
        const periods = periodsByRoom.get(roomTypeIdLodgify) ?? periodsByRoom.get(0) ?? []

        for (const period of periods) {
          const periodStart = parseDate(period.start.slice(0, 10))
          // Lodgify periods often use inclusive end dates; treat end as exclusive for inventory nights
          let periodEnd = parseDate(period.end.slice(0, 10))
          // If end looks like same-day or timestamp end-of-day exclusive already, keep as-is
          if (period.end.includes('T') && period.end.includes('23:59')) {
            periodEnd = new Date(periodEnd)
            periodEnd.setUTCDate(periodEnd.getUTCDate() + 1)
          }

          const availableCount = period.available > 0 ? period.available : 0
          const dates = eachDayInclusiveStartExclusiveEnd(periodStart, periodEnd)

          for (const dateStr of dates) {
            // Only touch dates inside our sync window
            if (dateStr < start || dateStr >= end) continue
            const date = parseDate(dateStr)
            await prisma.availability.upsert({
              where: { roomTypeId_date: { roomTypeId: room.id, date } },
              update: { available: availableCount },
              create: { roomTypeId: room.id, date, available: availableCount },
            })
            result.datesUpdated += 1
          }
        }

        // Best-effort rate sync onto the room's primary rate plan
        const primaryPlan = room.ratePlans[0]
        if (primaryPlan) {
          try {
            const ratesRaw = await getRates(propertyId, start, end, roomTypeIdLodgify)
            const daily = parseDailyRates(ratesRaw)
            for (const [dateStr, price] of daily) {
              if (dateStr < start || dateStr >= end) continue
              if (!Number.isFinite(price) || price <= 0) continue
              const date = parseDate(dateStr)
              await prisma.priceOverride.upsert({
                where: { ratePlanId_date: { ratePlanId: primaryPlan.id, date } },
                update: { price },
                create: { ratePlanId: primaryPlan.id, date, price },
              })
            }
          } catch (rateErr) {
            const msg = rateErr instanceof Error ? rateErr.message : String(rateErr)
            result.errors.push(`Rates sync failed for room ${room.id}: ${msg}`)
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      result.errors.push(`Availability sync failed for property ${propertyId}: ${msg}`)
      result.ok = false
    }
  }

  if (result.errors.length > 0 && result.datesUpdated === 0) {
    result.ok = false
    result.message = 'Availability sync failed'
  } else if (result.errors.length > 0) {
    result.message = 'Availability sync completed with some errors'
  }

  return result
}

/**
 * Pull bookings from Lodgify (Airbnb/Booking.com/etc.) and mark local dates unavailable.
 * Idempotent via unique lodgifyBookingId on Booking.
 */
export async function syncBookingsFromLodgify(): Promise<SyncResult> {
  const result: SyncResult = {
    ok: true,
    message: 'Booking sync completed',
    roomsProcessed: 0,
    datesUpdated: 0,
    bookingsSynced: 0,
    errors: [],
  }

  if (!isLodgifyConfigured()) {
    result.ok = false
    result.message = 'Lodgify is not configured (LODGIFY_API_KEY missing)'
    return result
  }

  const mappedRooms = await prisma.roomType.findMany({
    where: {
      isActive: true,
      lodgifyPropertyId: { not: null },
      lodgifyRoomTypeId: { not: null },
    },
  })

  if (mappedRooms.length === 0) {
    result.message =
      'No room types mapped to Lodgify. Set lodgifyPropertyId and lodgifyRoomTypeId on RoomType records.'
    return result
  }

  const roomByLodgifyKey = new Map<string, (typeof mappedRooms)[0]>()
  const propertyIds = new Set<number>()
  for (const room of mappedRooms) {
    propertyIds.add(room.lodgifyPropertyId!)
    roomByLodgifyKey.set(`${room.lodgifyPropertyId}:${room.lodgifyRoomTypeId}`, room)
  }

  const cancelledStatuses = new Set(['declined', 'cancelled', 'canceled', 'open', 'deleted'])

  for (const propertyId of propertyIds) {
    try {
      const bookings = await getBookings(propertyId)
      result.roomsProcessed += 1

      for (const booking of bookings) {
        const lodgifyId = extractBookingId(booking)
        if (!lodgifyId) continue

        const status = extractBookingStatus(booking)
        if (cancelledStatuses.has(status)) {
          // If we previously synced this booking and it was cancelled, release inventory once
          const existing = await prisma.booking.findUnique({ where: { lodgifyBookingId: lodgifyId } })
          if (existing && existing.status !== 'CANCELLED') {
            await prisma.booking.update({
              where: { id: existing.id },
              data: { status: 'CANCELLED', cancelledAt: new Date() },
            })
            for (const item of await prisma.bookingItem.findMany({ where: { bookingId: existing.id } })) {
              await releaseDates(item.roomTypeId, existing.checkIn, existing.checkOut)
              result.datesUpdated += 1
            }
          }
          continue
        }

        const dates = extractBookingDates(booking)
        if (!dates) continue

        const roomTypeLodgify = extractBookingRoomTypeId(booking)
        const propertyLodgify = extractBookingPropertyId(booking) ?? propertyId
        let localRoom =
          roomTypeLodgify != null
            ? roomByLodgifyKey.get(`${propertyLodgify}:${roomTypeLodgify}`)
            : undefined

        // Fallback: if property has only one mapped room, use it
        if (!localRoom) {
          const forProperty = mappedRooms.filter((r) => r.lodgifyPropertyId === propertyLodgify)
          if (forProperty.length === 1) localRoom = forProperty[0]
        }
        if (!localRoom) {
          result.errors.push(`No local room mapped for Lodgify booking ${lodgifyId}`)
          continue
        }

        const checkIn = parseDate(dates.arrival)
        const checkOut = parseDate(dates.departure)
        const guest = extractGuest(booking)
        const source = extractSource(booking)
        const totalAmount = extractAmount(booking)

        const existing = await prisma.booking.findUnique({ where: { lodgifyBookingId: lodgifyId } })
        if (existing) {
          // Already synced — update dates if changed, otherwise skip (idempotent)
          const sameDates =
            existing.checkIn.toISOString().slice(0, 10) === dates.arrival &&
            existing.checkOut.toISOString().slice(0, 10) === dates.departure
          if (!sameDates) {
            // Release old, block new
            for (const item of await prisma.bookingItem.findMany({ where: { bookingId: existing.id } })) {
              await releaseDates(item.roomTypeId, existing.checkIn, existing.checkOut)
              await blockDates(item.roomTypeId, checkIn, checkOut)
            }
            await prisma.booking.update({
              where: { id: existing.id },
              data: { checkIn, checkOut, lodgifySource: source ?? existing.lodgifySource },
            })
            result.bookingsSynced += 1
            result.datesUpdated += 1
          }
          continue
        }

        // Create a lightweight local booking record for channel reservations
        const ratePlan = await prisma.ratePlan.findFirst({
          where: { roomTypeId: localRoom.id, isActive: true },
          orderBy: { createdAt: 'asc' },
        })

        // Always block dates (idempotent) even if we cannot create a Booking row
        await blockDates(localRoom.id, checkIn, checkOut)
        result.datesUpdated += eachDayInclusiveStartExclusiveEnd(checkIn, checkOut).length

        if (!ratePlan) {
          result.errors.push(
            `Booking ${lodgifyId}: no rate plan on room ${localRoom.id}; dates blocked only`,
          )
          continue
        }

        const bookingRef = await uniqueChannelRef(lodgifyId)
        const nights = Math.max(
          1,
          Math.round((checkOut.getTime() - checkIn.getTime()) / (24 * 60 * 60 * 1000)),
        )

        await prisma.booking.create({
          data: {
            bookingRef,
            lodgifyBookingId: lodgifyId,
            lodgifySource: source,
            currency: 'AED',
            status: 'CONFIRMED',
            totalAmount,
            checkIn,
            checkOut,
            adults: guest.adults,
            children: guest.children,
            roomsCount: 1,
            firstName: guest.firstName,
            lastName: guest.lastName,
            email: guest.email,
            phone: guest.phone,
            specialRequests: source ? `Synced from Lodgify (${source})` : 'Synced from Lodgify',
            confirmedAt: new Date(),
            items: {
              create: {
                roomTypeId: localRoom.id,
                ratePlanId: ratePlan.id,
                nightlyRate: 0,
                nights,
                subtotal: 0,
                serviceCharge: 0,
                municipalityFee: 0,
                vat: 0,
                total: totalAmount,
              },
            },
          },
        })
        result.bookingsSynced += 1
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      result.errors.push(`Booking sync failed for property ${propertyId}: ${msg}`)
      result.ok = false
    }
  }

  if (result.errors.length > 0 && result.bookingsSynced === 0 && result.datesUpdated === 0) {
    result.ok = false
    result.message = 'Booking sync failed'
  } else if (result.errors.length > 0) {
    result.message = 'Booking sync completed with some errors'
  }

  return result
}

/** Run both syncs; safe for cron — never throws. */
export async function runLodgifySync(): Promise<{
  availability: SyncResult
  bookings: SyncResult
}> {
  let availability: SyncResult
  let bookings: SyncResult

  try {
    availability = await syncAvailabilityFromLodgify()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Lodgify sync] availability crashed:', msg)
    availability = {
      ok: false,
      message: msg,
      roomsProcessed: 0,
      datesUpdated: 0,
      bookingsSynced: 0,
      errors: [msg],
    }
  }

  try {
    bookings = await syncBookingsFromLodgify()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Lodgify sync] bookings crashed:', msg)
    bookings = {
      ok: false,
      message: msg,
      roomsProcessed: 0,
      datesUpdated: 0,
      bookingsSynced: 0,
      errors: [msg],
    }
  }

  return { availability, bookings }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type AvailPeriod = { start: string; end: string; available: number }

function parseAvailabilityPeriods(raw: unknown): Map<number, AvailPeriod[]> {
  const map = new Map<number, AvailPeriod[]>()

  const push = (roomTypeId: number, period: AvailPeriod) => {
    const list = map.get(roomTypeId) ?? []
    list.push(period)
    map.set(roomTypeId, list)
  }

  const normalizePeriod = (p: Record<string, unknown>): AvailPeriod | null => {
    const start = String(p.start ?? p.from ?? p.date_from ?? '')
    const end = String(p.end ?? p.to ?? p.date_to ?? '')
    if (!start || !end) return null
    const availableRaw = p.available ?? p.availability ?? p.units ?? 0
    const available =
      typeof availableRaw === 'boolean'
        ? availableRaw
          ? 1
          : 0
        : Number(availableRaw)
    return { start, end, available: Number.isFinite(available) ? available : 0 }
  }

  // Shape A: single object with periods + room_type_id
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>
    if (Array.isArray(obj.periods)) {
      const roomTypeId = Number(obj.room_type_id ?? obj.roomTypeId ?? 0)
      for (const p of obj.periods) {
        if (p && typeof p === 'object') {
          const period = normalizePeriod(p as Record<string, unknown>)
          if (period) push(roomTypeId || 0, period)
        }
      }
    }

    // Shape B: { rooms: [ { room_type_id, periods: [] } ] }
    const rooms = obj.rooms ?? obj.room_types ?? obj.roomTypes
    if (Array.isArray(rooms)) {
      for (const room of rooms) {
        if (!room || typeof room !== 'object') continue
        const r = room as Record<string, unknown>
        const roomTypeId = Number(r.room_type_id ?? r.roomTypeId ?? r.id ?? 0)
        const periods = r.periods ?? r.availability
        if (Array.isArray(periods)) {
          for (const p of periods) {
            if (p && typeof p === 'object') {
              const period = normalizePeriod(p as Record<string, unknown>)
              if (period) push(roomTypeId || 0, period)
            }
          }
        }
      }
    }
  }

  // Shape C: array of period objects (possibly per room)
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue
      const obj = item as Record<string, unknown>
      if (Array.isArray(obj.periods)) {
        const roomTypeId = Number(obj.room_type_id ?? obj.roomTypeId ?? 0)
        for (const p of obj.periods) {
          if (p && typeof p === 'object') {
            const period = normalizePeriod(p as Record<string, unknown>)
            if (period) push(roomTypeId || 0, period)
          }
        }
      } else {
        const period = normalizePeriod(obj)
        const roomTypeId = Number(obj.room_type_id ?? obj.roomTypeId ?? 0)
        if (period) push(roomTypeId || 0, period)
      }
    }
  }

  return map
}

function parseDailyRates(raw: unknown): Map<string, number> {
  const map = new Map<string, number>()

  const ingest = (dateStr: string, price: number) => {
    const d = dateStr.slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(price)) map.set(d, price)
  }

  const walk = (node: unknown) => {
    if (!node) return
    if (Array.isArray(node)) {
      for (const item of node) walk(item)
      return
    }
    if (typeof node !== 'object') return
    const obj = node as Record<string, unknown>
    const date = obj.date ?? obj.day ?? obj.start
    const price = obj.price ?? obj.price_per_day ?? obj.rate ?? obj.amount
    if (date != null && price != null) {
      ingest(String(date), Number(price))
    }
    // Nested calendars
    for (const key of ['calendar', 'days', 'rates', 'data', 'items', 'period_rates']) {
      if (obj[key]) walk(obj[key])
    }
  }

  walk(raw)
  return map
}

async function blockDates(roomTypeId: string, checkIn: Date, checkOut: Date): Promise<void> {
  const dates = eachDayInclusiveStartExclusiveEnd(checkIn, checkOut)
  await Promise.all(
    dates.map((dateStr) => {
      const date = parseDate(dateStr)
      return prisma.availability.upsert({
        where: { roomTypeId_date: { roomTypeId, date } },
        update: { available: 0 },
        create: { roomTypeId, date, available: 0 },
      })
    }),
  )
}

async function releaseDates(roomTypeId: string, checkIn: Date, checkOut: Date): Promise<void> {
  const dates = eachDayInclusiveStartExclusiveEnd(checkIn, checkOut)
  await Promise.all(
    dates.map((dateStr) => {
      const date = parseDate(dateStr)
      return prisma.availability.upsert({
        where: { roomTypeId_date: { roomTypeId, date } },
        update: { available: 1 },
        create: { roomTypeId, date, available: 1 },
      })
    }),
  )
}

async function uniqueChannelRef(lodgifyId: string): Promise<string> {
  const base = `LG${lodgifyId}`.slice(0, 20).toUpperCase()
  let ref = base
  let n = 2
  while (await prisma.booking.findUnique({ where: { bookingRef: ref } })) {
    ref = `${base.slice(0, 16)}${n++}`.slice(0, 20)
  }
  return ref
}

function extractGuest(booking: unknown): {
  firstName: string
  lastName: string
  email: string
  phone: string
  adults: number
  children: number
} {
  const fallback = {
    firstName: 'Channel',
    lastName: 'Guest',
    email: 'channel-guest@lodgify.local',
    phone: 'N/A',
    adults: 1,
    children: 0,
  }
  if (!booking || typeof booking !== 'object') return fallback
  const b = booking as Record<string, unknown>

  let firstName = fallback.firstName
  let lastName = fallback.lastName
  const guest = b.guest ?? b.guest_details ?? b.guestDetails
  if (guest && typeof guest === 'object') {
    const g = guest as Record<string, unknown>
    const name = g.name ?? g.guest_name
    if (typeof name === 'string' && name.trim()) {
      const parts = name.trim().split(/\s+/)
      firstName = parts[0]
      lastName = parts.slice(1).join(' ') || parts[0]
    } else if (g.guest_name && typeof g.guest_name === 'object') {
      const gn = g.guest_name as Record<string, unknown>
      firstName = String(gn.first_name ?? gn.firstName ?? firstName)
      lastName = String(gn.last_name ?? gn.lastName ?? lastName)
    } else {
      firstName = String(g.first_name ?? g.firstName ?? firstName)
      lastName = String(g.last_name ?? g.lastName ?? lastName)
    }
    return {
      firstName,
      lastName,
      email: String(g.email ?? fallback.email),
      phone: String(g.phone ?? g.phone_number ?? fallback.phone),
      adults: Number(b.adults ?? (b.guests as Record<string, unknown> | undefined)?.adults ?? 1) || 1,
      children: Number(b.children ?? (b.guests as Record<string, unknown> | undefined)?.children ?? 0) || 0,
    }
  }

  const guestName = b.guest_name ?? b.guestName
  if (typeof guestName === 'string' && guestName.trim()) {
    const parts = guestName.trim().split(/\s+/)
    firstName = parts[0]
    lastName = parts.slice(1).join(' ') || parts[0]
  }

  return {
    firstName,
    lastName,
    email: String(b.email ?? b.guest_email ?? fallback.email),
    phone: String(b.phone ?? b.guest_phone ?? fallback.phone),
    adults: Number(b.adults ?? 1) || 1,
    children: Number(b.children ?? 0) || 0,
  }
}

function extractSource(booking: unknown): string | null {
  if (!booking || typeof booking !== 'object') return null
  const b = booking as Record<string, unknown>
  const source = b.source ?? b.source_text ?? b.sourceText ?? b.channel ?? b.origin
  return source != null ? String(source) : null
}

function extractAmount(booking: unknown): number {
  if (!booking || typeof booking !== 'object') return 0
  const b = booking as Record<string, unknown>
  const amount = b.totalAmount ?? b.total_amount ?? b.amount ?? b.total
  const n = Number(amount)
  return Number.isFinite(n) ? n : 0
}
