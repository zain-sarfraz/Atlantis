import { FEE_RATES, CURRENCY_SYMBOLS } from '../data/mock-data'
import type { Currency, PriceBreakdown } from '../types'

/** Live FX rates from admin API (AED base). Falls back to 1 for AED. */
let liveRates: Record<string, number> = { AED: 1, USD: 0.272, EUR: 0.25, GBP: 0.215 }

export function setCurrencyRates(rates: Record<string, number>) {
  liveRates = { AED: 1, ...rates }
}

export function getCurrencyRate(currency: Currency): number {
  return liveRates[currency] ?? 1
}

export function nightsBetween(checkIn: Date, checkOut: Date): number {
  const ms = checkOut.getTime() - checkIn.getTime()
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)))
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

export function computeBreakdown(
  nightlyRate: number,
  nights: number,
): PriceBreakdown {
  const subtotal = roundMoney(nightlyRate * nights)
  const serviceCharge = roundMoney(subtotal * FEE_RATES.serviceCharge)
  const municipalityFee = roundMoney(subtotal * FEE_RATES.municipalityFee)
  const taxable = subtotal + serviceCharge + municipalityFee
  const vat = roundMoney(taxable * FEE_RATES.vat)
  const total = roundMoney(subtotal + serviceCharge + municipalityFee + vat)

  return {
    nightlyRate,
    nights,
    subtotal,
    serviceCharge,
    municipalityFee,
    vat,
    total,
  }
}

/** Convert AED amount into selected currency using live admin rates */
export function convertAmount(aed: number, currency: Currency): number {
  const raw = aed * getCurrencyRate(currency)
  if (currency === 'AED') return Math.round(raw)
  return Math.round(raw * 100) / 100
}

/**
 * Format a money amount already denominated in `currency`
 * (search API returns converted rates — do not convert again).
 * AED: whole numbers; USD/EUR/GBP: 2 decimals.
 */
export function formatMoney(amount: number, currency: Currency): string {
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      minimumFractionDigits: currency === 'AED' ? 0 : 2,
      maximumFractionDigits: currency === 'AED' ? 0 : 2,
    }).format(amount)
  } catch {
    const symbol = CURRENCY_SYMBOLS[currency] ?? currency
    const n = currency === 'AED' ? Math.round(amount) : Math.round(amount * 100) / 100
    return `${symbol} ${n.toLocaleString()}`
  }
}

export function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function isBeforeDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() < startOfDay(b).getTime()
}

export function addMonths(date: Date, n: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + n)
  return d
}

export function formatDisplayDate(d: Date | null): string {
  if (!d) return 'Select date'
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
