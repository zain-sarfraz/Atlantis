import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { bookingsApi, type Booking, type BookingListResponse } from '../api/client'
import PageHeader from '../components/PageHeader'
import Badge from '../components/Badge'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'

const STATUS_OPTIONS = ['', 'PENDING', 'CONFIRMED', 'CANCELLED', 'CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW']

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function BookingsPage() {
  const [data, setData] = useState<BookingListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [searchInput, setSearchInput] = useState('')

  async function load(p = page, s = search, st = status) {
    setLoading(true)
    try {
      const res = await bookingsApi.list({ page: p, limit: 20, search: s || undefined, status: st || undefined })
      setData(res)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [page, search, status])

  function handleSearch() {
    setSearch(searchInput)
    setPage(1)
  }

  async function updateStatus(id: string, newStatus: string) {
    await bookingsApi.updateStatus(id, newStatus)
    await load()
  }

  return (
    <div>
      <PageHeader title="Bookings" subtitle={data ? `${data.total} total bookings` : 'All reservations'} />

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-3">
        <div className="flex gap-2">
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#bca37f] focus:ring-2 focus:ring-[#bca37f]/20 w-56"
            placeholder="Search ref, name, email…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            className="rounded-lg bg-[#5e544b] px-3 py-2 text-white hover:bg-[#4a4238] transition"
          >
            <Search size={15} />
          </button>
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#bca37f]"
        >
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s || 'All statuses'}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3 text-left">Ref</th>
                <th className="px-4 py-3 text-left">Guest</th>
                <th className="px-4 py-3 text-left">Room</th>
                <th className="px-4 py-3 text-left">Dates</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-400">Loading…</td></tr>
              )}
              {!loading && data?.bookings.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-400">No bookings found</td></tr>
              )}
              {!loading && data?.bookings.map((b: Booking) => (
                <tr key={b.id} className="hover:bg-slate-50 transition">
                  <td className="px-5 py-3.5">
                    <Link to={`/admin/bookings/${b.id}`} className="font-mono text-[#5e544b] hover:underline font-medium">
                      {b.bookingRef}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-slate-800">{b.firstName} {b.lastName}</p>
                    <p className="text-xs text-slate-500">{b.email}</p>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 max-w-32 truncate">
                    {b.items?.[0]?.roomType?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                    {fmtDate(b.checkIn)} → {fmtDate(b.checkOut)}
                  </td>
                  <td className="px-4 py-3.5"><Badge value={b.status} /></td>
                  <td className="px-4 py-3.5 text-right font-semibold text-slate-800">
                    {b.currency} {b.totalAmount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5">
                    <select
                      value={b.status}
                      onChange={(e) => updateStatus(b.id, e.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-[#bca37f]"
                    >
                      {STATUS_OPTIONS.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
            <p className="text-xs text-slate-500">
              Page {data.page} of {data.pages} · {data.total} bookings
            </p>
            <div className="flex gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              <button
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
  )
}
