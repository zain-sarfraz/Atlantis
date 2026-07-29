/**
 * Smoke-test the Lodgify webhook receiver without a real Lodgify booking.
 *
 * Usage (backend must be running on PORT, default 3001):
 *   npx tsx scripts/test-webhook.ts
 *
 * Then list saved rows:
 *   GET http://localhost:3001/api/admin/lodgify-bookings
 *   (Authorization: Bearer <admin JWT>)
 *
 * Or via MySQL:
 *   SELECT id, bookingId, propertyId, guestName, status, receivedAt FROM LodgifyBooking ORDER BY receivedAt DESC LIMIT 10;
 */

import crypto from 'crypto'
import 'dotenv/config'

const port = process.env.PORT || '3001'
const url = `http://localhost:${port}/api/webhooks/lodgify`
const secret = process.env.LODGIFY_WEBHOOK_SECRET?.trim() || ''

const samplePayload = {
  action: 'booking_new_status_booked',
  booking: {
    type: 'Booking',
    id: 999001,
    date_arrival: '2026-09-01T00:00:00',
    date_departure: '2026-09-05T00:00:00',
    date_created: new Date().toISOString(),
    property_id: 10000,
    property_name: 'Test Property',
    status: 'Booked',
    room_types: [
      {
        id: 1,
        room_type_id: 12345,
        name: 'Master Suite',
        guest_breakdown: { adults: 2, children: 0, infants: 0, pets: 0 },
      },
    ],
    currency_code: 'AED',
    source: 'ManualTest',
    source_text: 'Webhook Test Script',
    nights: 4,
  },
  guest: {
    uid: 'test-guest-uid',
    name: 'Webhook Test Guest',
    email: 'webhook-test@example.com',
    phone_number: '+971500000000',
  },
  booking_total_amount: '1200',
  booking_currency_code: 'AED',
}

async function main() {
  const body = JSON.stringify(samplePayload)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (secret) {
    const digest = crypto.createHmac('sha256', secret).update(body).digest('hex').toUpperCase()
    headers['ms-signature'] = `sha256=${digest}`
    console.log('Sending signed webhook (ms-signature / LODGIFY_WEBHOOK_SECRET)')
  } else {
    console.log('Sending unsigned webhook (LODGIFY_WEBHOOK_SECRET not set)')
  }

  const res = await fetch(url, { method: 'POST', headers, body })
  const text = await res.text()
  console.log(`POST ${url} → ${res.status}`)
  console.log(text)

  if (!res.ok) {
    process.exit(1)
  }

  console.log('\nNext: check inbox via admin API or MySQL:')
  console.log('  GET /api/admin/lodgify-bookings')
  console.log(
    '  SELECT id, bookingId, guestName, status, receivedAt FROM LodgifyBooking ORDER BY receivedAt DESC LIMIT 5;',
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
