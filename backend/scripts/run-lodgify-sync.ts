import { runLodgifySync } from '../src/services/syncService'

async function main() {
  const result = await runLodgifySync()
  console.log(JSON.stringify(result, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
