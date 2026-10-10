/** Isolated DSH_HOME and a CLI pinned to the release this checkout is testing. */
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describeRelease } from './metadata.mjs'
import { isDshPackage, renderWorkspace } from './repoint.mjs'
import { readLockfile, versionsOf } from './lockfile.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

/** @param label - directory name under the scratch root. */
export function scratchHome(label) {
  const base = process.env.DSH_SMOKE_HOME ?? join(tmpdir(), 'dsh-theme-studio-smoke')
  return join(base, label)
}

/** Refuse a home that is the operator's real harness directory. */
export function assertIsolatedHome(home) {
  const real = process.env.HOME === undefined ? undefined : resolve(process.env.HOME, '.dsh')
  if (real !== undefined && resolve(home) === real) {
    throw new Error(`refusing to use the real DSH home ${home}`)
  }
}

/**
 * @param version - exact `@deepseek-ai/dsh` release.
 * @returns absolute path of that release's CLI entry.
 */
export function ensureDshCli(version) {
  const override = process.env.DSH_CLI
  if (override !== undefined && override !== '') {
    if (!existsSync(override)) throw new Error(`DSH_CLI points at a missing file: ${override}`)
    return override
  }
  const require = createRequire(join(root, 'package.json'))
  try {
    const manifestPath = require.resolve('@deepseek-ai/dsh/package.json')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    if (manifest.version === version) return cliPath(manifestPath, manifest)
  } catch {
    // The plugin checkout does not depend on the CLI. Provision one below.
  }
  const cache = join(tmpdir(), 'theme-studio-dsh-cli', 'v2', version)
  const manifestPath = join(cache, 'node_modules/@deepseek-ai/dsh/package.json')
  if (!existsSync(manifestPath)) {
    mkdirSync(cache, { recursive: true })
    const plugin = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    const direct = Object.keys(plugin.devDependencies ?? {}).filter(isDshPackage)
    const metadata = describeRelease(version, [...direct, '@deepseek-ai/dsh'])
    const pins = { ...metadata.pins, '@deepseek-ai/dsh': version }
    writeFileSync(join(cache, 'package.json'), `${JSON.stringify({
      name: 'theme-studio-dsh-cli',
      private: true,
      packageManager: plugin.packageManager,
      dependencies: { '@deepseek-ai/dsh': version },
    }, null, 2)}\n`)
    writeFileSync(join(cache, 'pnpm-workspace.yaml'), renderWorkspace(pins))
    const file = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
    const install = spawnSync(file, ['install', '--ignore-scripts', '--config.minimumReleaseAge=0'], {
      cwd: cache,
      encoding: 'utf8',
      shell: process.platform === 'win32',
    })
    if (install.status !== 0) {
      throw new Error(`could not install @deepseek-ai/dsh@${version}\n${install.stdout ?? ''}${install.stderr ?? ''}`)
    }
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (manifest.version !== version) throw new Error(`provisioned CLI is ${manifest.version}, not ${version}`)
  const { resolved } = readLockfile(join(cache, 'pnpm-lock.yaml'))
  const releases = [...new Set(resolved.filter(row => isDshPackage(row.name)).map(row => row.version))]
  if (releases.length !== 1 || releases[0] !== version) {
    throw new Error(`CLI cache mixes DSH ${releases.join(', ')}; remove this isolated cache and retry: ${cache}`)
  }
  for (const name of ['@deepseek-ai/cordis', '@deepseek-ai/schemastery']) {
    if (versionsOf(resolved, name).length !== 1) throw new Error(`CLI cache does not have one ${name} identity: ${cache}`)
  }
  return cliPath(manifestPath, manifest)
}

function cliPath(manifestPath, manifest) {
  const bin = typeof manifest.bin === 'string' ? manifest.bin : manifest.bin?.dsh
  if (typeof bin !== 'string') throw new Error('@deepseek-ai/dsh has no dsh bin')
  return join(dirname(manifestPath), bin)
}

/**
 * @param cli - CLI entry path.
 * @param args - arguments after the entry.
 * @param home - isolated DSH_HOME.
 * @returns stdout, stderr, and exit code.
 */
export function captureDsh(cli, args, home) {
  const child = spawnSync(process.execPath, [cli, ...args], {
    encoding: 'utf8',
    env: { ...process.env, DSH_HOME: home },
    timeout: 180000,
    maxBuffer: 16 * 1024 * 1024,
  })
  return { stdout: child.stdout ?? '', stderr: `${child.stderr ?? ''}${child.error?.message ?? ''}`, code: child.status ?? 1 }
}

/** Development pin of the checkout that is about to be smoked. */
export function developmentPin() {
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  return manifest.devDependencies['@deepseek-ai/dsh-settings']
}

export const REPO_ROOT = root
