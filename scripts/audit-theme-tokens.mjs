/** Report token coverage for the ThemeRuntime bundle installed in this checkout. */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { readStringArray } from './lib/contract.mjs'
import { auditTokens } from './lib/token-audit.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(root, 'package.json'))

function literals(file) {
  const source = readFileSync(join(root, file), 'utf8')
  return [...source.matchAll(/'(--(?:dsw|shiki)-[a-z0-9-]+)'/gu)].map(match => match[1])
}

const required = readStringArray(readFileSync(join(root, 'src/client/types.ts'), 'utf8'), 'STAGE1_TOKENS')
const overridden = [...new Set([...literals('src/client/presets.ts'), ...literals('src/client/chrome-tokens.ts'), ...required])]
const bundle = readFileSync(require.resolve('@deepseek-ai/dsh-client-ui-theme/client'), 'utf8')
const report = auditTokens(bundle, overridden, required)
console.log(`[tokens] covered ${report.covered.length}, extra ${report.extra.length}, official retained ${report.retained.length}`)
for (const note of report.notes) console.log(`[tokens] note: ${note}`)
if (report.extra.length > 0) {
  console.log('[tokens] extra overrides are accepted when an older runtime does not reference them:')
  for (const name of report.extra) console.log(`  ${name}`)
}
if (!report.ok) {
  console.error('[tokens] incompatible token set:')
  for (const failure of report.failures) console.error(`  - ${failure}`)
  process.exit(1)
}
console.log('[tokens] stage-1 tokens are present upstream and static white tokens are not overridden')
