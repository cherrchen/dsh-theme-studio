import { execFile } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { promisify } from 'node:util'
import { npmInvocation } from './npm-cli.mjs'

const run = promisify(execFile)
const requests = JSON.parse(readFileSync(0, 'utf8'))
const results = new Array(requests.length)
let next = 0
await Promise.all(Array.from({ length: Math.min(6, requests.length) }, async () => {
  while (next < requests.length) {
    const index = next++
    const { file, args } = npmInvocation(requests[index])
    try {
      const { stdout } = await run(file, args, { encoding: 'utf8', timeout: 60000, maxBuffer: 32 * 1024 * 1024 })
      results[index] = { stdout }
    } catch (error) {
      results[index] = { error: `npm ${args.join(' ')} failed\n${error.stderr || error.message}` }
    }
  }
}))
process.stdout.write(JSON.stringify(results))
