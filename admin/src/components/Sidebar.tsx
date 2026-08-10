import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Calendar, BookOpen, Tag, DollarSign,
  Users, Bell, LogOut,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const links = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/availability', icon: Calendar, label: 'Availability' },
  { to: '/admin/bookings', icon: BookOpen, label: 'Bookings' },
  { to: '/admin/promos', icon: Tag, label: 'Promo Codes' },
  { to: '/admin/currency', icon: DollarSign, label: 'Currency' },
  { to: '/admin/guests', icon: Users, label: 'Guests' },
  { to: '/admin/alerts', icon: Bell, label: 'Alerts' },
]

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
    isActive
      ? 'bg-[#bca37f] text-[#5e544b] shadow-sm'
      : 'text-[#8c8279] hover:bg-white/80 hover:text-[#5e544b]'
  }`

export default function Sidebar() {
  const { admin, logout } = useAuth()

  function handleLogout() {
    logout()
    // Same app as public site — go home (do not open a separate admin URL)
    window.location.assign('/')
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r border-[#d6d0c7] bg-[#faf7f2] text-[#5e544b] shadow-sm">
      <div className="border-b border-[#d6d0c7] px-4 py-4">
        <img
          src="/logo-limiria.png?v=3"
          alt="Limiria Villa"
          className="h-10 w-auto max-w-[11rem] object-contain object-left"
        />
        <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.18em] text-[#8c8279]">
          Admin Panel
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={navLinkClass}>
            <Icon size={16} className="shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-[#d6d0c7] px-4 py-4">
        <div className="mb-3">
          <p className="text-sm font-medium text-[#5e544b]">
            {admin?.firstName} {admin?.lastName}
          </p>
          <p className="text-xs text-[#8c8279]">
            {admin?.role ? admin.role.split('_').join(' ') : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-[#8c8279] transition-all duration-200 hover:bg-white/80 hover:text-[#5e544b]"
        >
          <LogOut size={14} aria-hidden />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  )
}
