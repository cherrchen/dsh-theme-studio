/**
 * compat:check — repository half of the DSH compatibility contract.
 *
 * Four declarations must agree, and the installed lockfile must not mix
 * another DSH release underneath them:
 *
 * ```text
 * src/compat/dsh-version.ts   SUPPORTED_DSH_RELEASES
 * package.json                peerDependencies of every @deepseek-ai/dsh*
 * package.json                devDependencies pin
 * pnpm-lock.yaml              resolved @deepseek-ai/dsh* versions
 * ```
 *
 * The allowlist is read from the TypeScript source so this script runs before
 * `pnpm build`, on a checkout that has no `lib/`.
 */

import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CONTRACT = join(REPO_ROOT, 'src', 'compat', 'dsh-version.ts')

const failures = []
const notes = []

/** Record a violation. */
function fail(message) {
  failures.push(message)
}

/**
 * Extract one `export const NAME = [...]` string array from the contract source.
 * @param source - the contract file's text.
 * @param name - the exported binding to read.
 * @returns the string entries, in order.
 */
function readStringArray(source, name) {
  const match = new RegExp(String.raw`export const ${name} = \[([^\]]*)\]`, 'u').exec(source)
  if (match === null) throw new Error(`${name} is not declared as an array literal in src/compat/dsh-version.ts`)
  const entries = [...match[1].matchAll(/'([^']+)'/gu)].map(token => token[1])
  if (entries.length === 0) throw new Error(`${name} is empty in src/compat/dsh-version.ts`)
  return entries
}

/**
 * Versions named in one README compatibility section.
 * @param markdown - the README text.
 * @param heading - the section heading, including the leading hashes.
 * @returns version strings in the order they appear.
 */
function readmeVersions(markdown, heading) {
  const start = markdown.indexOf(heading)
  if (start < 0) throw new Error(`missing heading ${heading}`)
  const rest = markdown.slice(start + heading.length)
  const next = rest.search(/\n## /u)
  const section = next < 0 ? rest : rest.slice(0, next)
  return [...section.matchAll(/\d+\.\d+\.\d+(?:-[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)*)?/gu)].map(token => token[0])
}

const contractSource = readFileSync(CONTRACT, 'utf8')
const supported = readStringArray(contractSource, 'SUPPORTED_DSH_RELEASES')
const required = readStringArray(contractSource, 'REQUIRED_CORE_PACKAGES')
const optional = readStringArray(contractSource, 'OPTIONAL_CORE_PACKAGES')
const core = [...required, ...optional]
const expectedRange = supported.join(' || ')

const manifest = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'))
const peers = manifest.peerDependencies ?? {}
const devs = manifest.devDependencies ?? {}
const workspace = readFileSync(join(REPO_ROOT, 'pnpm-workspace.yaml'), 'utf8')
const lockfile = readFileSync(join(REPO_ROOT, 'pnpm-lock.yaml'), 'utf8')

console.log(`[compat] allowlist: ${supported.join(', ')}`)

for (const [name, range] of Object.entries(peers)) {
  if (!name.startsWith('@deepseek-ai/dsh-')) continue
  if (range !== expectedRange) {
    fail(`peerDependencies["${name}"] is "${range}" but the allowlist is "${expectedRange}"`)
  }
}

for (const name of core) {
  if (!(name in peers)) fail(`${name} is inspected by the contract but is not a peerDependency`)
}

const pinned = new Set()
for (const [name, version] of Object.entries(devs)) {
  if (!name.startsWith('@deepseek-ai/dsh')) continue
  pinned.add(version)
}
if (pinned.size !== 1) {
  fail(`devDependencies pin ${pinned.size === 0 ? 'no' : [...pinned].sort().join(', ')} dsh release(s); pin exactly one`)
} else {
  const [pin] = [...pinned]
  if (!supported.includes(pin)) fail(`devDependencies pin ${pin}, which is not on the allowlist`)
  else notes.push(`development pin: ${pin}`)
}

const [pin] = [...pinned]
if (pin !== undefined) {
  for (const match of workspace.matchAll(/'(@deepseek-ai\/dsh(?:-[\w-]+)?)':\s*(\S+)/gu)) {
    if (match[2] !== pin) fail(`pnpm override ${match[1]} is ${match[2]} but the development pin is ${pin}`)
  }
  for (const name of Object.keys(devs).filter(item => item.startsWith('@deepseek-ai/dsh'))) {
    const entry = `'${name}@${pin}'`
    if (!workspace.includes(entry)) fail(`minimumReleaseAgeExclude is missing ${entry}`)
  }
  const cordis = devs['@deepseek-ai/cordis']
  if (typeof cordis === 'string' && !workspace.includes(`'@deepseek-ai/cordis': ${cordis}`)) {
    fail(`pnpm override for @deepseek-ai/cordis does not match devDependencies (${cordis})`)
  }
}

const installed = new Map()
for (const name of core) {
  try {
    installed.set(name, require(`${name}/package.json`).version)
  } catch {
    installed.set(name, undefined)
  }
}
for (const name of required) {
  if (installed.get(name) === undefined) fail(`${name} is required but not installed (run pnpm install)`)
}
const releases = [...new Set([...installed.values()].filter(version => version !== undefined))]
if (releases.length > 1) {
  fail(`the installed tree mixes dsh releases: ${releases.sort().join(', ')}`)
} else if (releases.length === 1 && !supported.includes(releases[0])) {
  fail(`the installed tree is dsh ${releases[0]}, which is not on the allowlist`)
} else if (releases.length === 1) {
  notes.push(`installed tree: ${releases[0]}`)
}

const locked = [...lockfile.matchAll(/@deepseek-ai\/dsh(?:-[\w-]+)?@(\d+\.\d+\.\d+(?:-[A-Za-z0-9.]+)?)/gu)]
  .map(match => match[1])
const lockedReleases = [...new Set(locked)]
if (lockedReleases.length > 1) {
  fail(`pnpm-lock.yaml mixes dsh releases: ${lockedReleases.sort().join(', ')}`)
} else if (pin !== undefined && lockedReleases.length === 1 && lockedReleases[0] !== pin) {
  fail(`pnpm-lock.yaml resolved dsh ${lockedReleases[0]} but devDependencies pin ${pin}`)
}

for (const [file, heading] of [['README.md', '## DSH compatibility'], ['README.zh.md', '## DSH 兼容性']]) {
  const versions = readmeVersions(readFileSync(join(REPO_ROOT, file), 'utf8'), heading)
  const unique = [...new Set(versions)]
  if (unique.join('\n') !== supported.join('\n') || versions.length !== supported.length) {
    fail(`${file} compatibility section lists ${unique.join(', ') || '(none)'} but the allowlist is ${supported.join(', ')}`)
  }
}

for (const note of notes) console.log(`[compat] ${note}`)

if (failures.length > 0) {
  console.error('\n[compat] the DSH compatibility contract is violated:\n')
  for (const failure of failures) console.error(`  - ${failure}`)
  console.error('')
  process.exit(1)
}

console.log('[compat] allowlist, peers, development pin, lockfile, and READMEs agree')
