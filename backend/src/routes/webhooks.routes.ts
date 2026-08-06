import { Router } from 'express'
import { verifyLodgifyWebhook } from '../middleware/lodgifyWebhook'
import { receiveLodgifyWebhook } from '../controllers/public/lodgifyWebhook.controller'

const router = Router()

// POST /api/webhooks/lodgify
router.post('/lodgify', verifyLodgifyWebhook, receiveLodgifyWebhook)

// Helpful GET for quick browser checks (webhooks use POST)
router.get('/lodgify', (_req, res) => {
	res.status(200).json({ ok: true, message: 'Lodgify webhook endpoint (POST only). Send POST requests to this URL.' })
})

export default router
