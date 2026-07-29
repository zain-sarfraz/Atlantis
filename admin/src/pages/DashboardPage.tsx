import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dashboardApi, type DashboardData, type Booking } from '../api/client'
import StatCard from '../components/StatCard'
import Badge from '../components/Badge'
import PageHeader from '../components/PageHeader'
import {
  BookOpen, Users, TrendingUp, DollarSign, LogIn, LogOut, CheckCircle, Clock,
} from 'lucide-react'

function fmt(n: number) {
  return `AED ${n.toLocaleString()}`
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    dashboardApi.get()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex h-64 items-center justify-center text-slate-500">Loading dashboard…</div>
  if (error) return <div className="text-red-500">{error}</div>
  if (!data) return null

  const { stats, recentBookings, topRoomTypes } = data

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Hotel performance overview" />

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Bookings" value={stats.totalBookings} icon={BookOpen} color="bg-blue-50 text-blue-600" />
        <StatCard label="Month Revenue" value={fmt(stats.monthRevenue)} icon={DollarSign} color="bg-amber-50 text-amber-600" />
        <StatCard label="Total Guests" value={stats.totalGuests} icon={Users} color="bg-violet-50 text-violet-600" />
        <StatCard label="Total Revenue" value={fmt(stats.totalRevenue)} icon={TrendingUp} color="bg-green-50 text-green-600" />
      </div>

      {/* Secondary stats */}
      <div className="mt-4 grid gap-4 sm:grid-cols-4">
        <StatCard label="Confirmed" value={stats.confirmedBookings} icon={CheckCircle} color="bg-green-50 text-green-600" />
        <StatCard label="Pending" value={stats.pendingBookings} icon={Clock} color="bg-yellow-50 text-yellow-600" />
        <StatCard label="Check-ins Today" value={stats.checkInsToday} icon={LogIn} color="bg-blue-50 text-blue-600" />
        <StatCard label="Check-outs Today" value={stats.checkOutsToday} icon={LogOut} color="bg-slate-50 text-slate-600" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Recent Bookings */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="font-semibold text-slate-800">Recent Bookings</h2>
            <Link to="/admin/bookings" className="text-xs font-medium text-[#bca37f] hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentBookings.length === 0 && (
              <p className="px-6 py-8 text-center text-sm text-slate-400">No bookings yet</p>
            )}
            {recentBookings.map((b: Booking) => (
              <Link
                key={b.id}
                to={`/admin/bookings/${b.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {b.firstName} {b.lastName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {b.bookingRef} · {b.items?.[0]?.roomType?.name ?? '—'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {fmtDate(b.checkIn)} → {fmtDate(b.checkOut)}
                  </p>
                </div>
                <div className="text-right">
                  <Badge value={b.status} />
                  <p className="mt-1 text-sm font-semibold text-slate-700">{fmt(b.totalAmount)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Top Room Types */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="font-semibold text-slate-800">Top Room Types</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {topRoomTypes.map((r, i) => (
              <div key={r.roomTypeId} className="flex items-center gap-3 px-6 py-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{r.name}</p>
                  <p className="text-xs text-slate-500">{r.bookings} bookings</p>
                </div>
                <p className="text-sm font-semibold text-slate-700 shrink-0">{fmt(r.revenue)}</p>
              </div>
            ))}
            {topRoomTypes.length === 0 && (
              <p className="px-6 py-8 text-center text-sm text-slate-400">No data yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
