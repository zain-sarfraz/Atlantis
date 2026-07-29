import { BookingStatus } from '@prisma/client'
import { prisma } from '../config/database'
import { generateBookingRef } from '../utils/pricing'

/** Minimal fields needed from parseLodgifyEvent (avoids importing the controller). */
export type LodgifyParsedForBooking = {
  bookingId: string | null
  propertyId: number | null
  roomId: number | null
  guestName: string | null
  guestEmail: string | null
  arrival: Date | null
  departure: Date | null
  status: string | null
  action: string | null
  source: string | null
}

type JsonObject = Record<string, unknown>

function asObject(value: unknown): JsonObject | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonObject)
    : null
}

function toInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && /^\d+$/.test(value)) return parseInt(value, 10)
  return null
}

function toFloat(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Number(value)
  }
  return null
}

/** Split "Zain Sarfraz" → { firstName, lastName } */
export function splitGuestName(fullName: string | null | undefined): {
  firstName: string
  lastName: string
} {
  const trimmed = (fullName ?? '').trim()
  if (!trimmed) return { firstName: 'Guest', lastName: 'Lodgify' }
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return { firstName: parts[0], lastName: '' }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ').slice(0, 100),
  }
}

/**
 * Map Lodgify booking status / action → our BookingStatus enum:
 * PENDING | CONFIRMED | CANCELLED | CHECKED_IN | CHECKED_OUT | NO_SHOW
 */
export function mapLodgifyStatusToBookingStatus(
  status: string | null | undefined,
  action?: string | null,
): BookingStatus {
  const s = (status ?? '').toLowerCase()
  const a = (action ?? '').toLowerCase()

  if (
    a.includes('declined') ||
    s === 'declined' ||
    s === 'cancelled' ||
    s === 'canceled' ||
    s === 'open' // Lodgify "Open" = cancelled / removed from calendar
  ) {
    return BookingStatus.CANCELLED
  }
  if (s === 'tentative') return BookingStatus.PENDING
  if (s === 'booked' || s === 'confirmed') return BookingStatus.CONFIRMED
  if (a.includes('booked')) return BookingStatus.CONFIRMED
  return BookingStatus.CONFIRMED
}

function extractExtrasFromEvent(event: unknown): {
  phone: string
  adults: number
  children: number
  totalAmount: number
  currency: string
} {
  const root = asObject(event) ?? {}
  const booking = asObject(root.booking) ?? {}
  const guest = asObject(root.guest) ?? {}
  const rooms = booking.room_types ?? booking.roomTypes
  const firstRoom = Array.isArray(rooms) ? asObject(rooms[0]) : null
  const breakdown = asObject(firstRoom?.guest_breakdown) ?? asObject(firstRoom?.guestBreakdown)

  const phoneRaw =
    guest.phone_number ?? guest.phone ?? booking.guest_phone ?? booking.phone ?? null
  const phone = phoneRaw != null ? String(phoneRaw).slice(0, 30) : 'N/A'

  const adults =
    toInt(breakdown?.adults) ??
    toInt(booking.adults) ??
    toInt(firstRoom?.people) ??
    1

  const children = toInt(breakdown?.children) ?? toInt(booking.children) ?? 0

  const totalAmount =
    toFloat(root.booking_total_amount) ??
    toFloat(root.bookingTotalAmount) ??
    toFloat(booking.total_amount) ??
    toFloat(booking.amount) ??
    0

  const currencyRaw =
    root.booking_currency_code ??
    root.bookingCurrencyCode ??
    booking.currency_code ??
    booking.currency ??
    'AED'

  return {
    phone,
    adults: Math.max(1, adults ?? 1),
    children: Math.max(0, children ?? 0),
    totalAmount: totalAmount ?? 0,
    currency: String(currencyRaw).slice(0, 5) || 'AED',
  }
}

async function uniqueBookingRef(): Promise<string> {
  let ref: string
  do {
    ref = generateBookingRef()
  } while (await prisma.booking.findUnique({ where: { bookingRef: ref } }))
  return ref
}

function nightsBetween(checkIn: Date, checkOut: Date): number {
  const ms = checkOut.getTime() - checkIn.getTime()
  return Math.max(1, Math.round(ms / (24 * 60 * 60 * 1000)))
}

/**
 * Upsert a dashboard Booking (+ BookingItem when RoomType is mapped)
 * from a parsed Lodgify webhook event. Idempotent on lodgifyBookingId.
 */
