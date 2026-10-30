import { Router } from 'express'
import { searchAvailability } from '../controllers/public/search.controller'
import { listRooms, getRoomBySlug, getAlerts, getBlockedDates } from '../controllers/public/rooms.controller'
import { createBooking, getBookingByRef, validatePromo, getGuestBookings, cancelBooking } from '../controllers/public/bookings.controller'
import { getCurrencyRates } from '../controllers/public/currency.controller'
import { registerGuest, loginGuest, getGuestProfile } from '../controllers/public/guest.auth.controller'
import { testLodgifyConnection } from '../controllers/public/lodgify.controller'

import { createPaymentIntent, handleStripeWebhook } from '../controllers/public/payments.controller'

const router = Router()

// Payments
router.post('/payments/create-payment-intent', createPaymentIntent)
router.post('/webhooks/stripe', handleStripeWebhook)

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
router.get('/availability/blocked-dates', getBlockedDates)

// Bookings
router.post('/bookings', createBooking)
router.get('/bookings/:ref', getBookingByRef)
router.post('/bookings/:ref/cancel', cancelBooking)
router.post('/bookings/validate-promo', validatePromo)
router.get('/bookings/guest/:email', getGuestBookings)

// Currency
router.get('/currency', getCurrencyRates)

export default router
