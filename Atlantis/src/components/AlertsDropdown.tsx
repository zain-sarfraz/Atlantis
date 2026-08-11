import { useEffect, useRef } from 'react'
import { Bell, X } from 'lucide-react'
import { useBooking } from '../context/BookingContext'

/** Compact notifications panel anchored to the navbar bell. */
export default function AlertsDropdown() {
  const { state, dismissAlert, toggleAlerts } = useBooking()
  const panelRef = useRef<HTMLDivElement>(null)

  const active = state.hotelAlerts.filter((a) => !state.alertsDismissed.includes(a.id))
  const open = state.alertsOpen

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        toggleAlerts(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') toggleAlerts(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, toggleAlerts])

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => toggleAlerts()}
        className={`relative rounded p-2 text-navy transition hover:bg-cream-dark focus:ring-2 focus:ring-sand/40 ${
          open ? 'bg-cream-dark ring-1 ring-border' : ''
        }`}
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell size={20} />
        {active.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-sand px-1 text-[11px] font-semibold text-white">
            {active.length > 9 ? '9+' : active.length}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute top-full right-0 z-[120] mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-[13px] font-semibold tracking-wide text-ink uppercase">
                Notifications
              </p>
              <p className="mt-0.5 text-[12px] font-medium text-taupe">
                {active.length === 0
                  ? 'You are all caught up'
                  : `${active.length} update${active.length === 1 ? '' : 's'}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleAlerts(false)}
              className="rounded-md p-1.5 text-taupe transition hover:bg-cream hover:text-ink"
              aria-label="Close notifications"
            >
              <X size={16} />
            </button>
          </div>

          <div className="max-h-[min(24rem,70vh)] overflow-y-auto">
            {active.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell size={28} className="mx-auto text-sand" strokeWidth={1.5} />
                <p className="mt-3 text-[14px] font-semibold text-ink">No new notices</p>
                <p className="mt-1 text-[12px] font-normal text-taupe">
                  Villa updates will appear here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {active.map((alert) => (
                  <li key={alert.id} className="group relative px-4 py-3.5 transition hover:bg-cream/60">
                    <div className="pr-8">
                      <p className="text-[14px] font-semibold text-ink">{alert.title}</p>
                      <p className="mt-1 text-[13px] leading-relaxed font-normal text-taupe">
                        {alert.message}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => dismissAlert(alert.id)}
                      className="absolute top-3 right-3 rounded-md p-1 text-taupe opacity-70 transition hover:bg-cream-dark hover:text-ink hover:opacity-100"
                      aria-label={`Dismiss ${alert.title}`}
                      title="Dismiss"
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {active.length > 1 && (
            <div className="border-t border-border px-4 py-2.5">
              <button
                type="button"
                onClick={() => {
                  active.forEach((a) => dismissAlert(a.id))
                  toggleAlerts(false)
                }}
                className="w-full rounded-lg py-2 text-[12px] font-semibold tracking-wide text-taupe uppercase transition hover:bg-cream hover:text-ink"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
