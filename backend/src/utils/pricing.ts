import { env } from '../config/env'

export interface PriceBreakdown {
  nightlyRate: number
  nights: number
  subtotal: number
  serviceCharge: number
  municipalityFee: number
  vat: number
  total: number
}

export function computeBreakdown(nightlyRate: number, nights: number): PriceBreakdown {
  const subtotal = nightlyRate * nights
  const serviceCharge = Math.round(subtotal * env.fees.serviceCharge)
  const municipalityFee = Math.round(subtotal * env.fees.municipalityFee)
  const taxable = subtotal + serviceCharge + municipalityFee
  const vat = Math.round(taxable * env.fees.vat)
  const total = subtotal + serviceCharge + municipalityFee + vat
  return { nightlyRate, nights, subtotal, serviceCharge, municipalityFee, vat, total }
}

export function nightsBetween(checkIn: Date, checkOut: Date): number {
  const ms = checkOut.getTime() - checkIn.getTime()
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)))
}

export function applyDiscount(
  amount: number,
  discountType: 'PERCENTAGE' | 'FIXED_AED',
  discountValue: number,
): number {
  if (discountType === 'PERCENTAGE') {
    return Math.round(amount * (1 - discountValue / 100))
  }
  return Math.max(0, Math.round(amount - discountValue))
}

export function generateBookingRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let ref = 'SRN-'
  for (let i = 0; i < 8; i++) {
    ref += chars[Math.floor(Math.random() * chars.length)]
  }
  return ref
}

export function parseDate(dateStr: string): Date {
  const iso = dateStr.includes('T') ? dateStr : `${dateStr.slice(0, 10)}T00:00:00.000Z`
  const d = new Date(iso)
  if (isNaN(d.getTime())) throw new Error(`Invalid date: ${dateStr}`)
  d.setUTCHours(0, 0, 0, 0)
  return d
}
