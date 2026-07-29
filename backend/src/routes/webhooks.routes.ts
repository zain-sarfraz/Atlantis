import { Router } from 'express'
import { verifyLodgifyWebhook } from '../middleware/lodgifyWebhook'
import { receiveLodgifyWebhook } from '../controllers/public/lodgifyWebhook.controller'

const router = Router()

// POST /api/webhooks/lodgify
router.post('/lodgify', verifyLodgifyWebhook, receiveLodgifyWebhook)

export default router
