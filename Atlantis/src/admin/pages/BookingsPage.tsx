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
import { Search, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'

const STATUS_OPTIONS = ['', 'PENDING', 'CONFIRMED', 'CANCELLED', 'CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW']

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function statusLabel(status: string) {
  switch (status) {
    case 'CONFIRMED':
    case 'CHECKED_IN':
    case 'CHECKED_OUT':
      return 'Booked'
    case 'PENDING':
      return 'Tentative'
    case 'CANCELLED':
    case 'NO_SHOW':
      return 'Cancelled'
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
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [channels, setChannels] = useState<LodgifyChannel[]>([...LODGIFY_CHANNELS])
  const reqId = useRef(0)

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
      setData({ bookings: [], total: 0, page: 1, limit: 20, pages: 0 })
      setLoading(false)
      return
    }

    const id = ++reqId.current
    setLoading(true)
    setError('')
    try {
      const res = await bookingsApi.list({
        page,
        limit: 20,
        search: search || undefined,
        status: status || undefined,
        channels: channels.length < LODGIFY_CHANNELS.length ? channels : undefined,
      })
      if (id !== reqId.current) return
      setData(res)
    } catch (e: unknown) {
      if (id !== reqId.current) return
      setError((e as Error).message || 'Failed to load reservations')
      setData(null)
    } finally {
      if (id === reqId.current) setLoading(false)
    }
  }, [page, search, status, channels])

  useEffect(() => {
    void fetchBookings()
  }, [fetchBookings])

  useEffect(() => {
    const id = window.setInterval(() => {
      void fetchBookings()
    }, 5 * 60 * 1000)
    return () => window.clearInterval(id)
  }, [fetchBookings])

  function handleChannelsChange(next: LodgifyChannel[]) {
    setChannels(next)
    setPage(1)
  }

  async function updateStatus(bookingId: string, newStatus: string) {
    await bookingsApi.updateStatus(bookingId, newStatus)
    await fetchBookings()
  }

  async function syncLodgify() {
    setSyncing(true)
    setSyncMsg('')
    setError('')
    try {
      const res = await lodgifyApi.sync()
      setSyncMsg(
        `Synced — ${res.bookings?.bookingsSynced ?? 0} bookings, ${res.availability?.datesUpdated ?? 0} availability nights`,
      )
      await fetchBookings()
    } catch (e: unknown) {
      setError((e as Error).message || 'Lodgify sync failed')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="text-[15px] font-normal text-slate-800 antialiased">
      <PageHeader
        title="Reservations"
        subtitle={data ? `${data.total} reservations` : 'Lodgify inbox · Limiria Villa'}
        action={
          <button
            type="button"
            onClick={syncLodgify}
            disabled={syncing}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            Sync Lodgify
          </button>
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
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s || 'All statuses'}
              </option>
            ))}
          </select>
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
                          : search
                            ? `No results for “${search}”`
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
                            <select
                              value={b.status}
                              onChange={(e) => updateStatus(b.id, e.target.value)}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[12px] font-medium text-slate-700 outline-none focus:border-[#bca37f]"
                            >
                              {STATUS_OPTIONS.filter(Boolean).map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
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
