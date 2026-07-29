/**
 * One-time Lodgify webhook registration.
 *
 * Official API (docs.lodgify.com/reference/webhooks):
 *   POST https://api.lodgify.com/webhooks/v1/subscribe
 *   Body: { "target_url": "<https url>", "event": "<event name>" }
 *
 * One subscription = one event. target_url must be unique per subscription,
 * so we append ?event=<name> while still hitting the same Express route.
 *
 * Save the returned `secret` into LODGIFY_WEBHOOK_SECRET (only shown once).
 *
 * Usage:
 *   node scripts/register-lodgify-webhook.js
 */

require('dotenv').config()
const axios = require('axios')

const API_KEY = process.env.LODGIFY_API_KEY?.trim()
const BASE = 'https://api.lodgify.com'
const TARGET_BASE =
  process.env.LODGIFY_WEBHOOK_TARGET_URL?.trim() ||
  'https://imprint-fernlike-flattery.ngrok-free.dev/api/webhooks/lodgify'

/** Booking-related events from Lodgify webhook docs / event enum */
const EVENTS = [
  'booking_new_any_status',
  'booking_new_status_booked',
  'booking_change',
  'booking_status_change_booked',
  'booking_status_change_tentative',
  'booking_status_change_open',
  'booking_status_change_declined',
]

if (!API_KEY) {
  console.error('Missing LODGIFY_API_KEY in .env')
  process.exit(1)
}

const client = axios.create({
  baseURL: BASE,
  timeout: 30_000,
  headers: {
    'X-ApiKey': API_KEY,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

function targetForEvent(event) {
  const url = new URL(TARGET_BASE)
  url.searchParams.set('event', event)
  return url.toString()
}

async function subscribe(event) {
  const body = {
    target_url: targetForEvent(event),
    event,
  }

  // Primary path from Lodgify webhook client docs: /webhooks/v1/subscribe
  try {
    const { data, status } = await client.post('/webhooks/v1/subscribe', body)
    return { ok: true, status, data, path: '/webhooks/v1/subscribe' }
  } catch (err) {
    const status = err.response?.status
    const data = err.response?.data
    // Fallback some accounts still expose under /v1/...
    if (status === 404) {
      const fallback = await client.post('/v1/webhooks/v1/subscribe', body).catch((e) => {
        throw Object.assign(e, { primaryStatus: status, primaryData: data })
      })
      return {
        ok: true,
        status: fallback.status,
        data: fallback.data,
        path: '/v1/webhooks/v1/subscribe',
      }
    }
    const error = new Error(`Subscribe failed for ${event}`)
    error.status = status
    error.data = data
    error.body = body
    throw error
  }
}

async function main() {
  console.log('Lodgify webhook registration')
  console.log('  Base target:', TARGET_BASE)
  console.log('  Events:', EVENTS.join(', '))
  console.log('')

  const results = []
  let firstSecret = null

  for (const event of EVENTS) {
    try {
      const result = await subscribe(event)
      results.push({ event, ...result })
      console.log(`✓ ${event}`)
      console.log(`  path: ${result.path} → HTTP ${result.status}`)
      console.log(`  response:`, JSON.stringify(result.data, null, 2))

      const secret =
        result.data?.secret ??
        result.data?.signing_secret ??
        result.data?.webhook_secret ??
        null
      if (secret && !firstSecret) firstSecret = secret

      const id = result.data?.id ?? result.data?.webhook_id
      if (id) console.log(`  webhook id: ${id}`)
      if (secret) console.log(`  secret (save this!): ${secret}`)
      console.log('')
    } catch (err) {
      const status = err.status ?? err.response?.status
      const data = err.data ?? err.response?.data ?? err.message
      results.push({ event, ok: false, status, data })
      console.error(`✗ ${event} → HTTP ${status ?? 'error'}`)
      console.error(`  `, typeof data === 'string' ? data : JSON.stringify(data, null, 2))
      if (status === 409) {
        console.error('  (409 usually means this target_url is already subscribed)')
      }
      console.log('')
    }
  }

  const okCount = results.filter((r) => r.ok).length
  console.log(`Done: ${okCount}/${EVENTS.length} subscriptions created/accepted.`)
  console.log('Verify with: node scripts/list-lodgify-webhooks.js')

  if (firstSecret) {
    console.log('')
    console.log('IMPORTANT: Copy the webhook secret into backend/.env:')
    console.log(`  LODGIFY_WEBHOOK_SECRET="${firstSecret}"`)
    console.log('Lodgify only returns the secret at subscribe time.')
    console.log('Signature header on deliveries: ms-signature: sha256=<HEX>')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
