import { useEffect, useMemo, useState } from 'react'
import { currencyApi, type CurrencyRate } from '../api/client'
import PageHeader from '../components/PageHeader'
import { RefreshCw, Save } from 'lucide-react'

const CURRENCIES = ['USD', 'EUR', 'GBP'] as const
const CURRENCY_NAMES: Record<string, string> = {
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
}

function convertDisplay(aed: number, currency: string, rate: number): number {
  const raw = aed * rate
  if (currency === 'AED') return Math.round(raw)
  return Math.round(raw * 100) / 100
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'AED' ? 0 : 2,
    maximumFractionDigits: currency === 'AED' ? 0 : 2,
  }).format(amount)
}

export default function CurrencyPage() {
  const [rates, setRates] = useState<CurrencyRate[]>([])
  const [editRates, setEditRates] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [msg, setMsg] = useState('')
  const [sampleAed, setSampleAed] = useState(1396)

  async function load() {
    const data = await currencyApi.list()
    setRates(data)
    const map: Record<string, number> = { AED: 1 }
    data.forEach((r) => {
      map[r.toCurrency] = r.rate
    })
    setEditRates(map)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function saveRate(currency: string) {
    setSaving(true)
    setMsg('')
    try {
      const rate = editRates[currency]
      if (!(rate > 0)) throw new Error('Rate must be greater than 0')
      await currencyApi.upsert({ toCurrency: currency, rate })
      setMsg(`✓ ${currency} rate saved — guest booking will use this instantly`)
      await load()
    } catch (e: unknown) {
      setMsg(`Error: ${(e as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  async function syncAll() {
    setSyncing(true)
    setMsg('')
    try {
      await currencyApi.sync()
      setMsg('✓ Rates synced from live API')
      await load()
    } catch (e: unknown) {
      setMsg(`Sync failed: ${(e as Error).message}`)
    } finally {
      setSyncing(false)
    }
  }

  const lastUpdated = rates[0]?.lastUpdated
    ? new Date(rates[0].lastUpdated).toLocaleString('en-GB')
    : 'never'

  const preview = useMemo(() => {
    const aed = Number(sampleAed) || 0
    return {
      AED: convertDisplay(aed, 'AED', 1),
      USD: convertDisplay(aed, 'USD', editRates.USD ?? 0),
      EUR: convertDisplay(aed, 'EUR', editRates.EUR ?? 0),
      GBP: convertDisplay(aed, 'GBP', editRates.GBP ?? 0),
    }
  }, [sampleAed, editRates])

  return (
    <div>
      <PageHeader
        title="Currency Rates"
        subtitle="Manage AED exchange rates for the booking engine"
        action={
          <button
            type="button"
            onClick={syncAll}
            disabled={syncing}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            Sync Live Rates
          </button>
        }
      />

      {msg && (
        <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {msg}
        </div>
      )}

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-2 text-sm font-semibold text-slate-800">Conversion preview</p>
        <p className="mb-3 text-xs text-slate-500">
          Enter a nightly villa rate in AED to see guest-facing prices in all currencies.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Sample AED / night</span>
            <input
              type="number"
              min={0}
              value={sampleAed}
              onChange={(e) => setSampleAed(Number(e.target.value))}
              className="w-40 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#bca37f]"
            />
          </label>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          {(['AED', 'USD', 'EUR', 'GBP'] as const).map((c) => (
            <div key={c} className="rounded-lg bg-slate-50 px-3 py-3">
              <p className="text-xs font-medium uppercase text-slate-500">{c}</p>
              <p className="mt-1 text-lg font-semibold text-[#5e544b]">
                {formatMoney(preview[c], c)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
          <div>
            <p className="font-semibold text-slate-800">Exchange Rates (Base: AED)</p>
            <p className="mt-0.5 text-xs text-slate-500">Last updated: {lastUpdated}</p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">Loading…</div>
        ) : (
          <div className="divide-y divide-slate-100">
            <div className="grid grid-cols-4 bg-white px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span>Currency</span>
              <span>Name</span>
              <span>1 AED =</span>
              <span>Actions</span>
            </div>
            <div className="grid grid-cols-4 items-center px-6 py-4">
              <span className="font-mono font-bold text-slate-800">AED</span>
              <span className="text-slate-600">UAE Dirham (base)</span>
              <span className="text-slate-600">1.00000</span>
              <span className="text-xs text-slate-400">Base currency</span>
            </div>
            {CURRENCIES.map((currency) => (
              <div key={currency} className="grid grid-cols-4 items-center px-6 py-4">
                <span className="font-mono font-bold text-slate-800">{currency}</span>
                <span className="text-slate-600">{CURRENCY_NAMES[currency]}</span>
                <div>
                  <input
                    type="number"
                    step="0.00001"
                    min={0}
                    value={editRates[currency] ?? ''}
                    onChange={(e) =>
                      setEditRates((prev) => ({ ...prev, [currency]: Number(e.target.value) }))
                    }
                    className="w-32 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-[#bca37f] focus:ring-2 focus:ring-[#bca37f]/20"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => saveRate(currency)}
                  disabled={saving}
                  className="flex w-fit items-center gap-1.5 rounded-lg bg-[#5e544b] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#4a4238] disabled:opacity-50"
                >
                  <Save size={12} /> Save
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 p-5">
        <p className="text-sm font-medium text-amber-800">About Live Sync</p>
        <p className="mt-1 text-sm text-amber-700">
          "Sync Live Rates" fetches from the exchange API in backend{' '}
          <code className="rounded bg-amber-100 px-1 font-mono">.env</code>. Saved rates power the
          guest currency dropdown (AED / USD / EUR / GBP) with AED as whole numbers and others to 2
          decimals.
        </p>
      </div>
    </div>
  )
}
