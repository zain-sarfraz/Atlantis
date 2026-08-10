import { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../../config/database'
import { upsertDashboardBookingFromLodgify } from '../../services/lodgifyDashboardBooking.service'
import { scopedLodgifyPropertyId } from '../../utils/lodgifyScope'

type JsonObject = Record<string, unknown>

export type ParsedLodgifyEvent = {
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

function asObject(value: unknown): JsonObject | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonObject)
    : null
}

function parseDateField(value: unknown): Date | null {
  if (value == null) return null
  const str = String(value).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null
  const d = new Date(`${str}T00:00:00.000Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

function toInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && /^\d+$/.test(value)) return parseInt(value, 10)
  return null
}

/**
 * Lodgify often sends a JSON array of events:
 * [ { action, booking: { id, property_id, ... }, guest: { name, email } } ]
 * Sometimes a single object is sent instead — normalize to an array.
 */
export function normalizeLodgifyEvents(body: unknown): unknown[] {
  if (Array.isArray(body)) return body
  if (body && typeof body === 'object') return [body]
  return []
}

/**
 * Parse one Lodgify webhook event object (not the outer array).
 *
 * Expected shape:
 * {
 *   action: "booking_new_status_booked",
 *   booking: {
 *     id, property_id, date_arrival, date_departure, status, source,
 *     room_types: [{ room_type_id }]
 *   },
 *   guest: { name, email }
 * }
 */
export function parseLodgifyEvent(event: unknown, fallbackAction?: string): ParsedLodgifyEvent {
  const root = asObject(event) ?? {}
  const booking = asObject(root.booking) ?? {}
  const guest = asObject(root.guest) ?? {}

  const rooms = booking.rooms ?? booking.room_types ?? booking.roomTypes
  const firstRoom = Array.isArray(rooms) ? asObject(rooms[0]) : null
  const roomId =
    toInt(firstRoom?.room_type_id) ??
    toInt(firstRoom?.roomTypeId) ??
    null

  const bookingIdRaw = booking.id ?? root.booking_id ?? root.bookingId
  const propertyId =
    toInt(booking.property_id) ??
    toInt(booking.propertyId) ??
    toInt(root.property_id) ??
    toInt(root.propertyId)

  const guestName =
    (typeof guest.name === 'string' && guest.name) ||
    (typeof guest.guest_name === 'string' && guest.guest_name) ||
    null

  const guestEmail =
    (typeof guest.email === 'string' && guest.email) ||
    (typeof booking.guest_email === 'string' && booking.guest_email) ||
    null

  const statusRaw = booking.status ?? root.status
  const actionRaw = root.action ?? root.event ?? root.type ?? fallbackAction
  const sourceRaw = booking.source ?? booking.source_text ?? booking.sourceText ?? root.source

  return {
    bookingId: bookingIdRaw != null ? String(bookingIdRaw) : null,
    propertyId,
    roomId,
    guestName: guestName ? String(guestName).slice(0, 255) : null,
    guestEmail: guestEmail ? String(guestEmail).slice(0, 255) : null,
    arrival: parseDateField(booking.date_arrival ?? booking.arrival ?? booking.checkIn),
    departure: parseDateField(booking.date_departure ?? booking.departure ?? booking.checkOut),
    status: statusRaw != null ? String(statusRaw).slice(0, 50) : null,
    action: actionRaw != null ? String(actionRaw).slice(0, 80) : null,
    source: sourceRaw != null ? String(sourceRaw).slice(0, 100) : null,
  }
}

/** @deprecated use parseLodgifyEvent — kept for any external imports */
export function parseLodgifyWebhookPayload(body: unknown) {
  const events = normalizeLodgifyEvents(body)
  return parseLodgifyEvent(events[0] ?? {})
}

function safeJsonPreview(value: unknown, max = 2000): string {
  try {
    const s = typeof value === 'string' ? value : JSON.stringify(value)
    return s.length > max ? `${s.slice(0, max)}…` : s
  } catch {
    return String(value)
  }
}

function looksLikeBookingEvent(event: unknown, parsed: ParsedLodgifyEvent): boolean {
  const action = (parsed.action ?? '').toLowerCase()
  return (
    Boolean(parsed.bookingId) ||
    action.includes('booking') ||
    Boolean(asObject(event)?.booking)
  )
}

/**
 * POST /api/webhooks/lodgify
 * Lodgify may POST a single object OR an array of events — save EACH event.
 * Must return HTTP 200 OK.
 */
export async function receiveLodgifyWebhook(req: Request, res: Response, _next: NextFunction) {
  const contentType = req.headers['content-type']
  const msSignature = req.headers['ms-signature']
  const queryEvent = typeof req.query.event === 'string' ? req.query.event : undefined

  console.log('[Lodgify webhook] ─── incoming ───')
  console.log('[Lodgify webhook] method=', req.method, 'url=', req.originalUrl)
  console.log('[Lodgify webhook] content-type=', contentType)
  console.log('[Lodgify webhook] ms-signature present=', Boolean(msSignature))
  console.log('[Lodgify webhook] query.event=', queryEvent)
  console.log('[Lodgify webhook] rawBody bytes=', req.rawBody?.length ?? 0)
  console.log('[Lodgify webhook] body type=', typeof req.body, 'isArray=', Array.isArray(req.body))
  console.log('[Lodgify webhook] body preview=', safeJsonPreview(req.body))

  try {
    let body: unknown = req.body

    if (
      (!body ||
        (typeof body === 'object' &&
          !Array.isArray(body) &&
          Object.keys(body as object).length === 0)) &&
      req.rawBody?.length
    ) {
      try {
        body = JSON.parse(req.rawBody.toString('utf8'))
        console.log('[Lodgify webhook] Parsed body from rawBody fallback')
      } catch (parseErr) {
        console.error(
          '[Lodgify webhook] rawBody JSON parse failed:',
          parseErr instanceof Error ? parseErr.message : parseErr,
        )
      }
    }

    if (!body || typeof body !== 'object') {
      console.error('[Lodgify webhook] Empty or non-object body — cannot save')
      res.status(200).json({ ok: false, saved: false, reason: 'empty_body' })
      return
    }

    const events = normalizeLodgifyEvents(body)
    console.log(`[Lodgify webhook] event count=${events.length}`)

    const savedIds: string[] = []
    const errors: string[] = []

    for (let i = 0; i < events.length; i++) {
      const event = events[i]
      const parsed = parseLodgifyEvent(event, queryEvent)
      console.log(`[Lodgify webhook] event[${i}] parsed=`, JSON.stringify(parsed))

      if (!looksLikeBookingEvent(event, parsed)) {
        console.warn(
          `[Lodgify webhook] event[${i}] skipped (non-booking) action=${parsed.action ?? 'unknown'}`,
        )
        continue
      }

      try {
        const record = await prisma.lodgifyBooking.create({
          data: {
            bookingId: parsed.bookingId,
            propertyId: parsed.propertyId,
            roomId: parsed.roomId,
            guestName: parsed.guestName,
            guestEmail: parsed.guestEmail,
            arrival: parsed.arrival,
            departure: parsed.departure,
            status: parsed.status,
            action: parsed.action,
            source: parsed.source,
            // Store this array item (not the whole outer array)
            rawPayload: event as Prisma.InputJsonValue,
          },
        })
        savedIds.push(record.id)
        console.log(
          `[Lodgify webhook] SAVED event[${i}] id=${record.id} bookingId=${record.bookingId} ` +
            `guest=${record.guestName} property=${record.propertyId} status=${record.status}`,
        )

        // Also upsert into dashboard Booking table (idempotent on lodgifyBookingId)
        try {
          await upsertDashboardBookingFromLodgify(parsed, event)
        } catch (upsertErr) {
          const msg = upsertErr instanceof Error ? upsertErr.message : String(upsertErr)
          console.error(
            `[Lodgify webhook] Dashboard Booking upsert FAILED for event[${i}] bookingId=${parsed.bookingId}:`,
            msg,
          )
          console.error(
            '[Lodgify webhook] upsert stack:',
            upsertErr instanceof Error ? upsertErr.stack : 'n/a',
          )
          // Do not fail the webhook — LodgifyBooking log already saved
        }
      } catch (dbErr) {
        const msg = dbErr instanceof Error ? dbErr.message : String(dbErr)
        errors.push(`event[${i}]: ${msg}`)
        console.error(`[Lodgify webhook] DATABASE SAVE FAILED for event[${i}]`)
        console.error('[Lodgify webhook] error message:', msg)
        console.error('[Lodgify webhook] error stack:', dbErr instanceof Error ? dbErr.stack : 'n/a')
        if (dbErr && typeof dbErr === 'object' && 'code' in dbErr) {
          console.error('[Lodgify webhook] prisma code:', (dbErr as { code?: string }).code)
        }
      }
    }

    if (savedIds.length === 0 && errors.length > 0) {
      res.status(500).json({ ok: false, error: 'database_save_failed', detail: errors })
      return
    }

    res.status(200).json({
      ok: true,
      saved: savedIds.length > 0,
      count: savedIds.length,
      ids: savedIds,
      errors: errors.length ? errors : undefined,
    })
  } catch (err) {
    console.error('[Lodgify webhook] UNCAUGHT handler error:', err instanceof Error ? err.message : err)
    console.error('[Lodgify webhook] stack:', err instanceof Error ? err.stack : 'n/a')
    res.status(500).json({
      ok: false,
      error: 'Failed to save webhook',
      detail: err instanceof Error ? err.message : String(err),
    })
  }
}

/** GET /api/admin/lodgify-bookings — JWT protected list of webhook inbox rows */
export async function listLodgifyBookings(req: Request, res: Response, next: NextFunction) {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined
    const propertyIdRaw = typeof req.query.propertyId === 'string' ? req.query.propertyId : undefined
    const propertyIdFromQuery =
      propertyIdRaw && /^\d+$/.test(propertyIdRaw) ? parseInt(propertyIdRaw, 10) : undefined
    // Prefer explicit query; otherwise scope to LODGIFY_PROPERTY_ID when configured
    const propertyId = propertyIdFromQuery ?? scopedLodgifyPropertyId()

    const rows = await prisma.lodgifyBooking.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(propertyId != null ? { propertyId } : {}),
      },
      orderBy: { receivedAt: 'desc' },
      take: 500,
    })

    res.json({ count: rows.length, bookings: rows })
  } catch (err) {
    next(err)
  }
}
