import { prisma } from '../config/database'
import { env } from '../config/env'

export const SUPPORTED_CURRENCIES = ['AED', 'USD', 'EUR', 'GBP'] as const
export type Currency = (typeof SUPPORTED_CURRENCIES)[number]

/** Get all rates from AED to supported currencies. */
export async function getAllRates(): Promise<Record<string, number>> {
  const records = await prisma.currencyRate.findMany({
    where: { fromCurrency: 'AED' },
  })

  const rates: Record<string, number> = { AED: 1 }
  for (const r of records) {
    rates[r.toCurrency] = r.rate
  }
  return rates
}

export async function getRate(toCurrency: string): Promise<number> {
  if (toCurrency === 'AED') return 1

  const record = await prisma.currencyRate.findUnique({
    where: { fromCurrency_toCurrency: { fromCurrency: 'AED', toCurrency } },
  })

  if (!record) throw new Error(`No rate found for AED → ${toCurrency}`)
  return record.rate
}

export function convertAmount(aedAmount: number, rate: number): number {
  return Math.round(aedAmount * rate)
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
          }),
        ),
    )

    console.log('[Currency] Rates synced from API')
  } catch (err) {
    console.error('[Currency] Failed to sync rates:', err)
  }
}
