import './load-env'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import path from 'path'
import { env } from './config/env'
import { prisma } from './config/database'
import publicRoutes from './routes/public.routes'
import adminRoutes from './routes/admin.routes'
import webhookRoutes from './routes/webhooks.routes'
import { notFound, errorHandler } from './middleware/error'
import { startLodgifyCron } from './jobs/lodgifyCron'

const app = express()

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({
  origin: env.corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Lodgify-Signature', 'X-Signature', 'ms-signature', 'Ms-Signature'],
}))

// Rate limiting — disabled in development (login retries were locking people out)
const isDev = env.nodeEnv !== 'production'
if (!isDev) {
  app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests' },
  }))
  app.use('/api/admin/auth', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many auth attempts. Please wait a few minutes and try again.' },
  }))
}

// ─── Body parsing (capture rawBody for Lodgify HMAC verification) ─────────────
app.use(express.json({
  limit: '2mb',
  verify: (req, _res, buf) => {
    ;(req as express.Request).rawBody = buf
  },
}))
app.use(express.urlencoded({ extended: true }))

// ─── Static files (uploaded images) ──────────────────────────────────────────
app.use('/uploads', express.static(path.resolve(env.uploadDir)))
app.use('/rooms', express.static(path.resolve('../Atlantis/public/rooms')))

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api', publicRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/webhooks', webhookRoutes)

// ─── Error handling ───────────────────────────────────────────────────────────
app.use(notFound)
app.use(errorHandler)

// ─── Start ────────────────────────────────────────────────────────────────────
async function start() {
  try {
    await prisma.$connect()
    console.log('✓ Database connected')

    app.listen(env.port, () => {
      console.log(`✓ Serrano Backend running on http://localhost:${env.port}`)
      console.log(`  API:   http://localhost:${env.port}/api`)
      console.log(`  Admin: http://localhost:${env.port}/api/admin`)
      console.log(`  Env:   ${env.nodeEnv}`)
      console.log('')
      console.log(
        `To receive Lodgify webhooks locally, run 'ngrok http ${env.port}' in a separate terminal ` +
          `(or: npm run ngrok), then set the ngrok URL + /api/webhooks/lodgify as the webhook URL ` +
          'in Lodgify Dashboard > Settings > Webhooks (or Integrations).',
      )
      console.log(`  Example: https://xxxx.ngrok-free.app/api/webhooks/lodgify`)
      console.log('')
      try {
        startLodgifyCron()
      } catch (cronErr) {
        console.error('⚠ Lodgify cron failed to start (app continues):', cronErr)
      }
    })
  } catch (err) {
    console.error('Failed to start:', err)
    process.exit(1)
  }
}

start()

process.on('SIGINT', async () => {
  await prisma.$disconnect()
  process.exit(0)
})
