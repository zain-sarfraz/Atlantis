import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import RoomsPage from './pages/RoomsPage'
import BookingsPage from './pages/BookingsPage'
import BookingDetailPage from './pages/BookingDetailPage'
import PromoCodesPage from './pages/PromoCodesPage'
import CurrencyPage from './pages/CurrencyPage'
import GuestsPage from './pages/GuestsPage'
import AlertsPage from './pages/AlertsPage'
import AvailabilityPage from './pages/AvailabilityPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { admin, loading } = useAuth()
  if (loading) return <div className="flex h-screen items-center justify-center text-slate-500">Loading…</div>
  if (!admin) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
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
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AdminRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
