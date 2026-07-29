import { useEffect, useState } from 'react'
import { currencyApi, type CurrencyRate } from '../api/client'
import PageHeader from '../components/PageHeader'
import { RefreshCw, Save } from 'lucide-react'

const CURRENCIES = ['USD', 'EUR', 'GBP']
const CURRENCY_NAMES: Record<string, string> = {
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
}

export default function CurrencyPage() {
  const [rates, setRates] = useState<CurrencyRate[]>([])
  const [editRates, setEditRates] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [msg, setMsg] = useState('')

  async function load() {
    const data = await currencyApi.list()
    setRates(data)
    const map: Record<string, number> = {}
    data.forEach((r) => { map[r.toCurrency] = r.rate })
    setEditRates(map)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function saveRate(currency: string) {
    setSaving(true)
    setMsg('')
    try {
      await currencyApi.upsert({ toCurrency: currency, rate: editRates[currency] ?? 0 })
      setMsg(`✓ ${currency} rate saved`)
      await load()
    } catch (e: unknown) {
      setMsg(`Error: ${(e as Error).message}`)
    } finally { setSaving(false) }
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
    } finally { setSyncing(false) }
  }

  const lastUpdated = rates[0]?.lastUpdated
    ? new Date(rates[0].lastUpdated).toLocaleString('en-GB')
    : 'never'

  return (
    <div>
      <PageHeader
        title="Currency Rates"
        subtitle="Manage AED exchange rates for the booking engine"
        action={
          <button
            onClick={syncAll}
            disabled={syncing}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            Sync Live Rates
          </button>
        }
      />

      {msg && (
        <div className="mb-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700 border border-blue-100">{msg}</div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-800">Exchange Rates (Base: AED)</p>
            <p className="text-xs text-slate-500 mt-0.5">Last updated: {lastUpdated}</p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading…</div>
        ) : (
          <div className="divide-y divide-slate-100">
            <div className="grid grid-cols-4 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 bg-white">
              <span>Currency</span>
              <span>Name</span>
              <span>1 AED =</span>
              <span>Actions</span>
            </div>
            {/* AED base */}
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
                    onChange={(e) => setEditRates((prev) => ({ ...prev, [currency]: Number(e.target.value) }))}
                    className="w-32 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-[#bca37f] focus:ring-2 focus:ring-[#bca37f]/20"
                  />
                </div>
                <button
                  onClick={() => saveRate(currency)}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg bg-[#5e544b] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#4a4238] transition disabled:opacity-50 w-fit"
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
          Clicking "Sync Live Rates" fetches current rates from the exchange rate API configured in your
          backend <code className="font-mono bg-amber-100 px-1 rounded">.env</code> file. If no API key is set,
          rates are not updated. You can always update rates manually above.
        </p>
      </div>
    </div>
  )
}
