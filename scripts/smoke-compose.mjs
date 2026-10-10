/**
 * Install the packed plugin with the real DSH plugin manager and compare the
 * composed web profile with the profile from before the install.
 * The home is a scratch directory. The operator's DSH_HOME is not written.
 */
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import {
  assertIsolatedHome, captureDsh, developmentPin, ensureDshCli, REPO_ROOT, scratchHome,
} from './lib/dsh-cli.mjs'

const PACKAGE_NAME = '@dsh-electron/dsh-theme-studio'
const home = scratchHome(`compose-${process.pid}`)
const keep = process.env.DSH_SMOKE_KEEP === '1'
const failures = []
const fail = (message) => failures.push(message)

function parseDump(text) {
  const jsTag = {
    identify: () => false,
    tag: 'tag:yaml.org,2002:js',
    resolve: (value) => value,
  }
  try {
    return parse(text, { logLevel: 'silent', customTags: [jsTag] })
  } catch {
    return parse(text.replace(/!!js[ \t]*/gu, ''), { logLevel: 'silent' })
  }
}

function rowsOf(text) {
  const rows = parseDump(text)
  if (!Array.isArray(rows)) throw new Error('dsh --dump-config did not print a YAML array')
  return rows.filter(row => row !== null && typeof row === 'object')
}

function byId(rows) {
  const map = new Map()
  for (const row of rows) if (typeof row.id === 'string') map.set(row.id, row)
  return map
}

try {
  if (!existsSync(join(REPO_ROOT, 'lib/index.js')) || !existsSync(join(REPO_ROOT, 'lib/client.js'))) {
    throw new Error('lib/ is missing — run pnpm build before the smoke')
  }
  rmSync(home, { recursive: true, force: true })
  mkdirSync(home, { recursive: true })
  assertIsolatedHome(home)
  const version = developmentPin()
  const cli = ensureDshCli(version)
  const target = existsSync(join(REPO_ROOT, '.pack/plugin.tgz'))
    ? join(REPO_ROOT, '.pack/plugin.tgz')
    : REPO_ROOT
  console.log(`[smoke:compose] home: ${home}`)
  console.log(`[smoke:compose] cli: ${cli}`)
  console.log(`[smoke:compose] package: ${target}`)

  const init = captureDsh(cli, ['plugin', '--profile', 'web', 'install'], home)
  if (init.code !== 0) fail(`web profile install failed\n${init.stderr}`)
  const baselineRun = captureDsh(cli, ['--profile', 'web', '--dump-config'], home)
  if (baselineRun.code !== 0) fail(`baseline dump failed\n${baselineRun.stderr}`)
  const add = captureDsh(cli, ['plugin', '--profile', 'web', 'add', target], home)
  if (add.code !== 0) fail(`plugin add failed\n${add.stderr}`)
  const composedRun = captureDsh(cli, ['--profile', 'web', '--dump-config'], home)
  if (composedRun.code !== 0) fail(`composed dump failed\n${composedRun.stderr}`)

  if (failures.length === 0) {
    const baseline = rowsOf(baselineRun.stdout)
    const composed = rowsOf(composedRun.stdout)
    const before = byId(baseline)
    const after = byId(composed)
    const studioRows = composed.filter(row => row.id === 'theme-studio')
    if (before.has('theme-studio')) fail('baseline web profile already contains theme-studio')
    if (studioRows.length !== 1) fail(`expected one theme-studio row, found ${studioRows.length}`)
    const studio = studioRows[0]
    if (studio?.name !== PACKAGE_NAME) fail(`theme-studio name is ${String(studio?.name)}`)
    if (studio?.disabled === true) fail('theme-studio row is disabled')
    const themeBefore = before.get('ui-theme')
    const themeAfter = after.get('ui-theme')
    if (themeBefore === undefined) fail('baseline web profile has no ui-theme row')
    if (themeAfter === undefined) fail('composed profile dropped ui-theme')
    if (themeAfter?.disabled === true && themeBefore?.disabled !== true) fail('composed profile disabled official ui-theme')
    if (themeAfter?.name !== themeBefore?.name) fail('official ui-theme package changed')
    const installed = join(home, 'profiles', 'web', 'node_modules', '@dsh-electron', 'dsh-theme-studio')
    const installedManifestPath = join(installed, 'package.json')
    if (!existsSync(installedManifestPath)) fail('profile node_modules does not contain the plugin')
    else {
      const installedManifest = JSON.parse(readFileSync(installedManifestPath, 'utf8'))
      if (installedManifest.name !== PACKAGE_NAME) fail('installed package name changed')
      if (installedManifest.dsh?.client?.platform !== 'web') fail('installed dsh.client.platform is not web')
      const client = readFileSync(join(installed, 'lib/client.js'), 'utf8')
      if (!client.includes('window.__ModuleLoader__.load')) fail('installed client bundle has no ModuleLoader registration')
      if (/require\(["'][^"']+\.module\.css["']\)/u.test(client) || /from ["'][^"']+\.module\.css["']/u.test(client)) {
        fail('installed client bundle still imports a CSS module')
      }
    }
    const duplicateProviders = composed.filter(row => typeof row.name === 'string' && row.name.startsWith(PACKAGE_NAME) && row.id !== 'theme-studio')
    if (duplicateProviders.length > 0) fail(`unexpected extra plugin rows: ${duplicateProviders.map(row => row.id).join(', ')}`)
  }
} catch (error) {
  fail(error instanceof Error ? error.stack ?? error.message : String(error))
} finally {
  if (!keep) rmSync(home, { recursive: true, force: true })
  else console.log(`[smoke:compose] kept ${home}`)
}

if (failures.length > 0) {
  console.error('[smoke:compose] failed:')
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exit(1)
}
console.log('[smoke:compose] passed: bare theme-studio row, official ui-theme kept, client bundle installed')
