/**
 * Lodgify inbox "Channels" taxonomy (matches app.lodgify.com/reservations/inbox).
 */
export const LODGIFY_CHANNELS = [
  'Airbnb',
  'Booking.com',
  'Expedia',
  'Vrbo',
  'Manual',
  'Websites',
  'GVR',
  'Others',
] as const

export type LodgifyChannel = (typeof LODGIFY_CHANNELS)[number]

const CHANNEL_SET = new Set<string>(LODGIFY_CHANNELS)

/** Raw Lodgify `source` / `source_text` strings → inbox channel. */
export function normalizeLodgifyChannel(raw: string | null | undefined): LodgifyChannel {
  if (raw == null || String(raw).trim() === '') return 'Others'
  const label = String(raw).trim()
  if (CHANNEL_SET.has(label)) return label as LodgifyChannel

  const key = label.toLowerCase().replace(/[^a-z0-9]+/g, '')

  if (key.includes('airbnb')) return 'Airbnb'
  if (key.includes('bookingcom') || key === 'booking' || key.includes('bookingcomintegration')) {
    return 'Booking.com'
  }
  if (key.includes('expedia')) return 'Expedia'
  if (key.includes('vrbo') || key.includes('homeaway') || key.includes('homeawaycom')) return 'Vrbo'
  if (key === 'manual' || key.includes('manualbooking') || key.includes('owner')) return 'Manual'
  if (
    key.includes('website') ||
    key.includes('bookingsystem') ||
    key.includes('direct') ||
    key.includes('ical') ||
    key === 'web'
  ) {
    return 'Websites'
  }
  if (key.includes('gvr') || key.includes('googlevacation') || key.includes('google')) return 'GVR'

  return 'Others'
}

/**
 * Expand a channel to every known raw/normalized value we may have stored
 * historically in Booking.lodgifySource.
 */
export function channelSourceMatchers(channel: LodgifyChannel): string[] {
  switch (channel) {
    case 'Airbnb':
      return ['Airbnb', 'AirbnbIntegration', 'AirBnb', 'airbnb']
    case 'Booking.com':
      return ['Booking.com', 'BookingCom', 'BookingComIntegration', 'Booking']
    case 'Expedia':
      return ['Expedia', 'ExpediaIntegration']
    case 'Vrbo':
      return ['Vrbo', 'VRBO', 'HomeAway', 'HomeAwayCom']
    case 'Manual':
      return ['Manual', 'ManualBooking', 'Owner']
    case 'Websites':
      return [
        'Websites',
        'Website',
        'WebsitesIntegration',
        'Booking System',
        'BookingSystem',
        'Direct',
        'Direct Website',
        'iCal',
      ]
    case 'GVR':
      return ['GVR', 'Google', 'GoogleVacationRentals']
    case 'Others':
      return ['Others', 'Other', 'Lodgify', 'Unknown']
    default:
      return [channel]
  }
}

/** Prisma-friendly OR clauses for selected channels (including null → Others). */
export function lodgifySourceWhereForChannels(
  channels: LodgifyChannel[],
): { lodgifySource: string | null }[] | undefined {
  if (!channels.length || channels.length === LODGIFY_CHANNELS.length) return undefined

  const clauses: { lodgifySource: string | null }[] = []
  const seen = new Set<string | null>()

  for (const ch of channels) {
    for (const value of channelSourceMatchers(ch)) {
      if (seen.has(value)) continue
      seen.add(value)
      clauses.push({ lodgifySource: value })
    }
    if (ch === 'Others' && !seen.has(null)) {
      seen.add(null)
      clauses.push({ lodgifySource: null })
    }
  }

  return clauses
}

export function parseChannelsQuery(raw: unknown): LodgifyChannel[] | undefined {
  if (raw == null || raw === '') return undefined
  const parts = String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const channels = parts
    .map((p) => normalizeLodgifyChannel(p))
    .filter((c, i, arr) => arr.indexOf(c) === i)
  return channels.length ? channels : undefined
}
