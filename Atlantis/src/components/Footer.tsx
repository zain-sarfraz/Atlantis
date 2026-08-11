import { Link } from 'react-router-dom'
import Logo from './Logo'
import { VILLA_DISPLAY_NAME } from '../utils/villa'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <div className="mt-auto border-t border-sand-dark bg-sand text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <Logo className="brightness-0 invert" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white">
            A private villa in Zanzibar — the entire home reserved for your stay.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-widest text-white uppercase">Stay</p>
          <ul className="mt-3 space-y-2 text-sm text-white">
            <li>
              <Link to="/" className="transition hover:text-white/80">
                Book the villa
              </Link>
            </li>
            <li>
              <Link to="/bookings" className="transition hover:text-white/80">
                My bookings
              </Link>
            </li>
            <li>
              <Link to="/login" className="transition hover:text-white/80">
                Sign in
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-widest text-white uppercase">Visit</p>
          <ul className="mt-3 space-y-2 text-sm text-white">
            <li>{VILLA_DISPLAY_NAME}</li>
            <li>Zanzibar, Tanzania</li>
            <li>Private villa · Exclusive use</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-sand-dark/70">
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-white sm:px-6 lg:px-8">
          © {year} {VILLA_DISPLAY_NAME}. All rights reserved.
        </p>
      </div>
    </div>
  )
}
