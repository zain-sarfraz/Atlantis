/**
 * List active Lodgify webhook subscriptions.
 *
 * Official API (docs.lodgify.com/reference/webhooks):
 *   GET https://api.lodgify.com/webhooks/v1/list
 *
 * Usage:
 *   node scripts/list-lodgify-webhooks.js
 */

require('dotenv').config()
const axios = require('axios')

const API_KEY = process.env.LODGIFY_API_KEY?.trim()
const BASE = 'https://api.lodgify.com'

if (!API_KEY) {
  console.error('Missing LODGIFY_API_KEY in .env')
  process.exit(1)
}

const client = axios.create({
  baseURL: BASE,
  timeout: 30_000,
  headers: {
    'X-ApiKey': API_KEY,
    Accept: 'application/json',
  },
})

async function listWebhooks() {
  try {
    const { data, status } = await client.get('/webhooks/v1/list')
    return { status, data, path: '/webhooks/v1/list' }
  } catch (err) {
    if (err.response?.status === 404) {
      const { data, status } = await client.get('/v1/webhooks/v1/list')
      return { status, data, path: '/v1/webhooks/v1/list' }
    }
    throw err
  }
}

function normalizeList(data) {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    if (Array.isArray(data.webhooks)) return data.webhooks
    if (Array.isArray(data.items)) return data.items
    if (Array.isArray(data.data)) return data.data
  }
  return []
}

async function main() {
  console.log('Fetching Lodgify webhook subscriptions…')
  const { status, data, path } = await listWebhooks()
  console.log(`GET ${path} → HTTP ${status}`)
  console.log('Raw response:', JSON.stringify(data, null, 2))

  const webhooks = normalizeList(data)
  console.log('')
  console.log(`Found ${webhooks.length} subscription(s):`)
  for (const wh of webhooks) {
    const url = wh.target_url ?? wh.targetUrl ?? wh.url ?? '?'
    console.log(
      `  - id=${wh.id ?? '?'}  event=${wh.event ?? '?'}  url=${url}  status=${wh.status ?? 'n/a'}`,
    )
  }
}

main().catch((err) => {
  console.error('List failed:', err.response?.status, err.response?.data ?? err.message)
  process.exit(1)
})
