import dotenv from 'dotenv'
dotenv.config()

function required(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
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
  lodgifyApiKey: optional('LODGIFY_API_KEY', ''),
  lodgifyBaseUrl: optional('LODGIFY_BASE_URL', 'https://api.lodgify.com/v2'),
  lodgifyV1BaseUrl: optional('LODGIFY_V1_BASE_URL', 'https://api.lodgify.com/v1'),
  // Secret returned when you subscribe a Lodgify webhook (HMAC SHA-256 of body)
  lodgifyWebhookSecret: optional('LODGIFY_WEBHOOK_SECRET', ''),
} as const
