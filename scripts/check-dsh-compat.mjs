/** compat:check — allowlist, peers, pin, overrides, lockfile, install, and READMEs. */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assessRepository } from './lib/assess-compat.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const report = assessRepository(root)
for (const note of report.notes) console.log(`[compat] ${note}`)
console.log(`[compat] diagnosis: ${report.diagnosis}`)
if (!report.ok) {
  console.error('\n[compat] the DSH compatibility contract is violated:\n')
  for (const failure of report.failures) console.error(`  - ${failure.message}`)
  console.error(`\n${report.recovery}\n`)
  process.exit(1)
}
console.log('[compat] allowlist, peers, development pin, overrides, lockfile, installed modules, and READMEs agree')
