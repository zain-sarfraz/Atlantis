/** Lodgify inbox channel labels (mirrors Lodgify Reservations → Channels filter). */
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

export function normalizeLodgifyChannel(raw: string | null | undefined): LodgifyChannel {
  if (raw == null || String(raw).trim() === '') return 'Others'
  const label = String(raw).trim()
  if (CHANNEL_SET.has(label)) return label as LodgifyChannel

  const key = label.toLowerCase().replace(/[^a-z0-9]+/g, '')

  if (key.includes('airbnb')) return 'Airbnb'
  if (key.includes('bookingcom') || key === 'booking') return 'Booking.com'
  if (key.includes('expedia')) return 'Expedia'
  if (key.includes('vrbo') || key.includes('homeaway')) return 'Vrbo'
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

export const CHANNEL_BADGE_STYLES: Record<
  LodgifyChannel,
  { bg: string; text: string; dot: string }
> = {
  Airbnb: { bg: 'bg-[#FF5A5F]/15', text: 'text-[#E31C5F]', dot: 'bg-[#FF5A5F]' },
  'Booking.com': { bg: 'bg-[#003580]/15', text: 'text-[#003580]', dot: 'bg-[#003580]' },
  Expedia: { bg: 'bg-[#FFC72C]/25', text: 'text-[#1a1a1a]', dot: 'bg-[#FFC72C]' },
  Vrbo: { bg: 'bg-[#3B5998]/15', text: 'text-[#3B5998]', dot: 'bg-[#3B5998]' },
  Manual: { bg: 'bg-slate-200', text: 'text-slate-700', dot: 'bg-slate-500' },
  Websites: { bg: 'bg-emerald-100', text: 'text-emerald-800', dot: 'bg-emerald-600' },
  GVR: { bg: 'bg-sky-100', text: 'text-sky-800', dot: 'bg-sky-500' },
  Others: { bg: 'bg-amber-100', text: 'text-amber-900', dot: 'bg-amber-500' },
}
