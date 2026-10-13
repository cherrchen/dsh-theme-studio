/**
 * Verify exact DSH releases in isolated installations.
 *
 * The checkout this command starts from is copied and then left untouched.
 * Supported releases are the default. `--candidate <version>` retargets an
 * isolated copy, widens that copy's peer admission, and still fails on mixed
 * or incomplete trees. It does not edit SUPPORTED_DSH_RELEASES.
 */
import { appendFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'
import { readContract } from './lib/contract.mjs'
import { isExactVersion } from './lib/exact-pin.mjs'
import { readLockfile } from './lib/lockfile.mjs'
import { isDshPackage, renderWorkspace, repointInstallation } from './lib/repoint.mjs'
import { runLogged } from './lib/run.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SKIP = new Set([
  'node_modules', '.git', 'lib', '.pnpm-store', 'dist', '.cursor', '.pack', 'matrix-evidence', 'coverage',
])

function parseArgs(argv) {
  const positional = []
  let candidate
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--candidate') {
      candidate = argv[index + 1]
      index += 1
      if (candidate === undefined) throw new Error('--candidate needs an exact version')
    } else positional.push(arg)
  }
  if (candidate !== undefined && positional.length > 0) {
    throw new Error('Pass supported versions or one --candidate, not both')
  }
  return { positional, candidate }
}

function assertLock(dir, version, metadata) {
  const { resolved } = readLockfile(join(dir, 'pnpm-lock.yaml'))
  const problems = []
  const dshVersions = [...new Set(resolved.filter(row => isDshPackage(row.name)).map(row => row.version))]
  if (dshVersions.length !== 1 || dshVersions[0] !== version) {
    problems.push(`DSH packages resolved to ${dshVersions.join(', ') || 'nothing'} instead of ${version}`)
  }
  for (const [name, pin] of Object.entries(metadata.pins)) {
    if (isDshPackage(name)) continue
    const found = [...new Set(resolved.filter(row => row.name === name).map(row => row.version))]
    const required = name === '@deepseek-ai/cordis' || name === '@deepseek-ai/schemastery'
    if (found.length > 1) problems.push(`${name} mixes ${found.join(', ')}`)
    else if (found.length === 1 && found[0] !== pin) problems.push(`${name} resolved to ${found[0]} instead of metadata pin ${pin}`)
    else if (required && found.length === 0) problems.push(`${name} was not installed`)
  }
  const drifting = [...new Set(resolved.filter(row => isDshPackage(row.name) && row.version !== version).map(row => row.name))]
  return { problems, drifting }
}

// Retargeted trees resolve fresh, so their dev tools can be newer than
// pnpm's default release-age cutoff — which install, exec, and run-script
// calls re-verify. Relax the isolated tree only; the source checkout and
// the frozen development baseline keep their policy.
function relaxReleaseAge(dir) {
  appendFileSync(join(dir, 'pnpm-workspace.yaml'), 'minimumReleaseAge: 0\n')
}

function pinDrift(dir, names, version) {
  const document = parse(readFileSync(join(dir, 'pnpm-workspace.yaml'), 'utf8'))
  const pins = { ...(document.overrides ?? {}) }
  for (const name of names) pins[name] = version
  writeFileSync(join(dir, 'pnpm-workspace.yaml'), renderWorkspace(pins))
  relaxReleaseAge(dir)
}

const { supported } = readContract(root)
const { positional, candidate } = parseArgs(process.argv.slice(2))
if (candidate !== undefined) {
  if (!isExactVersion(candidate)) throw new Error(`Candidate ${JSON.stringify(candidate)} is not an exact version`)
  if (supported.includes(candidate)) throw new Error(`${candidate} is already supported. Run it without --candidate.`)
}
for (const version of positional) {
  if (!supported.includes(version)) throw new Error(`Release is outside the support contract: ${version}`)
}
const selected = candidate !== undefined ? [candidate] : (positional.length > 0 ? positional : supported)
const evidence = process.env.DSH_MATRIX_EVIDENCE
  ? resolve(process.env.DSH_MATRIX_EVIDENCE)
  : mkdtempSync(join(tmpdir(), 'theme-studio-matrix-'))
mkdirSync(evidence, { recursive: true })
console.log(`[matrix] evidence: ${evidence}`)
console.log(`[matrix] mode: ${candidate !== undefined ? 'candidate' : 'supported'}`)

