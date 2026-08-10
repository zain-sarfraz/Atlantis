import { Router } from 'express'
import { requireAdmin, requireSuperAdmin, requireReservationsManager, requireContentEditor } from '../middleware/auth'
import { upload } from '../middleware/upload'

import { login, refreshToken, getMe } from '../controllers/admin/auth.controller'
import {
  listCategories, createCategory, updateCategory, deleteCategory,
  listRoomTypes, getRoomType, createRoomType, updateRoomType, deleteRoomType,
  addRoomImage, deleteRoomImage,
  listRatePlans, createRatePlan, updateRatePlan, deleteRatePlan,
  listPriceOverrides, upsertPriceOverride, deletePriceOverride,
} from '../controllers/admin/rooms.controller'
import { getAvailabilityCalendar, setAvailability, bulkSetAvailability } from '../controllers/admin/availability.controller'
import { listBookings, getBooking, updateBookingStatus, deleteBooking } from '../controllers/admin/bookings.controller'
import { listPromos, getPromo, createPromo, updatePromo, deletePromo } from '../controllers/admin/promos.controller'
import { listRates, upsertRate, syncRates } from '../controllers/admin/currency.controller'
import { getDashboard } from '../controllers/admin/dashboard.controller'
import { listGuests, getGuest, updateGuest, deleteGuest } from '../controllers/admin/guests.controller'
import { listStaff, createStaff, updateStaff, deleteStaff, listAlerts, createAlert, updateAlert, deleteAlert } from '../controllers/admin/staff.controller'
import { syncLodgify } from '../controllers/admin/lodgify.controller'
import { listLodgifyBookings } from '../controllers/public/lodgifyWebhook.controller'
import {
  getVillaRates,
  getVillaRatesCalendar,
  previewRate,
  putDateRates,
  putMonthlyRate,
  putYearlyRate,
  removeVillaRate,
} from '../controllers/admin/villaRates.controller'

const router = Router()

// ─── Auth (public) ────────────────────────────────────────────────────────────
router.post('/auth/login', login)
router.post('/auth/refresh', refreshToken)
router.get('/auth/me', requireAdmin, getMe)

// All routes below require authentication
router.use(requireAdmin)

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard', getDashboard)

// ─── Room Categories ──────────────────────────────────────────────────────────
router.get('/categories', listCategories)
router.post('/categories', requireContentEditor, createCategory)
router.put('/categories/:id', requireContentEditor, updateCategory)
router.delete('/categories/:id', requireSuperAdmin, deleteCategory)

// ─── Room Types ───────────────────────────────────────────────────────────────
router.get('/rooms', listRoomTypes)
router.get('/rooms/:id', getRoomType)
router.post('/rooms', requireContentEditor, createRoomType)
router.put('/rooms/:id', requireContentEditor, updateRoomType)
router.delete('/rooms/:id', requireSuperAdmin, deleteRoomType)

// ─── Room Images ──────────────────────────────────────────────────────────────
router.post('/rooms/:id/images', requireContentEditor, upload.single('image'), addRoomImage)
router.delete('/rooms/:id/images/:imageId', requireContentEditor, deleteRoomImage)

// ─── Rate Plans ───────────────────────────────────────────────────────────────
router.get('/rooms/:roomTypeId/rate-plans', listRatePlans)
router.post('/rooms/:roomTypeId/rate-plans', requireContentEditor, createRatePlan)
router.put('/rate-plans/:id', requireContentEditor, updateRatePlan)
router.delete('/rate-plans/:id', requireSuperAdmin, deleteRatePlan)

// ─── Price Overrides ──────────────────────────────────────────────────────────
router.get('/rate-plans/:id/overrides', listPriceOverrides)
router.put('/rate-plans/:id/overrides', requireContentEditor, upsertPriceOverride)
router.delete('/rate-plans/:id/overrides/:overrideId', requireContentEditor, deletePriceOverride)

// ─── Villa rates (yearly / monthly / date) ────────────────────────────────────
router.get('/villa-rates/preview', previewRate)
router.get('/villas/:villaId/rates', getVillaRates)
router.get('/villas/:villaId/rates/calendar', getVillaRatesCalendar)
router.put('/villas/:villaId/rates/yearly', requireContentEditor, putYearlyRate)
router.put('/villas/:villaId/rates/monthly', requireContentEditor, putMonthlyRate)
router.put('/villas/:villaId/rates/dates', requireContentEditor, putDateRates)
router.delete('/villa-rates/:id', requireContentEditor, removeVillaRate)

// ─── Availability ─────────────────────────────────────────────────────────────
router.get('/availability/:roomTypeId', getAvailabilityCalendar)
router.put('/availability/:roomTypeId', requireReservationsManager, setAvailability)
router.post('/availability/:roomTypeId/bulk', requireReservationsManager, bulkSetAvailability)

// ─── Bookings ─────────────────────────────────────────────────────────────────
router.get('/bookings', requireReservationsManager, listBookings)
router.get('/bookings/:id', requireReservationsManager, getBooking)
router.put('/bookings/:id/status', requireReservationsManager, updateBookingStatus)
router.delete('/bookings/:id', requireSuperAdmin, deleteBooking)

// ─── Promo Codes ──────────────────────────────────────────────────────────────
router.get('/promos', listPromos)
router.get('/promos/:id', getPromo)
router.post('/promos', requireContentEditor, createPromo)
router.put('/promos/:id', requireContentEditor, updatePromo)
router.delete('/promos/:id', requireSuperAdmin, deletePromo)

// ─── Currency ─────────────────────────────────────────────────────────────────
router.get('/currency', listRates)
router.put('/currency', requireContentEditor, upsertRate)
router.post('/currency/sync', requireSuperAdmin, syncRates)

// ─── Lodgify sync ─────────────────────────────────────────────────────────────
router.post('/sync/lodgify', requireReservationsManager, syncLodgify)
router.get('/lodgify-bookings', requireReservationsManager, listLodgifyBookings)

// ─── Guests ───────────────────────────────────────────────────────────────────
router.get('/guests', requireReservationsManager, listGuests)
router.get('/guests/:id', requireReservationsManager, getGuest)
router.put('/guests/:id', requireReservationsManager, updateGuest)
router.delete('/guests/:id', requireSuperAdmin, deleteGuest)

// ─── Staff ────────────────────────────────────────────────────────────────────
router.get('/staff', requireSuperAdmin, listStaff)
router.post('/staff', requireSuperAdmin, createStaff)
router.put('/staff/:id', requireSuperAdmin, updateStaff)
router.delete('/staff/:id', requireSuperAdmin, deleteStaff)

// ─── Hotel Alerts ─────────────────────────────────────────────────────────────
router.get('/alerts', listAlerts)
router.post('/alerts', requireContentEditor, createAlert)
router.put('/alerts/:id', requireContentEditor, updateAlert)
router.delete('/alerts/:id', requireContentEditor, deleteAlert)

export default router
