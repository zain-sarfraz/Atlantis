import { X } from 'lucide-react'
import { useBooking } from '../context/BookingContext'

export default function AlertsBanner() {
  const { state, dismissAlert, toggleAlerts } = useBooking()

  const active = state.hotelAlerts.filter((a) => !state.alertsDismissed.includes(a.id))
  if (!state.alertsOpen || active.length === 0) return null

  return (
    <div className="border-b border-sand/40 bg-sand-light">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            {active.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start justify-between gap-3 rounded-lg bg-white/60 px-4 py-3"
              >
                <div>
                  <p className="text-base font-medium text-navy">{alert.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-600">
                    {alert.message}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => dismissAlert(alert.id)}
                  className="shrink-0 rounded p-1 text-slate-500 transition hover:bg-cream-dark hover:text-navy focus:ring-2 focus:ring-sand"
                  aria-label="Dismiss alert"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => toggleAlerts(false)}
            className="shrink-0 rounded p-1 text-navy/60 hover:text-navy"
            aria-label="Close alerts panel"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