export async function upsertDashboardBookingFromLodgify(
  parsed: LodgifyParsedForBooking,
  event: unknown,
): Promise<{ id: string; created: boolean } | null> {
  if (!parsed.bookingId) {
    console.warn('[Lodgify webhook] Skip dashboard Booking — missing lodgify booking id')
    return null
  }
  if (!parsed.arrival || !parsed.departure) {
    console.warn(
      `[Lodgify webhook] Skip dashboard Booking ${parsed.bookingId} — missing arrival/departure`,
    )
    return null
  }

  const { firstName, lastName } = splitGuestName(parsed.guestName)
  const extras = extractExtrasFromEvent(event)
  const status = mapLodgifyStatusToBookingStatus(parsed.status, parsed.action)
  const email = (parsed.guestEmail ?? 'channel-guest@lodgify.local').slice(0, 255)
  const lodgifySource = (parsed.source ?? parsed.action ?? 'Lodgify').slice(0, 100)
  const nights = nightsBetween(parsed.arrival, parsed.departure)

  // Resolve RoomType by lodgifyRoomTypeId (+ optional property)
  let roomType:
    | {
        id: string
        ratePlans: { id: string; basePrice: number }[]
      }
    | null = null

  if (parsed.roomId != null) {
    roomType = await prisma.roomType.findFirst({
      where: {
        lodgifyRoomTypeId: parsed.roomId,
        ...(parsed.propertyId != null ? { lodgifyPropertyId: parsed.propertyId } : {}),
        isActive: true,
      },
      include: {
        ratePlans: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { id: true, basePrice: true },
        },
      },
    })

    // Fallback: match room type id only (property not set on local row)
    if (!roomType) {
      roomType = await prisma.roomType.findFirst({
        where: { lodgifyRoomTypeId: parsed.roomId, isActive: true },
        include: {
          ratePlans: {
            where: { isActive: true },
            orderBy: { createdAt: 'asc' },
            take: 1,
            select: { id: true, basePrice: true },
          },
        },
      })
    }

    if (!roomType) {
      console.warn(
        `[Lodgify webhook] No RoomType mapped for lodgifyRoomTypeId=${parsed.roomId}` +
          (parsed.propertyId != null ? ` propertyId=${parsed.propertyId}` : '') +
          ' — Booking will be saved without BookingItem. Set RoomType.lodgifyRoomTypeId in admin.',
      )
    } else if (roomType.ratePlans.length === 0) {
      console.warn(
        `[Lodgify webhook] RoomType ${roomType.id} has no active RatePlan — BookingItem skipped`,
      )
    }
  } else {
    console.warn(
      `[Lodgify webhook] Event ${parsed.bookingId} has no room_type_id — BookingItem skipped`,
    )
  }

  const ratePlan = roomType?.ratePlans[0] ?? null
  const nightlyRate = ratePlan?.basePrice ?? 0
  const itemTotal = extras.totalAmount > 0 ? extras.totalAmount : nightlyRate * nights

  const bookingData = {
    firstName: firstName.slice(0, 100),
    lastName: lastName.slice(0, 100),
    email,
    phone: extras.phone,
    checkIn: parsed.arrival,
    checkOut: parsed.departure,
    adults: extras.adults,
    children: extras.children,
    roomsCount: 1,
    status,
    totalAmount: extras.totalAmount > 0 ? extras.totalAmount : itemTotal,
    currency: extras.currency,
    lodgifyBookingId: parsed.bookingId,
    lodgifySource,
    specialRequests: `Synced from Lodgify (${lodgifySource})`,
    confirmedAt: status === BookingStatus.CONFIRMED ? new Date() : null,
    cancelledAt: status === BookingStatus.CANCELLED ? new Date() : null,
  }

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.booking.findUnique({
      where: { lodgifyBookingId: parsed.bookingId! },
      include: { items: true },
    })

    if (existing) {
      const updated = await tx.booking.update({
        where: { id: existing.id },
        data: {
          ...bookingData,
          // Keep original confirmedAt if already set and still confirmed
          confirmedAt:
            status === BookingStatus.CONFIRMED
              ? existing.confirmedAt ?? new Date()
              : existing.confirmedAt,
          cancelledAt:
            status === BookingStatus.CANCELLED
              ? existing.cancelledAt ?? new Date()
              : null,
        },
      })

      if (roomType && ratePlan) {
        const itemPayload = {
          roomTypeId: roomType.id,
          ratePlanId: ratePlan.id,
          nightlyRate,
          nights,
          subtotal: nightlyRate * nights,
          serviceCharge: 0,
          municipalityFee: 0,
          vat: 0,
          total: itemTotal,
        }
        if (existing.items[0]) {
          await tx.bookingItem.update({
            where: { id: existing.items[0].id },
            data: itemPayload,
          })
        } else {
          await tx.bookingItem.create({
            data: { bookingId: existing.id, ...itemPayload },
          })
        }
      }

      return { id: updated.id, created: false }
    }

    const bookingRef = await uniqueBookingRef()
    const created = await tx.booking.create({
      data: {
        bookingRef,
        ...bookingData,
        ...(roomType && ratePlan
          ? {
              items: {
                create: {
                  roomTypeId: roomType.id,
                  ratePlanId: ratePlan.id,
                  nightlyRate,
                  nights,
                  subtotal: nightlyRate * nights,
                  serviceCharge: 0,
                  municipalityFee: 0,
                  vat: 0,
                  total: itemTotal,
                },
              },
            }
          : {}),
      },
    })

    return { id: created.id, created: true }
  })

  console.log(
    `[Lodgify webhook] Booking ${result.created ? 'created' : 'upserted'} ` +
      `id=${result.id} lodgifyBookingId=${parsed.bookingId} status=${status}`,
  )

  return result
}
