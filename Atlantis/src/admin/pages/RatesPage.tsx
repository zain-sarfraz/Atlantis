import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import {
  roomsApi,
  villaRatesApi,
  type CurrencyCode,
  type RoomType,
  type VillaRateDay,
} from '../api/client'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function getMonthDays(year: number, month: number): Date[] {
  const days: Date[] = []
  const d = new Date(Date.UTC(year, month - 1, 1))
  while (d.getUTCMonth() === month - 1) {
    days.push(new Date(d))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return days
}

function toISO(d: Date) {
  return d.toISOString().slice(0, 10)
}

function convertPreview(aed: number, currency: CurrencyCode, rates: Record<string, number>): number {
  const rate = rates[currency] ?? (currency === 'AED' ? 1 : 0)
  const raw = aed * rate
  if (currency === 'AED') return Math.round(raw)
  return Math.round(raw * 100) / 100
}

function formatMoney(amount: number, currency: CurrencyCode) {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'AED' ? 0 : 2,
    maximumFractionDigits: currency === 'AED' ? 0 : 2,
  }).format(amount)
}

function pickLimiriaVilla(rooms: RoomType[]): RoomType | undefined {
  return (
    rooms.find((r) => /limiria/i.test(r.name) || r.lodgifyPropertyId === 714507) ??
    rooms.find((r) => /palm|zanzibar/i.test(r.name)) ??
    rooms[0]
  )
}

