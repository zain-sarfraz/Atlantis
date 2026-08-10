import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

/**
 * Load project-root .env whether you run:
 *   node dist/index.js          (cwd = project root)
 *   cd dist && node index.js    (cwd = dist)
 */
const candidates = [
  path.resolve(__dirname, '../.env'), // dist/load-env.js → project/.env
  path.resolve(process.cwd(), '../.env'),
  path.resolve(process.cwd(), '.env'),
]

for (const file of candidates) {
  if (fs.existsSync(file)) {
    dotenv.config({ path: file })
    break
  }
}
