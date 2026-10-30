import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  bookingsApi,
  lodgifyApi,
  type Booking,
  type BookingListResponse,
} from '../api/client'
import PageHeader from '../components/PageHeader'
import Badge from '../components/Badge'
import { ChannelBadge, ChannelsFilter } from '../components/ChannelsFilter'
import {
  LODGIFY_CHANNELS,
  normalizeLodgifyChannel,
  type LodgifyChannel,
} from '../utils/lodgifyChannels'
import { Search, ChevronLeft, ChevronRight, RefreshCw, Trash2 } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PENDING', label: 'Tentative' },
  { value: 'CANCELLED', label: 'Declined' },
]

/** Lodgify auto-sync: every 5 minutes, hard-stop after 1 minute. */
const SYNC_INTERVAL_MS = 5 * 60 * 1000
const SYNC_TIMEOUT_MS = 60 * 1000
const LIMIRIA_PROPERTY_ID = 714507

function fmtDate(d: string) {
  // Date-only strings must render in UTC to avoid day/year shifting
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) {
    const [y, m, day] = d.slice(0, 10).split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    })
  }
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function fmtCountdown(ms: number) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}m ${String(s).padStart(2, '0')}s`
}

function monthBounds(ym: string): { from: string; to: string } | null {
  if (!/^\d{4}-\d{2}$/.test(ym)) return null
  const [y, m] = ym.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return {
    from: `${ym}-01`,
    to: `${ym}-${String(last).padStart(2, '0')}`,
  }
}

/** First day of the current calendar month (YYYY-MM-01). */
function currentMonthStart(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

function selectedMonth(from: string, to: string): string {
  if (!from || !to) return ''
  const bounds = monthBounds(from.slice(0, 7))
  if (!bounds) return ''
  return bounds.from === from && bounds.to === to ? from.slice(0, 7) : ''
}

function statusLabel(status: string) {
  switch (status) {
    case 'CONFIRMED':
    case 'CHECKED_IN':
    case 'CHECKED_OUT':
      return 'Confirmed'
    case 'PENDING':
      return 'Tentative'
    case 'CANCELLED':
    case 'NO_SHOW':
    case 'DECLINED':
      return 'Declined'
    default:
      return status
  }
}

export default function BookingsPage() {
  const [data, setData] = useState<BookingListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const [syncMsg, setSyncMsg] = useState('')
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null)
  const [nextSyncAt, setNextSyncAt] = useState(() => Date.now() + SYNC_INTERVAL_MS)
  const [nowTick, setNowTick] = useState(() => Date.now())
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  // All statuses by default — current month first, then upcoming months (date-wise)
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState(() => currentMonthStart())
  const [dateTo, setDateTo] = useState('') // open-ended → current + next months
  const [channels, setChannels] = useState<LodgifyChannel[]>([...LODGIFY_CHANNELS])
  const monthFilter = selectedMonth(dateFrom, dateTo)
  const reqId = useRef(0)
  const syncInFlight = useRef(false)
  const didInitialSync = useRef(false)

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  // Debounce typed query → applied search (live results while typing)
  useEffect(() => {
    const t = window.setTimeout(() => {
      setPage(1)
      setSearch(searchInput.trim())
    }, 350)
    return () => window.clearTimeout(t)
  }, [searchInput])

  const fetchBookings = useCallback(async () => {
    if (channels.length === 0) {
      setData({
        bookings: [],
        total: 0,
        page: 1,
        limit: 50,
        pages: 0,
        counts: { all: 0, confirmed: 0, tentative: 0, declined: 0 },
      })
      setLoading(false)
      return
    }

    const id = ++reqId.current
    setLoading(true)
    setError('')
    try {
      const res = await bookingsApi.list({
        page,
        limit: 50,
        search: search || undefined,
        status: status || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
        channels: channels.length < LODGIFY_CHANNELS.length ? channels : undefined,
      })
      if (id !== reqId.current) return
      // Date-wise: earliest check-in first → current month, then next months
      const sorted = {
        ...res,
        bookings: [...res.bookings].sort((a, b) => {
          const aIn = new Date(a.checkIn.slice(0, 10) + 'T00:00:00.000Z').getTime()
          const bIn = new Date(b.checkIn.slice(0, 10) + 'T00:00:00.000Z').getTime()
          if (aIn !== bIn) return aIn - bIn
          const aOut = new Date(a.checkOut.slice(0, 10) + 'T00:00:00.000Z').getTime()
          const bOut = new Date(b.checkOut.slice(0, 10) + 'T00:00:00.000Z').getTime()
          return aOut - bOut
        }),
      }
      setData(sorted)
    } catch (e: unknown) {
      if (id !== reqId.current) return
      setError((e as Error).message || 'Failed to load reservations')
      setData(null)
    } finally {
      if (id === reqId.current) setLoading(false)
    }
  }, [page, search, status, dateFrom, dateTo, channels])

  useEffect(() => {
    void fetchBookings()
  }, [fetchBookings])

  const syncLodgify = useCallback(async (opts?: { silent?: boolean }) => {
    if (syncInFlight.current) return
    syncInFlight.current = true
    setSyncing(true)
    if (!opts?.silent) {
      setSyncMsg('')
      setError('')
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS)

    try {
      const res = await lodgifyApi.sync(controller.signal)
      const finishedAt = new Date()
      setLastSyncAt(finishedAt)
      setNextSyncAt(finishedAt.getTime() + SYNC_INTERVAL_MS)
      setSyncMsg(
        `Synced Limiria #${LIMIRIA_PROPERTY_ID} — ${res.bookings?.bookingsSynced ?? 0} bookings updated, ${res.availability?.datesUpdated ?? 0} availability nights`,
      )
      await fetchBookings()
    } catch (e: unknown) {
      const aborted =
        (e instanceof DOMException && e.name === 'AbortError') ||
        (e instanceof Error && /abort/i.test(e.message))
      const msg = aborted
        ? 'Lodgify sync timed out after 1 minute — try Sync Lodgify again'
        : (e as Error).message || 'Lodgify sync failed'
      if (!opts?.silent || aborted) setError(msg)
      setNextSyncAt(Date.now() + SYNC_INTERVAL_MS)
    } finally {
      window.clearTimeout(timeoutId)
      syncInFlight.current = false
      setSyncing(false)
    }
  }, [fetchBookings])

  // Pull fresh Lodgify calendar data once when opening Reservations
  useEffect(() => {
    if (didInitialSync.current) return
    didInitialSync.current = true
    void syncLodgify({ silent: true })
  }, [syncLodgify])

  // Auto Lodgify sync every 5 minutes while this page is open
  useEffect(() => {
    const id = window.setInterval(() => {
      void syncLodgify({ silent: true })
    }, SYNC_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [syncLodgify])

  const syncStatusText = syncing
    ? 'Syncing from Lodgify now… (max 1 minute)'
    : lastSyncAt
      ? `Last sync ${fmtTime(lastSyncAt)} · Next auto-sync in ${fmtCountdown(nextSyncAt - nowTick)} · every 5 min`
      : `Next auto-sync in ${fmtCountdown(nextSyncAt - nowTick)} · every 5 min · max 1 min`

  function handleChannelsChange(next: LodgifyChannel[]) {
    setChannels(next)
    setPage(1)
  }

  async function updateStatus(bookingId: string, newStatus: string) {
    await bookingsApi.updateStatus(bookingId, newStatus)
    await fetchBookings()
  }

  async function handleDelete(bookingId: string) {
    if (!window.confirm('Are you sure you want to delete this reservation?')) return
    try {
      await bookingsApi.delete(bookingId)
      setData((prev) =>
        prev
          ? {
              ...prev,
              bookings: prev.bookings.filter(
                (b) => String(b.id) !== String(bookingId) && b.bookingRef !== bookingId,
              ),
              total: Math.max(0, prev.total - 1),
            }
          : null,
      )
      await fetchBookings()
    } catch (e: unknown) {
      setError((e as Error).message || 'Failed to delete booking')
    }
  }

  return (
    <div className="text-[15px] font-normal text-slate-800 antialiased">
      <PageHeader
        title="Reservations"
        subtitle={
          data
            ? `${data.counts?.all ?? data.total} total · showing ${data.total} · Limiria #${LIMIRIA_PROPERTY_ID} · current month → next`
            : `Lodgify calendar · Limiria Villa #${LIMIRIA_PROPERTY_ID}`
        }
        action={
          <div className="flex flex-col items-end gap-1 max-w-sm text-right">
            <button
              type="button"
              onClick={() => void syncLodgify()}
              disabled={syncing}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              Sync Lodgify
            </button>
            <p className="text-[11px] font-medium leading-snug text-slate-400">
              {syncStatusText}
            </p>
          </div>
        }
      />

      {(error || syncMsg) && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-[13px] font-medium ${
            error
              ? 'border border-red-200 bg-red-50 text-red-700'
              : 'border border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          {error || syncMsg}
        </div>
      )}

      {data?.counts && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              { key: '', label: 'All', value: data.counts.all, active: status === '', tone: 'slate' },
              {
                key: 'CONFIRMED',
                label: 'Confirmed',
                value: data.counts.confirmed,
                active: status === 'CONFIRMED',
                tone: 'emerald',
              },
              {
                key: 'PENDING',
                label: 'Tentative',
                value: data.counts.tentative,
                active: status === 'PENDING',
                tone: 'amber',
              },
              {
                key: 'CANCELLED',
                label: 'Declined',
                value: data.counts.declined,
                active: status === 'CANCELLED',
                tone: 'rose',
              },
            ] as const
          ).map((card) => (
            <button
              key={card.label}
              type="button"
              onClick={() => {
                setStatus(card.key)
                setPage(1)
              }}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                card.active
                  ? 'border-[#bca37f] bg-[#bca37f]/10 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <p className="text-[11px] font-bold tracking-[0.08em] text-slate-500 uppercase">
                {card.label}
              </p>
              <p
                className={`mt-1 text-2xl font-bold tabular-nums ${
                  card.tone === 'emerald'
                    ? 'text-emerald-700'
                    : card.tone === 'amber'
                      ? 'text-amber-700'
                      : card.tone === 'rose'
                        ? 'text-rose-700'
                        : 'text-slate-900'
                }`}
              >
                {card.value}
              </p>
            </button>
          ))}
        </div>
      )}

      <div>
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[280px] flex-1 sm:max-w-md">
            <Search
              size={15}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
            />
            <input
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pr-3 pl-9 text-[14px] font-medium text-slate-900 placeholder:font-normal placeholder:text-slate-400 outline-none focus:border-[#bca37f] focus:ring-2 focus:ring-[#bca37f]/20"
              placeholder="Search name, email, or booking ref…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[14px] font-medium text-slate-800 outline-none focus:border-[#bca37f]"
            aria-label="Booking status"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-[13px] font-medium text-slate-600">
            <span className="whitespace-nowrap">Month</span>
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => {
                const bounds = monthBounds(e.target.value)
                if (!bounds) return
                setDateFrom(bounds.from)
                setDateTo(bounds.to)
                setPage(1)
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[14px] font-medium text-slate-800 outline-none focus:border-[#bca37f]"
              aria-label="Filter by month"
            />
          </label>
          <label className="flex items-center gap-2 text-[13px] font-medium text-slate-600">
            <span className="whitespace-nowrap">From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setPage(1)
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[14px] font-medium text-slate-800 outline-none focus:border-[#bca37f]"
            />
          </label>
          <label className="flex items-center gap-2 text-[13px] font-medium text-slate-600">
            <span className="whitespace-nowrap">To</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => {
                setDateTo(e.target.value)
                setPage(1)
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[14px] font-medium text-slate-800 outline-none focus:border-[#bca37f]"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setDateFrom(currentMonthStart())
              setDateTo('')
              setPage(1)
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50"
            title="Show current month, then upcoming months"
          >
            Current → next
          </button>
          <button
            type="button"
            onClick={() => {
              setDateFrom('')
              setDateTo('')
              setSearchInput('')
              setSearch('')
              setStatus('')
              setChannels([...LODGIFY_CHANNELS])
              setPage(1)
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50"
            title="Clear all filters and show every booking"
          >
            Clear filters
          </button>
          <ChannelsFilter selected={channels} onChange={handleChannelsChange} />
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {(
                      [
                        ['Guest', 'left'],
                        ['Channel', 'left'],
                        ['Dates', 'left'],
                        ['Property', 'left'],
                        ['Status', 'left'],
                        ['Total', 'right'],
                        ['Actions', 'left'],
                      ] as const
                    ).map(([label, align]) => (
                      <th
                        key={label}
                        className={`px-4 py-3.5 text-[11px] font-bold tracking-[0.08em] text-slate-500 uppercase ${
                          align === 'right' ? 'text-right' : 'text-left'
                        } ${label === 'Guest' ? 'px-5' : ''}`}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-10 text-center text-[14px] font-medium text-slate-400"
                      >
                        Loading…
                      </td>
                    </tr>
                  )}
                  {!loading && data?.bookings.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-10 text-center text-[14px] font-medium text-slate-400"
                      >
                        {channels.length === 0
                          ? 'Select at least one channel'
                          : search || dateFrom || dateTo || status
                            ? 'No reservations match these filters'
                            : 'No reservations for these channels'}
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    data?.bookings.map((b: Booking) => {
                      const property = b.items?.[0]?.roomType?.name ?? 'Limiria Villa Zanzibar'
                      const channel = b.channel ?? normalizeLodgifyChannel(b.lodgifySource)
                      return (
                        <tr key={b.id} className="transition hover:bg-slate-50/80">
                          <td className="px-5 py-4">
                            <Link
                              to={`/admin/bookings/${b.id}`}
                              className="block text-[15px] font-semibold text-slate-900 hover:text-[#5e544b] hover:underline"
                            >
                              {b.firstName} {b.lastName}
                            </Link>
                            <p className="mt-0.5 text-[12px] font-medium text-slate-500">
                              {b.bookingRef}
                            </p>
                            <p className="text-[12px] font-normal text-slate-400">{b.email}</p>
                          </td>
                          <td className="px-4 py-4">
                            <ChannelBadge source={channel} />
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-[13px] font-medium text-slate-700">
                            {fmtDate(b.checkIn)} → {fmtDate(b.checkOut)}
                          </td>
                          <td className="px-4 py-4 text-[13px] font-medium text-slate-700">
                            {property}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-1">
                              <Badge value={b.status} />
                              <span className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                                {statusLabel(b.status)}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right text-[14px] font-bold text-slate-900">
                            {b.currency} {b.totalAmount.toLocaleString()}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <select
                                value={
                                  ['CONFIRMED', 'PENDING', 'CANCELLED'].includes(b.status)
                                    ? b.status
                                    : b.status === 'CHECKED_IN' || b.status === 'CHECKED_OUT'
                                      ? 'CONFIRMED'
                                      : b.status === 'NO_SHOW' || b.status === 'DECLINED'
                                        ? 'CANCELLED'
                                        : 'CONFIRMED'
                                }
                                onChange={(e) => updateStatus(b.id, e.target.value)}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[12px] font-medium text-slate-700 outline-none focus:border-[#bca37f]"
                              >
                                {STATUS_OPTIONS.filter((opt) => opt.value !== '').map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => handleDelete(b.id)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                                title="Delete Reservation"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>

            {data && data.pages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5">
                <p className="text-[12px] font-medium text-slate-500">
                  Page {data.page} of {data.pages} · {data.total} reservations
                </p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={page >= data.pages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
      </div>
    </div>
  )
}
