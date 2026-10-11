/**
 * upgrade-dsh — repoint this checkout at one DSH release.
 *
 * The support allowlist and, unless `--admit-candidate` is set, the peer
 * ranges stay untouched. A green candidate run is evidence for a human
 * promotion. It is not itself a support change.
 *
 * ```bash
 * node scripts/upgrade-dsh.mjs 0.2.0-rc.2
 * node scripts/upgrade-dsh.mjs --print-latest-prerelease
 * node scripts/upgrade-dsh.mjs --print-installed
 * node scripts/upgrade-dsh.mjs 0.2.2-alpha.1 --admit-candidate
 * ```
 *
 * Candidate admission is restricted to isolated copies or throwaway Actions
 * checkouts. Use run-dsh-matrix.mjs --candidate for a local candidate probe.
 * Ordinary upgrades refuse dirty manifests and never restore files themselves.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isExactVersion } from './lib/exact-pin.mjs'
import { latestPrerelease } from './lib/metadata.mjs'
import { isDshPackage, repointInstallation } from './lib/repoint.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const guarded = ['package.json', 'pnpm-workspace.yaml', 'pnpm-lock.yaml']

function printInstalled() {
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  const require = createRequire(join(root, 'package.json'))
  const names = [...new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.devDependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
  ])].filter(name => isDshPackage(name) || name === '@deepseek-ai/cordis' || name === '@deepseek-ai/schemastery').sort()
  const resolved = {}
  for (const name of names) {
    try {
      resolved[name] = require(`${name}/package.json`).version
    } catch {
      resolved[name] = null
    }
  }
  console.log(JSON.stringify(resolved, null, 2))
}

function assertClean() {
  if (process.env.DSH_UPGRADE_ALLOW_DIRTY === '1') return
  const output = execFileSync('git', ['status', '--porcelain', '--', ...guarded], {
    cwd: root,
    encoding: 'utf8',
  })
  if (output.trim() !== '') {
    console.error('[upgrade] package.json, pnpm-workspace.yaml, or pnpm-lock.yaml has uncommitted changes.')
    console.error('[upgrade] Commit or stash them first. This command rewrites those files.')
    process.exit(2)
  }
}

const args = process.argv.slice(2)
const admit = args.includes('--admit-candidate')
const positional = args.filter(arg => arg !== '--admit-candidate')
const [argument] = positional
if (argument === undefined) {
  console.error('usage: node scripts/upgrade-dsh.mjs <version> [--admit-candidate] | --print-latest-prerelease | --print-installed')
  process.exit(2)
}
if (argument === '--print-latest-prerelease') {
  console.log(latestPrerelease())
  process.exit(0)
}
if (argument === '--print-installed') {
  printInstalled()
  process.exit(0)
}

const target = argument === '--latest-prerelease' ? latestPrerelease() : argument
if (!isExactVersion(target)) {
  console.error(`[upgrade] "${target}" is not an exact version`)
  process.exit(2)
}
assertClean()
const { metadata, changed } = repointInstallation(root, target, { admitCandidate: admit })
console.log(`[upgrade] cordis pin: ${metadata.cordis}`)
console.log(`[upgrade] schemastery pin: ${metadata.schemastery}`)
console.log(`[upgrade] pinned ${target}`)
console.log(`[upgrade] devDependencies rewritten: ${changed.length}`)
for (const entry of changed) console.log(`           ${entry}`)
console.log(`[upgrade] workspace overrides rewritten: ${Object.keys(metadata.pins).length}`)
console.log('[upgrade] next: pnpm install --no-frozen-lockfile --config.minimumReleaseAge=0')
if (admit) console.log('[upgrade] candidate peers were widened in this checkout only. Do not commit them as support.')
else console.log('[upgrade] peers and SUPPORTED_DSH_RELEASES were not modified')
console.log('[upgrade] local candidate probes: node scripts/run-dsh-matrix.mjs --candidate <version>')
