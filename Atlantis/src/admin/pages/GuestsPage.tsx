import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { guestsApi, type Guest, type GuestListResponse } from '../api/client'
import PageHeader from '../components/PageHeader'
import { Search, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function GuestsPage() {
  const [data, setData] = useState<GuestListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  async function load(p = page, s = search) {
    setLoading(true)
    try {
      const res = await guestsApi.list({ page: p, limit: 25, search: s || undefined })
      setData(res)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [page, search])

  function handleSearch() {
    setSearch(searchInput)
    setPage(1)
  }

  return (
    <div>
      <PageHeader title="Guests" subtitle={data ? `${data.total} total guests` : 'All guests'} />

      <div className="mb-5 flex gap-2">
        <input
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#bca37f] w-56"
          placeholder="Search name or email…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch} className="rounded-lg bg-[#5e544b] px-3 py-2 text-white hover:bg-[#4a4238] transition">
          <Search size={15} />
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">Country</th>
                <th className="px-4 py-3 text-center">Bookings</th>
                <th className="px-4 py-3 text-left">Member Since</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && <tr><td colSpan={7} className="py-8 text-center text-slate-400">Loading…</td></tr>}
              {!loading && data?.guests.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-slate-400">No guests found</td></tr>
              )}
              {!loading && data?.guests.map((g: Guest) => (
                <tr key={g.id} className="hover:bg-slate-50 transition">
                  <td className="px-5 py-3.5 font-medium text-slate-800">{g.firstName} {g.lastName}</td>
                  <td className="px-4 py-3.5 text-slate-600">{g.email}</td>
                  <td className="px-4 py-3.5 text-slate-500">{g.phone ?? '—'}</td>
                  <td className="px-4 py-3.5 text-slate-500">{g.country ?? '—'}</td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#5e544b]/10 px-2 text-xs font-semibold text-[#5e544b]">
                      {g._count?.bookings ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500">{fmtDate(g.createdAt)}</td>
                  <td className="px-4 py-3.5">
                    <Link
                      to={`/admin/bookings?search=${encodeURIComponent(g.email)}`}
                      className="flex items-center gap-1 text-xs text-[#bca37f] hover:underline"
                    >
                      <ExternalLink size={12} /> Bookings
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data && data.pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
            <p className="text-xs text-slate-500">Page {data.page} of {data.pages}</p>
            <div className="flex gap-1">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-40">
                <ChevronLeft size={14} />
              </button>
              <button disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-40">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
