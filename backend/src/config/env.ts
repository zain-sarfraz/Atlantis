import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

/** Prefer project-root .env so `cd dist && node index.js` still works */
const envCandidates = [
  path.resolve(__dirname, '../../.env'), // …/atlantisbackend/.env from dist/config or src/config
  path.resolve(process.cwd(), '../.env'), // when cwd is dist/
  path.resolve(process.cwd(), '.env'),
]

let loadedEnvPath: string | null = null
for (const candidate of envCandidates) {
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate })
    loadedEnvPath = candidate
    break
  }
}
if (!loadedEnvPath) {
  dotenv.config()
}

function required(key: string): string {
  const val = process.env[key]
  if (!val) {
    const hint = loadedEnvPath
      ? `Loaded ${loadedEnvPath} but ${key} is missing/empty.`
      : `No .env found. Tried: ${envCandidates.join(' | ')}`
    throw new Error(`Missing required env var: ${key}. ${hint}`)
  }
  return val
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback
}

export const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  port: parseInt(optional('PORT', '3001'), 10),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: optional('JWT_SECRET', 'dev-jwt-secret-change-in-production'),
  jwtRefreshSecret: optional('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-in-production'),
  jwtExpiresIn: optional('JWT_EXPIRES_IN', '15m'),
  jwtRefreshExpiresIn: optional('JWT_REFRESH_EXPIRES_IN', '7d'),
  corsOrigins: optional('CORS_ORIGINS', 'http://localhost:5173,http://localhost:5174').split(',').map(s => s.trim()),
  uploadDir: optional('UPLOAD_DIR', 'uploads'),
  maxFileSizeMb: parseInt(optional('MAX_FILE_SIZE_MB', '10'), 10),
  exchangeRateApiKey: optional('EXCHANGE_RATE_API_KEY', ''),
  exchangeRateApiUrl: optional('EXCHANGE_RATE_API_URL', 'https://api.exchangerate-api.com/v4/latest/AED'),
  fees: {
    serviceCharge: parseFloat(optional('SERVICE_CHARGE_RATE', '0.10')),
    municipalityFee: parseFloat(optional('MUNICIPALITY_FEE_RATE', '0.07')),
    vat: parseFloat(optional('VAT_RATE', '0.05')),
  },
  // Lodgify channel manager (optional — sync disabled when key is empty)
  lodgifyApiKey: optional('LODGIFY_API_KEY', 'eVIY7UUxijKNdHgwkxK4Qfcu6OTK4WNMtAqzOsgkkDxvvZW30MfsItDzZC05aCpd'),
  lodgifyBaseUrl: optional('LODGIFY_BASE_URL', 'https://api.lodgify.com/v2'),
  lodgifyV1BaseUrl: optional('LODGIFY_V1_BASE_URL', 'https://api.lodgify.com/v1'),
  // When set, sync only this Lodgify property (e.g. Limiria Villa Zanzibar = 714507)
  lodgifyPropertyId: (() => {
    const raw = process.env.LODGIFY_PROPERTY_ID?.trim()
    if (!raw) return null
    const n = parseInt(raw, 10)
    return Number.isFinite(n) && n > 0 ? n : null
  })(),
  // Secret returned when you subscribe a Lodgify webhook (HMAC SHA-256 of body)
  lodgifyWebhookSecret: optional('LODGIFY_WEBHOOK_SECRET', 'zktVideG4bOSEYqiVFQO8g+MgAZSZSTM'),
} as const
