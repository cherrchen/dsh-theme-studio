/**
 * Pack a real tarball, inspect its contents, and install that tarball into a
 * temporary package that loads the Host entry.
 */
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawn } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const failures = []
const fail = (message) => failures.push(message)

function run(command, args, cwd, stdio = 'inherit') {
  const file = process.platform === 'win32' && command === 'pnpm' ? 'pnpm.cmd' : command
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, { cwd, stdio, shell: process.platform === 'win32' })
    child.on('error', reject)
    child.on('close', code => resolve(code ?? 1))
  })
}

function walk(dir, prefix, listing) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const relative = prefix === '' ? entry.name : `${prefix}/${entry.name}`
    if (entry.isDirectory()) walk(join(dir, entry.name), relative, listing)
    else listing.add(relative)
  }
}

const required = [
  'package/package.json',
  'package/cordis.patch.yml',
  'package/lib/index.js',
  'package/lib/client.js',
  'package/lib/validate-theme.js',
  'package/lib/types/index.d.ts',
  'package/lib/types/client/index.d.ts',
  'package/README.md',
  'package/README.en.md',
  'package/CHANGELOG.md',
  'package/CHANGELOG.en.md',
]

/**
 * A theme file that passes every format and contrast check: monochrome
 * surfaces and labels put all derived pairs at the 21:1 extreme.
 */
const VALID_THEME = {
  version: 1,
  id: 'user.probe',
  name: 'Probe',
  palette: {
    light: {
      bgBase: '#ffffff', bgLayer1: '#ffffff', bgLayer2: '#ffffff', bgOverlay: '#ffffff',
      borderL1: '#000000', borderL2: '#000000', brand: '#000000',
      labelPrimary: '#000000', labelSecondary: '#000000',
      error: '#000000', success: '#000000', warn: '#000000', sidebar: '#ffffff',
    },
    dark: {
      bgBase: '#000000', bgLayer1: '#000000', bgLayer2: '#000000', bgOverlay: '#000000',
      borderL1: '#ffffff', borderL2: '#ffffff', brand: '#ffffff',
      labelPrimary: '#ffffff', labelSecondary: '#ffffff',
      error: '#ffffff', success: '#ffffff', warn: '#ffffff', sidebar: '#000000',
    },
  },
}

if (!existsSync(join(root, 'lib/index.js')) || !existsSync(join(root, 'lib/client.js'))) {
  console.error('[package] lib/ is missing. Run pnpm build first.')
  process.exit(1)
}

