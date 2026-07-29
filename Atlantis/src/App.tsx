import { BrowserRouter, Route, Routes, Outlet, Navigate } from 'react-router-dom'
import { BookingProvider } from './context/BookingContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AuthProvider as AdminAuthProvider, useAuth as useAdminAuth } from '@admin/hooks/useAuth'
import Navbar from './components/Navbar'
import RoomModal from './components/RoomModal'
import BookingSummary from './components/BookingSummary'
import CartDrawer from './components/CartDrawer'
import StayPage from './pages/StayPage'
import MyBookingsPage from './pages/MyBookingsPage'
import CheckoutPage from './pages/CheckoutPage'
import LoginPage from './pages/LoginPage'

import AdminLayout from '@admin/components/Layout'
import DashboardPage from '@admin/pages/DashboardPage'
import RoomsPage from '@admin/pages/RoomsPage'
import BookingsPage from '@admin/pages/BookingsPage'
import BookingDetailPage from '@admin/pages/BookingDetailPage'
import PromoCodesPage from '@admin/pages/PromoCodesPage'
import CurrencyPage from '@admin/pages/CurrencyPage'
import GuestsPage from '@admin/pages/GuestsPage'
import AlertsPage from '@admin/pages/AlertsPage'
import AvailabilityPage from '@admin/pages/AvailabilityPage'

function MainLayout() {
  return (
    <div className="min-h-svh bg-cream">
      <Navbar />
      <Outlet />
      <RoomModal />
      <BookingSummary />
      <CartDrawer />
    </div>
  )
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { admin, loading } = useAdminAuth()
  if (loading) {
    return <div className="flex h-screen items-center justify-center text-slate-500">Loading…</div>
  }
  if (!admin) return <Navigate to="/login" replace />
  return <>{children}</>
}

function GuestOnlyLogin() {
  const { role, loading } = useAuth()
  if (loading) return null
  if (role === 'admin') return <Navigate to="/admin/dashboard" replace />
  if (role === 'guest') return <Navigate to="/" replace />
  return <LoginPage />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BookingProvider>
          <Routes>
            <Route path="/login" element={<GuestOnlyLogin />} />

            <Route element={<MainLayout />}>
              <Route path="/" element={<StayPage />} />
              <Route path="/bookings" element={<MyBookingsPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
            </Route>

            {/* Admin panel — same site, no separate login */}
            <Route
              path="/admin"
              element={
                <AdminAuthProvider>
                  <RequireAdmin>
                    <AdminLayout />
                  </RequireAdmin>
                </AdminAuthProvider>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="rooms" element={<RoomsPage />} />
              <Route path="availability" element={<AvailabilityPage />} />
              <Route path="bookings" element={<BookingsPage />} />
              <Route path="bookings/:id" element={<BookingDetailPage />} />
              <Route path="promos" element={<PromoCodesPage />} />
              <Route path="currency" element={<CurrencyPage />} />
              <Route path="guests" element={<GuestsPage />} />
              <Route path="alerts" element={<AlertsPage />} />
            </Route>
          </Routes>
        </BookingProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