const results = []
let failed = false
for (const version of selected) {
  // Canonicalize before launching pnpm/Vitest too: their own imports and CWD
  // must use the same long Windows path as the test configuration.
  const dir = realpathSync.native(mkdtempSync(join(tmpdir(), `theme-studio-${version}-`)))
  const result = { version, candidate: candidate !== undefined, steps: [], passed: false, directory: dir }
  try {
    cpSync(root, dir, {
      recursive: true,
      filter: (src) => {
        if (src === root) return true
        const top = relative(root, src).split(sep)[0]
        return top !== undefined && !SKIP.has(top)
      },
    })
    const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    const frozen = candidate === undefined && version === manifest.devDependencies['@deepseek-ai/dsh-settings']
    const metadata = frozen
      ? { pins: parse(readFileSync(join(dir, 'pnpm-workspace.yaml'), 'utf8')).overrides }
      : repointInstallation(dir, version, { admitCandidate: candidate !== undefined }).metadata
    result.metadata = {
      cordis: metadata.pins['@deepseek-ai/cordis'],
      schemastery: metadata.pins['@deepseek-ai/schemastery'],
    }
    if (!frozen) {
      rmSync(join(dir, 'pnpm-lock.yaml'), { force: true })
      relaxReleaseAge(dir)
    }
    const env = { ...process.env, CI: 'true', DSH_MATRIX_EVIDENCE: evidence }
    if (candidate !== undefined) env.DSH_THEME_STUDIO_CANDIDATE = version
    else delete env.DSH_THEME_STUDIO_CANDIDATE
    const steps = [
      ['pnpm', ['install', '--ignore-scripts', frozen ? '--frozen-lockfile' : '--no-frozen-lockfile', '--config.minimumReleaseAge=0'], 'install'],
      ['pnpm', ['compat:check'], 'compat-check'],
      ['pnpm', ['lint'], 'lint'],
      ['pnpm', ['typecheck'], 'typecheck'],
      ['pnpm', ['build'], 'build'],
      ['pnpm', ['test'], 'test'],
      ['pnpm', ['docs:check'], 'docs-check'],
      ['node', ['scripts/audit-theme-tokens.mjs'], 'audit-tokens'],
      ['node', ['scripts/verify-package.mjs'], 'verify-package'],
      ['node', ['scripts/smoke-theme.mjs'], 'smoke-theme'],
      ['node', ['scripts/smoke-compose.mjs'], 'smoke-compose'],
    ]
    if (process.env.DSH_BROWSER_E2E === '1') {
      steps.push(['node', ['scripts/smoke-client.mjs'], 'smoke-client'])
    }
    for (const [command, args, label] of steps) {
      console.log(`[matrix] ${version}: ${command} ${args.join(' ')}`)
      const logFile = join(evidence, `${version}-${label}.log`)
      let code = await runLogged(command, args, { cwd: dir, env, logFile })
      if (label === 'install' && code === 0) {
        const checked = assertLock(dir, version, metadata)
        if (!frozen && checked.drifting.length > 0) {
          console.log(`[matrix] ${version}: pin transitive DSH packages ${checked.drifting.join(', ')}`)
          pinDrift(dir, checked.drifting, version)
          code = await runLogged(command, args, { cwd: dir, env, logFile: join(evidence, `${version}-install-repin.log`) })
        }
        if (code === 0) {
          const again = assertLock(dir, version, metadata)
          if (again.problems.length > 0) {
            const message = again.problems.join('\n')
            writeFileSync(join(evidence, `${version}-lockfile.txt`), message)
            console.error(`[matrix] ${version}: dependency tree is not coherent\n${message}`)
            code = 1
          }
        }
      }
      result.steps.push({ command: `${command} ${args.join(' ')}`, exitCode: code })
      if (code !== 0) {
        result.passed = false
        failed = true
        console.error(`[matrix] ${version}: failed at ${label}. Install kept at ${dir}`)
        break
      }
    }
    if (result.steps.length === steps.length && result.steps.every(step => step.exitCode === 0)) {
      result.passed = true
      result.directory = undefined
      rmSync(dir, { recursive: true, force: true })
    }
  } catch (error) {
    result.passed = false
    result.error = error.message
    failed = true
    console.error(`[matrix] ${version}: ${error.stack ?? error.message}`)
    console.error(`[matrix] ${version}: install kept at ${dir}`)
  }
  results.push(result)
  writeFileSync(join(evidence, 'results.json'), `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    mode: candidate !== undefined ? 'candidate' : 'supported',
    results,
  }, null, 2)}\n`)
}
console.log(`[matrix] results: ${join(evidence, 'results.json')}`)
if (failed) process.exitCode = 1