const out = mkdtempSync(join(tmpdir(), 'theme-studio-pack-'))
const extractDir = join(out, 'extract')
mkdirSync(extractDir)
const keep = process.env.DSH_PACKAGE_KEEP === '1'
try {
  if (await run('pnpm', ['pack', '--pack-destination', out], root) !== 0) fail('pnpm pack failed')
  const names = readdirSync(out).filter(name => name.endsWith('.tgz'))
  if (names.length !== 1) fail(`expected one tarball, found ${names.join(', ') || 'none'}`)
  const tarballPath = join(out, names[0] ?? 'missing.tgz')
  if (names.length === 1) {
    // GNU tar (including Git for Windows) treats the colon in C:\\... as
    // a remote archive. Use local relative names, which also work with BSD tar.
    if (await run('tar', ['-xzf', names[0], '-C', 'extract'], out) !== 0) {
      throw new Error('could not extract the tarball')
    }
    const listing = new Set()
    walk(extractDir, '', listing)
    for (const file of required) if (!listing.has(file)) fail(`tarball is missing ${file}`)
    const manifest = JSON.parse(readFileSync(join(extractDir, 'package/package.json'), 'utf8'))
    if (manifest.dsh?.client?.platform !== 'web') fail('dsh.client.platform is not web')
    if (manifest.exports?.['./client']?.default !== './lib/client.js') fail('client export does not point at lib/client.js')
    const patch = readFileSync(join(extractDir, 'package/cordis.patch.yml'), 'utf8')
    if (!patch.includes('id: theme-studio')) fail('cordis.patch.yml has no theme-studio row')
    if (!patch.includes("name: '@dsh-electron/dsh-theme-studio'")) fail('carrier row is not the bare package name')
    if (patch.includes("name: '@dsh-electron/dsh-theme-studio/client'")) fail('carrier row must not be a /client subpath')
    const client = readFileSync(join(extractDir, 'package/lib/client.js'), 'utf8')
    if (!client.includes('window.__ModuleLoader__.load')) fail('client bundle has no ModuleLoader registration')
    if (!client.includes('data-plugin-css')) fail('client bundle does not inject a CSS module style tag')
    if (/require\(["'][^"']+\.module\.css["']\)/u.test(client) || /from ["'][^"']+\.module\.css["']/u.test(client)) {
      fail('client bundle still imports a CSS module')
    }
    if (!client.includes('require("react/jsx-runtime")') && !client.includes("require('react/jsx-runtime')")) {
      fail('client bundle does not keep react/jsx-runtime external')
    }
    if (!client.includes('require("@deepseek-ai/dsh-client-store")') && !client.includes("require('@deepseek-ai/dsh-client-store')")) {
      fail('client bundle does not keep @deepseek-ai/dsh-client-store external')
    }
    if (client.includes('node_modules/.pnpm/@deepseek-ai+dsh-client-store')) fail('client bundle inlines a second client store')
    if (client.includes('node_modules/.pnpm/@deepseek-ai+cordis@')) fail('client bundle inlines a second Cordis copy')
    const host = readFileSync(join(extractDir, 'package/lib/index.js'), 'utf8')
    if (host.includes('classifyInstallation') || host.includes('SUPPORTED_DSH_RELEASES') || host.includes('createRequire')) {
      fail('host bundle contains a Node version probe')
    }
    if (!host.includes('@deepseek-ai/schemastery')) fail('host bundle does not keep Schemastery external')
    const types = readFileSync(join(extractDir, 'package/lib/types/client/index.d.ts'), 'utf8')
    if (!types.includes('themeStudio')) fail('client declarations do not expose themeStudio')

    const probe = join(out, 'probe')
    mkdirSync(probe)
    writeFileSync(join(probe, 'package.json'), `${JSON.stringify({
      name: 'theme-studio-tarball-probe',
      private: true,
      type: 'module',
      packageManager: JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).packageManager,
      dependencies: { '@dsh-electron/dsh-theme-studio': `file:${tarballPath}` },
    }, null, 2)}\n`)
    writeFileSync(join(probe, 'pnpm-workspace.yaml'), readFileSync(join(root, 'pnpm-workspace.yaml')))
    if (await run('pnpm', ['install', '--ignore-scripts', '--config.minimumReleaseAge=0'], probe) !== 0) {
      fail('installing the packed tarball failed')
    } else {
      const entry = join(probe, 'node_modules/@dsh-electron/dsh-theme-studio/lib/index.js')
      if (!existsSync(entry)) fail('installed tarball has no lib/index.js')
      else {
        const loaded = await import(pathToFileURL(entry).href)
        if (loaded.name !== 'theme-studio') fail(`installed host name is ${String(loaded.name)}`)
        else console.log('[package] installed tarball host entry loaded')
      }
      const validator = join(probe, 'node_modules/@dsh-electron/dsh-theme-studio/lib/validate-theme.js')
      if (!existsSync(validator)) {
        fail('installed tarball has no lib/validate-theme.js')
      } else {
        // Smoke the bundled CLI end to end: usage error, format rejection,
        // and a fully passing theme. Monochrome palettes make every derived
        // contrast check land at the 21:1 extreme.
        const smoke = async (args, want, label) => {
          const code = await run('node', args, probe, 'ignore')
          if (code !== want) fail(`validator ${label} exited ${code}, expected ${want}`)
        }
        writeFileSync(join(probe, 'probe.pass.dsh-theme.json'), `${JSON.stringify(VALID_THEME)}\n`)
        writeFileSync(join(probe, 'probe.bad.dsh-theme.json'), '{')
        await smoke([validator], 2, 'usage')
        await smoke([validator, 'probe.bad.dsh-theme.json'], 1, 'malformed input')
        await smoke([validator, 'probe.pass.dsh-theme.json'], 0, 'valid theme')
        console.log('[package] validator CLI smoke passed (usage=2, malformed=1, valid=0)')
      }
    }
    const pointer = join(root, '.pack')
    mkdirSync(pointer, { recursive: true })
    const published = join(pointer, 'plugin.tgz')
    copyFileSync(tarballPath, published)
    console.log(`[package] tarball: ${published}`)
  }
} catch (error) {
  fail(error instanceof Error ? error.stack ?? error.message : String(error))
} finally {
  if (!keep) rmSync(out, { recursive: true, force: true })
}

if (failures.length > 0) {
  console.error('[package] verification failed:')
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exit(1)
}
console.log('[package] tarball contents, client loader, CSS injection, and host load agree')
