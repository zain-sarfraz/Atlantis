/**
 * Local Lodgify webhook tunnel helper.
 *
 * Lodgify cannot reach localhost. Expose your backend with ngrok, then paste:
 *   https://<your-subdomain>.ngrok-free.app/api/webhooks/lodgify
 * into Lodgify → Settings → Public API / Webhooks (subscribe to booking_* events).
 *
 * Install (one-time):
 *   npm install -g ngrok
 *   # or: winget install ngrok.ngrok  /  brew install ngrok
 *   ngrok config add-authtoken <YOUR_NGROK_TOKEN>
 *
 * Run:
 *   npm run ngrok
 *   # or: ngrok http 3001
 *
 * Keep this process running while testing webhooks.
 */

import { spawn } from 'child_process'
import { env } from '../src/config/env'

const port = env.port || 3001

console.log(`Starting ngrok → http://localhost:${port}`)
console.log(`After it starts, set Lodgify webhook URL to:`)
console.log(`  https://<ngrok-host>/api/webhooks/lodgify`)
console.log('')

const child = spawn('ngrok', ['http', String(port)], {
  stdio: 'inherit',
  shell: true,
})

child.on('error', (err) => {
  console.error('Failed to start ngrok. Is it installed globally?')
  console.error('  npm install -g ngrok')
  console.error('  ngrok config add-authtoken <token>')
  console.error(err.message)
  process.exit(1)
})

child.on('exit', (code) => process.exit(code ?? 0))
