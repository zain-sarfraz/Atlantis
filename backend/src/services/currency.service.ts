import { prisma } from '../config/database'
import { env } from '../config/env'

export const SUPPORTED_CURRENCIES = ['AED', 'USD', 'EUR', 'GBP'] as const
export type Currency = (typeof SUPPORTED_CURRENCIES)[number]

type RatesCache = {
  rates: Record<string, number>
  fetchedAt: number
}

const CACHE_TTL_MS = 3 * 60 * 60 * 1000 // 3 hours
let memoryCache: RatesCache | null = null

/** Clear in-memory FX cache after admin edits so guest search picks up new rates. */
export function invalidateRatesCache() {
  memoryCache = null
}

/** Get all rates from AED to supported currencies (DB). */
export async function getAllRates(): Promise<Record<string, number>> {
  const rates: Record<string, number> = { AED: 1, USD: 0.272, EUR: 0.25, GBP: 0.215 }
  try {
    const records = await prisma.currencyRate.findMany({
      where: { fromCurrency: 'AED' },
    })
    for (const r of records) {
      rates[r.toCurrency] = r.rate
    }
  } catch {
    /* fallback to default rates */
  }
  return rates
}

/** Cached rates; refreshes from API when stale. */
export async function getAllRatesCached(): Promise<Record<string, number>> {
  const now = Date.now()
  if (memoryCache && now - memoryCache.fetchedAt < CACHE_TTL_MS) {
    return memoryCache.rates
  }

  try {
    const latest = await prisma.currencyRate.findFirst({
      where: { fromCurrency: 'AED' },
      orderBy: { lastUpdated: 'desc' },
    }).catch(() => null)
    const dbAge = latest?.lastUpdated ? now - latest.lastUpdated.getTime() : Number.POSITIVE_INFINITY
    if (dbAge > CACHE_TTL_MS) {
      await syncRatesFromApi().catch(() => null)
    }
  } catch {
    /* ignore db errors */
  }

  const rates = await getAllRates()
  memoryCache = { rates, fetchedAt: now }
  return rates
}

export async function getRate(toCurrency: string): Promise<number> {
  if (toCurrency === 'AED') return 1

  try {
    const record = await prisma.currencyRate.findUnique({
      where: { fromCurrency_toCurrency: { fromCurrency: 'AED', toCurrency } },
    })
    if (record) return record.rate
  } catch {
    /* ignore db error */
  }

  const defaultRates: Record<string, number> = { USD: 0.272, EUR: 0.25, GBP: 0.215 }
  return defaultRates[toCurrency] ?? 1
}

/** Legacy whole-number convert (guest search). Prefer convertForDisplay for UI. */
export function convertAmount(aedAmount: number, rate: number): number {
  return Math.round(aedAmount * rate)
}

/**
 * Convert AED → currency with sensible rounding:
 * AED: integer; USD/EUR/GBP: 2 decimals.
 */
export function convertForDisplay(
  aedAmount: number,
  currency: string,
  rates: Record<string, number>,
): number {
  const rate = rates[currency] ?? (currency === 'AED' ? 1 : 0)
  const raw = aedAmount * rate
  if (currency === 'AED') return Math.round(raw)
  return Math.round(raw * 100) / 100
}

export function formatConverted(
  aedAmount: number,
  currency: string,
  rates: Record<string, number>,
): string {
  const value = convertForDisplay(aedAmount, currency, rates)
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      minimumFractionDigits: currency === 'AED' ? 0 : 2,
      maximumFractionDigits: currency === 'AED' ? 0 : 2,
    }).format(value)
  } catch {
    return `${currency} ${value}`
  }
}

/** Fetch live rates from external API and update the DB. */
export async function syncRatesFromApi(): Promise<void> {
  if (!env.exchangeRateApiKey && !env.exchangeRateApiUrl) return

  try {
    const res = await fetch(env.exchangeRateApiUrl)
    if (!res.ok) throw new Error(`API responded ${res.status}`)
    const data = (await res.json()) as { rates?: Record<string, number> }

    const rates = data.rates
    if (!rates) throw new Error('Unexpected API response shape')

    const targets = SUPPORTED_CURRENCIES.filter((c) => c !== 'AED')
    await Promise.all(
      targets
        .filter((c) => rates[c] !== undefined)
        .map((c) =>
          prisma.currencyRate.upsert({
            where: { fromCurrency_toCurrency: { fromCurrency: 'AED', toCurrency: c } },
            update: { rate: rates[c], lastUpdated: new Date() },
            create: { fromCurrency: 'AED', toCurrency: c, rate: rates[c] },
          }).catch(() => null),
        ),
    )

    memoryCache = null
    console.log('[Currency] Rates synced from API')
  } catch (err) {
    console.error('[Currency] Failed to sync rates:', err)
  }
}
