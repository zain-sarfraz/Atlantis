import { Router } from 'express'
import { searchAvailability } from '../controllers/public/search.controller'
import { listRooms, getRoomBySlug, getAlerts } from '../controllers/public/rooms.controller'
import { createBooking, getBookingByRef, validatePromo, getGuestBookings } from '../controllers/public/bookings.controller'
import { getCurrencyRates } from '../controllers/public/currency.controller'
import { registerGuest, loginGuest, getGuestProfile } from '../controllers/public/guest.auth.controller'
import { testLodgifyConnection } from '../controllers/public/lodgify.controller'

const router = Router()

// Lodgify connectivity check
router.get('/test/lodgify-connection', testLodgifyConnection)

// Guest Auth
router.post('/auth/register', registerGuest)
router.post('/auth/login', loginGuest)
router.get('/auth/me', getGuestProfile)

// Room catalog
router.get('/rooms', listRooms)
router.get('/rooms/:slug', getRoomBySlug)
router.get('/alerts', getAlerts)

// Search & availability
router.get('/search', searchAvailability)

// Bookings
router.post('/bookings', createBooking)
router.get('/bookings/:ref', getBookingByRef)
router.post('/bookings/validate-promo', validatePromo)
router.get('/bookings/guest/:email', getGuestBookings)

// Currency
router.get('/currency', getCurrencyRates)

export default router
