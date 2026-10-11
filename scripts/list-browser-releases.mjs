/**
 * Browser journey anchors.
 *
 * `0.1.5` and `0.1.6` are the allowlisted releases whose settings host still
 * exposes `register`. Later allowlisted releases use `configure`. The newest
 * allowlisted release is the current development pin. This is a journey
 * selection, not a second support list.
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readContract } from './lib/contract.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const { supported } = readContract(root)
if (process.argv.includes('--all')) {
  console.log(JSON.stringify(supported))
} else {
  const legacy = [...supported].reverse().find(version => version.startsWith('0.1.5-') || version.startsWith('0.1.6-'))
  const current = supported.at(-1)
  if (legacy === undefined || current === undefined) {
    throw new Error('Browser journeys need a 0.1.5 or 0.1.6 release on the allowlist (register-era settings) and a current pin.')
  }
  console.log(JSON.stringify([...new Set([legacy, current])]))
}
