/**
 * Quick DB connection check for atlantis_db.
 * Run: npx tsx scripts/verify-db.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.$connect()
  const tables = await prisma.$queryRaw<Array<{ Tables_in_atlantis_db: string }>>`SHOW TABLES`
  console.log('✓ Connected to atlantis_db')
  console.log(`✓ Tables found: ${tables.length}`)
  for (const row of tables) {
    console.log(`  - ${Object.values(row)[0]}`)
  }
}

main()
  .catch((err) => {
    console.error('✗ Connection/verify failed:', err.message ?? err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
