import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { bookingsApi, assetUrl, type Booking } from '../api/client'
import PageHeader from '../components/PageHeader'
import Badge from '../components/Badge'
import { ArrowLeft } from 'lucide-react'

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null) return null
  return (
    <div className="flex justify-between py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-800">{String(value)}</span>
    </div>
  )
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    bookingsApi.get(id).then(setBooking).finally(() => setLoading(false))
  }, [id])

  async function changeStatus(status: string) {
    if (!id) return
    await bookingsApi.updateStatus(id, status)
    const b = await bookingsApi.get(id)
    setBooking(b)
  }

  if (loading) return <div className="flex h-64 items-center justify-center text-slate-500">Loading…</div>
  if (!booking) return <div className="text-red-500">Booking not found</div>

  return (
    <div>
      <button onClick={() => navigate('/admin/bookings')} className="mb-4 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition">
        <ArrowLeft size={15} /> Back to Bookings
      </button>

      <PageHeader
        title={`Booking ${booking.bookingRef}`}
        action={
          <div className="flex items-center gap-3">
            <Badge value={booking.status} />
            <select
              value={booking.status}
              onChange={(e) => changeStatus(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#bca37f]"
            >
              {['PENDING', 'CONFIRMED', 'CANCELLED', 'CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW'].map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Guest Info */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-800">Guest Information</h2>
          <Row label="Name" value={`${booking.guestPrefix ?? ''} ${booking.firstName} ${booking.lastName}`.trim()} />
          <Row label="Email" value={booking.email} />
          <Row label="Phone" value={booking.phone} />
          <Row label="Country" value={booking.country} />
          <Row label="City" value={booking.city} />
          <Row label="Adults" value={booking.adults} />
          <Row label="Children" value={booking.children} />
          <Row label="Rooms" value={booking.roomsCount} />
        </div>

        {/* Booking Details */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-800">Stay Details</h2>
          <Row label="Check-in" value={fmtDate(booking.checkIn)} />
          <Row label="Check-out" value={fmtDate(booking.checkOut)} />
          <Row label="Currency" value={booking.currency} />
          {booking.promoCode && <Row label="Promo Code" value={booking.promoCode.code} />}
          <Row label="Special Requests" value={booking.specialRequests} />
          <Row label="Created" value={fmtDate(booking.createdAt)} />
          {booking.confirmedAt && <Row label="Confirmed" value={fmtDate(booking.confirmedAt)} />}
          {booking.cancelledAt && <Row label="Cancelled" value={fmtDate(booking.cancelledAt)} />}
        </div>

        {/* Room Items */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-800">Booked Rooms</h2>
          <div className="space-y-4">
            {booking.items.map((item) => (
              <div key={item.id} className="flex gap-4 rounded-lg border border-slate-100 p-4">
                {(item.roomType.images?.[0]?.url || item.roomType.mainImage) && (
                  <img
                    src={assetUrl(item.roomType.images?.[0]?.url || item.roomType.mainImage)}
                    alt={item.roomType.name}
                    className="h-24 w-32 rounded-lg object-cover shrink-0"
                  />
                )}
                <div className="flex-1">
                  <p className="font-semibold text-slate-800">{item.roomType?.name || 'Limiria Villa Zanzibar'}</p>
                  <p className="text-sm text-slate-500">{(item.ratePlan?.name || 'Best Available Rate').replace(/_/g, ' ')}</p>
                  <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                    <span className="text-slate-500">Nightly Rate</span>
                    <span className="font-medium">AED {(item.nightlyRate ?? 0).toLocaleString()}</span>
                    <span className="text-slate-500">Nights</span>
                    <span className="font-medium">{item.nights ?? 1}</span>
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-medium">AED {(item.subtotal ?? item.total ?? 0).toLocaleString()}</span>
                    <span className="text-slate-500">Service Charge (10%)</span>
                    <span className="font-medium">AED {(item.serviceCharge ?? 0).toLocaleString()}</span>
                    <span className="text-slate-500">Municipality Fee (7%)</span>
                    <span className="font-medium">AED {(item.municipalityFee ?? 0).toLocaleString()}</span>
                    <span className="text-slate-500">VAT (5%)</span>
                    <span className="font-medium">AED {(item.vat ?? 0).toLocaleString()}</span>
                    <span className="font-semibold text-slate-800">Total</span>
                    <span className="font-bold text-slate-800">AED {(item.total ?? 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-between rounded-lg bg-[#5e544b]/5 px-5 py-4">
            <span className="font-semibold text-slate-800">Grand Total</span>
            <span className="text-xl font-bold text-[#5e544b]">
              {booking.currency} {(booking.totalAmount ?? 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
