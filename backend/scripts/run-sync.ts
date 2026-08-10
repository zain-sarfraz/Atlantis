import 'dotenv/config'
import { runLodgifySync } from '../src/services/syncService'

runLodgifySync()
  .then((r) => {
    console.log(JSON.stringify(r, null, 2))
    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
