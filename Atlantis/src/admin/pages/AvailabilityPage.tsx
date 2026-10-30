import { useEffect, useMemo, useState } from 'react'
import {
  roomsApi,
  availabilityApi,
  lodgifyApi,
  type RoomType,
  type AvailabilityDay,
} from '../api/client'
import PageHeader from '../components/PageHeader'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'

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

function pickLimiriaVilla(rooms: RoomType[]): RoomType | undefined {
  return (
    rooms.find((r) => /limiria/i.test(r.name) || r.lodgifyPropertyId === 714507) ??
    rooms.find((r) => /palm|zanzibar/i.test(r.name)) ??
    rooms[0]
  )
}

export default function AvailabilityPage() {
  const [villa, setVilla] = useState<RoomType | null>(null)
  const [calendar, setCalendar] = useState<AvailabilityDay[]>([])
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [rangeFrom, setRangeFrom] = useState<string | null>(null)
  const [rangeTo, setRangeTo] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  async function loadCalendar(v: RoomType, year: number, month: number) {
    setLoading(true)
    setErr('')
    try {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`
      setCalendar(await availabilityApi.getCalendar(v.id, monthStr))
    } catch (e: unknown) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    roomsApi.listRooms().then((rms) => {
      const picked = pickLimiriaVilla(rms.filter((r) => r.isActive))
      if (picked) setVilla(picked)
    })
  }, [])

  useEffect(() => {
    if (!villa) return
    loadCalendar(villa, currentDate.year, currentDate.month)
  }, [villa, currentDate])

  const availMap = useMemo(
    () => new Map(calendar.map((d) => [d.date, d])),
    [calendar],
  )

  const days = getMonthDays(currentDate.year, currentDate.month)
  const firstDow = days[0]?.getUTCDay() ?? 0

  const stats = useMemo(() => {
    let open = 0
    let booked = 0
    let closed = 0
    for (const d of days) {
      const row = availMap.get(toISO(d))
      const a = row?.available ?? 1
      if (a > 0) open += 1
      else if (row?.reason === 'booked' || row?.guestName) booked += 1
      else closed += 1
    }
    return { open, booked, closed, blocked: booked + closed }
  }, [days, availMap])

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
      return
    }
    setRangeTo(date)
  }

  async function applyAvailability(available: 0 | 1) {
    if (!villa || !rangeFrom) return
    const from = rangeTo && rangeTo < rangeFrom ? rangeTo : rangeFrom
    const to = rangeTo && rangeTo > rangeFrom ? rangeTo : rangeFrom
    setSaving(true)
    setMsg('')
    setErr('')
    try {
      const res = (await availabilityApi.bulkSet(villa.id, {
        from,
        to: to ?? from,
        available,
        ...(available === 0 ? { blockReason: 'booking' as const } : {}),
      })) as { updated: number }
      setMsg(
        `✓ ${res.updated} night(s) marked ${available === 1 ? 'available' : 'unavailable'}`,
      )
      setRangeFrom(null)
      setRangeTo(null)
      await loadCalendar(villa, currentDate.year, currentDate.month)
    } catch (e: unknown) {
      setErr((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function applyWholeMonth(available: 0 | 1) {
    if (!villa || !days.length) return
    setSaving(true)
    setMsg('')
    setErr('')
    try {
      const from = toISO(days[0])
      const to = toISO(days[days.length - 1])
      const res = (await availabilityApi.bulkSet(villa.id, {
        from,
        to,
        available,
        ...(available === 0 ? { blockReason: 'booking' as const } : {}),
      })) as {
        updated: number
      }
      setMsg(
        `✓ Month updated — ${res.updated} nights ${available === 1 ? 'open' : 'blocked'}`,
      )
      setRangeFrom(null)
      setRangeTo(null)
      await loadCalendar(villa, currentDate.year, currentDate.month)
    } catch (e: unknown) {
      setErr((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function syncFromLodgify() {
    setSyncing(true)
    setMsg('')
    setErr('')
    try {
      const res = await lodgifyApi.sync()
      const a = res.availability
      const b = res.bookings
      setMsg(
        `✓ Lodgify sync — ${a.datesUpdated ?? 0} availability nights, ${b.bookingsSynced ?? 0} bookings. ${a.message}`,
      )
      if (villa) await loadCalendar(villa, currentDate.year, currentDate.month)
    } catch (e: unknown) {
      setErr((e as Error).message)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Villa Availability"
        subtitle="Limiria Villa Zanzibar — green = bookable, red = booked (Lodgify / manual)"
        action={
          <button
            type="button"
            onClick={syncFromLodgify}
            disabled={syncing}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            Sync Lodgify
          </button>
        }
      />

      {(msg || err) && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            err
              ? 'border border-red-200 bg-red-50 text-red-700'
              : 'border border-emerald-200 bg-emerald-50 text-emerald-800'
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
        <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
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
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <span className="text-emerald-700">{stats.open} open</span>
                <span className="text-red-600">{stats.booked} booked</span>
                <span className="text-amber-700">{stats.closed} closed</span>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h2 className="font-semibold text-slate-800">
                  {villa.name} —{' '}
                  {new Date(currentDate.year, currentDate.month - 1).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </h2>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentDate(({ year, month }) =>
                        month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 },
                      )
                    }
                    className="rounded-lg border border-slate-200 p-1.5 transition hover:bg-slate-50"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentDate(({ year, month }) =>
                        month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 },
                      )
                    }
                    className="rounded-lg border border-slate-200 p-1.5 transition hover:bg-slate-50"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="py-12 text-center text-sm text-slate-400">Loading calendar…</div>
              ) : (
                <div className="p-4">
                  <p className="mb-3 text-xs text-slate-500">
                    Click a day, then another day to select a range. Use the panel to open or book.
                  </p>
                  <div className="mb-2 grid grid-cols-7 gap-1">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                      <div key={d} className="py-1 text-center text-xs font-semibold text-slate-400">
                        {d}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: firstDow }).map((_, i) => (
                      <div key={`empty-${i}`} />
                    ))}
                    {days.map((d) => {
                      const dateStr = toISO(d)
                      const row = availMap.get(dateStr)
                      const avail = row?.available ?? 1
                      const reason = row?.reason ?? (avail === 0 ? 'closed' : 'open')
                      const selected = inRange(dateStr)
                      const color =
                        reason === 'booked'
                          ? 'bg-red-100 text-red-700'
                          : reason === 'closed'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-green-100 text-green-700'
                      const label =
                        reason === 'booked'
                          ? row?.guestName?.split(' ')[0] || 'Booked'
                          : reason === 'closed'
                            ? 'Closed'
                            : 'Open'
                      return (
                        <button
                          key={dateStr}
                          type="button"
                          onClick={() => onDayClick(dateStr)}
                          disabled={saving}
                          className={`min-h-[72px] rounded-lg p-1.5 text-center transition hover:opacity-90 ${color} ${
                            selected ? 'ring-2 ring-[#bca37f] ring-offset-1' : ''
                          }`}
                          title={
                            reason === 'booked'
                              ? `${dateStr}: ${row?.guestName ?? 'Booked'} (${row?.bookingRef ?? ''})`
                              : `${dateStr}: ${reason === 'closed' ? 'Closed on Lodgify' : 'Available'}`
                          }
                        >
                          <div className="text-xs font-medium">{d.getUTCDate()}</div>
                          <div className="mt-1 text-[10px] font-bold leading-tight line-clamp-2">
                            {label}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-3 w-3 rounded bg-red-100" /> Booked (Lodgify reservation)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-3 w-3 rounded bg-amber-100" /> Closed (manual block)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-3 w-3 rounded bg-green-100" /> Available
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-1 font-semibold text-slate-800">Selected dates</h3>
              <p className="mb-4 text-xs text-slate-500">
                {rangeFrom
                  ? rangeTo
                    ? `${rangeFrom} → ${rangeTo}`
                    : `${rangeFrom} (click end date)`
                  : 'No range selected'}
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={saving || !rangeFrom}
                  onClick={() => applyAvailability(1)}
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:opacity-40"
                >
                  Mark available
                </button>
                <button
                  type="button"
                  disabled={saving || !rangeFrom}
                  onClick={() => applyAvailability(0)}
                  className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-800 disabled:opacity-40"
                >
                  Mark booked
                </button>
                <button
                  type="button"
                  disabled={!rangeFrom}
                  onClick={() => {
                    setRangeFrom(null)
                    setRangeTo(null)
                  }}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Clear selection
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-1 font-semibold text-slate-800">This month</h3>
              <p className="mb-4 text-xs text-slate-500">
                Quick actions for the visible month (overwritten by next Lodgify sync).
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => applyWholeMonth(1)}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-40"
                >
                  Open whole month
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => applyWholeMonth(0)}
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-40"
                >
                  Book whole month
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-medium">Lodgify is source of truth</p>
              <p className="mt-1 text-xs text-amber-700">
                Sync pulls live inventory for property 714507. Most red days in peak season are real
                bookings — use Sync Lodgify after changes on Lodgify.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