function CurrencyPreviewBox({
  aed,
  rates,
  currency,
  onCurrencyChange,
}: {
  aed: number
  rates: Record<string, number>
  currency: CurrencyCode
  onCurrencyChange: (c: CurrencyCode) => void
}) {
  const currencies: CurrencyCode[] = ['AED', 'USD', 'EUR', 'GBP']
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Live preview</p>
        <select
          value={currency}
          onChange={(e) => onCurrencyChange(e.target.value as CurrencyCode)}
          className="rounded border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700"
        >
          {currencies.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <p className="text-2xl font-semibold text-[#5e544b]">
        {formatMoney(convertPreview(aed || 0, currency, rates), currency)}
        <span className="ml-1 text-sm font-normal text-slate-500">/ night</span>
      </p>
      <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-slate-600 sm:grid-cols-4">
        {currencies.map((c) => (
          <span key={c}>
            {c}: {formatMoney(convertPreview(aed || 0, c, rates), c)}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function RatesPage() {
  const [villa, setVilla] = useState<RoomType | null>(null)
  const villaId = villa?.id ?? ''
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  })
  const [days, setDays] = useState<VillaRateDay[]>([])
  const [yearly, setYearly] = useState<number | null>(null)
  const [monthly, setMonthly] = useState<number | null>(null)
  const [fx, setFx] = useState<Record<string, number>>({ AED: 1 })
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>('AED')
  const [yearlyInput, setYearlyInput] = useState('')
  const [monthInputs, setMonthInputs] = useState<Record<number, string>>({})
  const [rangeFrom, setRangeFrom] = useState<string | null>(null)
  const [rangeTo, setRangeTo] = useState<string | null>(null)
  const [datePrice, setDatePrice] = useState('')
  const [syncLodgify, setSyncLodgify] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    roomsApi.listRooms().then((rms) => {
      const picked = pickLimiriaVilla(rms.filter((r) => r.isActive))
      if (picked) setVilla(picked)
    })
  }, [])

  const loadCalendar = useCallback(async () => {
    if (!villaId) return
    setLoading(true)
    setErr('')
    try {
      const month = `${currentDate.year}-${String(currentDate.month).padStart(2, '0')}`
      const res = await villaRatesApi.calendar(villaId, month)
      setDays(res.days)
      setYearly(res.yearly)
      setMonthly(res.monthly)
      setFx(res.exchangeRates ?? { AED: 1 })
      if (res.yearly != null) setYearlyInput(String(res.yearly))
      if (res.monthly != null) {
        setMonthInputs((prev) => ({ ...prev, [currentDate.month]: String(res.monthly) }))
      }
    } catch (e: unknown) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [villaId, currentDate])

  useEffect(() => {
    loadCalendar()
  }, [loadCalendar])

  const dayMap = useMemo(() => new Map(days.map((d) => [d.date, d])), [days])
  const calendarDays = getMonthDays(currentDate.year, currentDate.month)
  const firstDow = calendarDays[0]?.getUTCDay() ?? 0
  const selectedVilla = villa

  function inRange(date: string) {
    if (!rangeFrom) return false
    const end = rangeTo ?? rangeFrom
    const a = rangeFrom <= end ? rangeFrom : end
    const b = rangeFrom <= end ? end : rangeFrom
    return date >= a && date <= b
  }

  function onDayClick(date: string) {
    if (!rangeFrom || (rangeFrom && rangeTo)) {
      setRangeFrom(date)
      setRangeTo(null)
      const d = dayMap.get(date)
      if (d) setDatePrice(String(d.priceAed))
      return
    }
    setRangeTo(date)
  }

  async function saveYearly() {
    const price = Number(yearlyInput)
    if (!villaId || !(price > 0)) return
    setSaving(true)
    setMsg('')
    setErr('')
    try {
      const res = await villaRatesApi.setYearly(villaId, { basePrice: price, syncLodgify })
      setMsg(res.message ?? 'Yearly rate saved')
      if (res.lodgify) setMsg((m) => `${m}. ${res.lodgify!.message}`)
      await loadCalendar()
    } catch (e: unknown) {
      setErr((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function saveMonth(month: number) {
    const price = Number(monthInputs[month] ?? '')
    if (!villaId || !(price > 0)) return
    setSaving(true)
    setMsg('')
    setErr('')
    try {
      const res = await villaRatesApi.setMonthly(villaId, { month, basePrice: price })
      setMsg(res.message ?? 'Monthly rate saved')
      await loadCalendar()
    } catch (e: unknown) {
      setErr((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function saveDateRange() {
    if (!villaId || !rangeFrom) return
    const price = Number(datePrice)
    if (!(price > 0)) return
    const from = rangeTo && rangeTo < rangeFrom ? rangeTo : rangeFrom
    const to = rangeTo && rangeTo > rangeFrom ? rangeTo : rangeFrom
    setSaving(true)
    setMsg('')
    setErr('')
    try {
      const res = await villaRatesApi.setDates(villaId, {
        from,
        to: to ?? from,
        basePrice: price,
        syncLodgify,
      })
      setMsg(res.message ?? `Updated ${res.updated} date(s)`)
      if (res.lodgify) setMsg((m) => `${m}. ${res.lodgify!.message}`)
      setRangeFrom(null)
      setRangeTo(null)
      await loadCalendar()
    } catch (e: unknown) {
      setErr((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const previewAed = Number(datePrice || yearlyInput || 0)

  return (
    <div>
      <PageHeader
        title="Villa Rates"
        subtitle="Set yearly, monthly, and date-specific nightly rates (AED). Priority: date → month → year."
      />

      {(msg || err) && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            err ? 'border border-red-200 bg-red-50 text-red-700' : 'border border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          {err || msg}
        </div>
      )}

      {!villa ? (
        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-500">
          Loading villa…
        </div>
      ) : (
      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        {/* Calendar */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Villa</p>
            <p className="mt-1 text-lg font-semibold text-slate-800">{villa.name}</p>
            {villa.lodgifyPropertyId != null && (
              <p className="text-xs text-slate-500">
                Lodgify property {villa.lodgifyPropertyId}
                {villa.lodgifyRoomTypeId != null ? ` · room ${villa.lodgifyRoomTypeId}` : ''}
              </p>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-800">
                {selectedVilla?.name} — {MONTH_NAMES[currentDate.month - 1]} {currentDate.year}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentDate(({ year, month }) =>
                      month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 },
                    )
                  }
                  className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentDate(({ year, month }) =>
                      month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 },
                    )
                  }
                  className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {loading ? (
              <p className="p-8 text-center text-sm text-slate-500">Loading rates…</p>
            ) : (
              <div className="p-4">
                <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d}>{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: firstDow }).map((_, i) => (
                    <div key={`e-${i}`} />
                  ))}
                  {calendarDays.map((d) => {
                    const iso = toISO(d)
                    const info = dayMap.get(iso)
                    const selected = inRange(iso)
                    return (
                      <button
                        key={iso}
                        type="button"
                        onClick={() => onDayClick(iso)}
                        className={`min-h-[72px] rounded-lg border p-1.5 text-left transition ${
                          selected
                            ? 'border-[#bca37f] bg-[#bca37f]/20'
                            : 'border-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-xs font-semibold text-slate-700">{d.getUTCDate()}</span>
                        <span className="mt-1 block text-[11px] font-medium text-[#5e544b]">
                          {info
                            ? formatMoney(
                                convertPreview(info.priceAed, displayCurrency, fx),
                                displayCurrency,
                              )
                            : '—'}
                        </span>
                        {info && info.source !== 'BASE' && info.source !== 'YEARLY' && (
                          <span className="mt-0.5 block text-[9px] uppercase text-slate-400">
                            {info.source === 'SPECIFIC_DATE' ? 'date' : info.source.toLowerCase()}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Click a day, or click start then end, to set a date / range override.
                  {monthly != null && ` This month override: ${formatMoney(monthly, 'AED')}.`}
                  {yearly != null && ` Yearly base: ${formatMoney(yearly, 'AED')}.`}
                </p>
              </div>
            )}
          </div>

          {/* Date range editor */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 font-semibold text-slate-800">Date / range override</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-sm">
                <span className="mb-1 block text-slate-500">From</span>
                <input
                  type="date"
                  value={rangeFrom ?? ''}
                  onChange={(e) => setRangeFrom(e.target.value || null)}
                  className="w-full rounded border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-slate-500">To</span>
                <input
                  type="date"
                  value={rangeTo ?? rangeFrom ?? ''}
                  onChange={(e) => setRangeTo(e.target.value || null)}
                  className="w-full rounded border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-slate-500">Nightly AED</span>
                <input
                  type="number"
                  min={0}
                  value={datePrice}
                  onChange={(e) => setDatePrice(e.target.value)}
                  className="w-full rounded border border-slate-200 px-3 py-2"
                />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={syncLodgify}
                  onChange={(e) => setSyncLodgify(e.target.checked)}
                />
                Sync to Lodgify (best effort)
              </label>
              <button
                type="button"
                disabled={saving || !rangeFrom || !(Number(datePrice) > 0)}
                onClick={saveDateRange}
                className="rounded-lg bg-[#bca37f] px-4 py-2 text-sm font-medium text-[#5e544b] disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Apply to dates'}
              </button>
            </div>
          </div>
        </div>

        {/* Settings column */}
        <div className="space-y-4">
          <CurrencyPreviewBox
            aed={previewAed}
            rates={fx}
            currency={displayCurrency}
            onCurrencyChange={setDisplayCurrency}
          />

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-2 font-semibold text-slate-800">Yearly rate (AED)</h3>
            <p className="mb-3 text-xs text-slate-500">Default nightly rate for the whole year.</p>
            <input
              type="number"
              min={0}
              value={yearlyInput}
              onChange={(e) => setYearlyInput(e.target.value)}
              className="mb-2 w-full rounded border border-slate-200 px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={saving || !(Number(yearlyInput) > 0)}
              onClick={saveYearly}
              className="w-full rounded-lg bg-[#5e544b] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Save yearly rate
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-2 font-semibold text-slate-800">Monthly overrides</h3>
            <p className="mb-3 text-xs text-slate-500">Overrides yearly for that month.</p>
            <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {MONTH_NAMES.map((name, idx) => {
                const m = idx + 1
                return (
                  <div key={name} className="flex items-center gap-2">
                    <span className="w-20 shrink-0 text-xs text-slate-600">{name.slice(0, 3)}</span>
                    <input
                      type="number"
                      min={0}
                      placeholder="AED"
                      value={monthInputs[m] ?? ''}
                      onChange={(e) =>
                        setMonthInputs((prev) => ({ ...prev, [m]: e.target.value }))
                      }
                      className="min-w-0 flex-1 rounded border border-slate-200 px-2 py-1.5 text-sm"
                    />
                    <button
                      type="button"
                      disabled={saving || !(Number(monthInputs[m]) > 0)}
                      onClick={() => saveMonth(m)}
                      className="rounded bg-slate-100 px-2 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-40"
                    >
                      Save
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  )
}
