import { Mail } from 'lucide-react'
import { Link } from 'react-router-dom'
import Logo from './Logo'
import { VILLA_DISPLAY_NAME } from '../utils/villa'

function InstagramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function FacebookIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t border-border bg-cream text-ink">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-10">
        <div>
          <Logo />
          <p className="type-body mt-4 max-w-xs text-slate-600">
            A private villa in Zanzibar — the entire home reserved for your stay.
          </p>
        </div>

        <div>
          <p className="type-eyebrow text-navy">Stay</p>
          <ul className="mt-3.5 space-y-2.5 text-[0.875rem] font-medium text-slate-600">
            <li>
              <Link to="/" className="transition hover:text-sand">
                Book the villa
              </Link>
            </li>
            <li>
              <Link to="/bookings" className="transition hover:text-sand">
                My bookings
              </Link>
            </li>
            <li>
              <Link to="/login" className="transition hover:text-sand">
                Sign in
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="type-eyebrow text-navy">Visit</p>
          <ul className="mt-3.5 space-y-2.5 text-[0.875rem] font-medium text-slate-600">
            <li>{VILLA_DISPLAY_NAME}</li>
            <li>Zanzibar, Tanzania</li>
            <li>Private villa · Exclusive use</li>
          </ul>
        </div>

        <div>
          <p className="type-eyebrow text-navy">Connect</p>
          <div className="mt-4 flex items-center gap-3">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className="rounded p-2 text-sand transition hover:bg-cream-dark hover:text-sand-dark"
              aria-label="Instagram"
            >
              <InstagramIcon />
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noreferrer"
              className="rounded p-2 text-sand transition hover:bg-cream-dark hover:text-sand-dark"
              aria-label="Facebook"
            >
              <FacebookIcon />
            </a>
            <a
              href="mailto:stay@limiriavilla.com"
              className="rounded p-2 text-sand transition hover:bg-cream-dark hover:text-sand-dark"
              aria-label="Email"
            >
              <Mail size={20} strokeWidth={1.5} />
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <p className="mx-auto max-w-[1400px] px-4 py-4 text-center text-[0.75rem] font-medium tracking-wide text-taupe sm:px-6 lg:px-10">
          © {year} {VILLA_DISPLAY_NAME}. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
