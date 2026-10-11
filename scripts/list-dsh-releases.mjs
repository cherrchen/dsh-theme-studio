/** Emit the CI version axis from the support allowlist, without building. */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readContract } from './lib/contract.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const { supported } = readContract(root)
console.log(JSON.stringify(supported))
