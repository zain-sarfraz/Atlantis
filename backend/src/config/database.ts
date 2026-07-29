import { PrismaClient } from '@prisma/client'
import { env } from './env'

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: env.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (env.nodeEnv !== 'production') {
  global.__prisma = prisma
}
