/** Verify each exact release in an isolated registry installation; leave the checkout untouched. */
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = fileURLToPath(new URL('../', import.meta.url))
const source = readFileSync(join(root, 'src/compat/dsh-version.ts'), 'utf8')
const releases = [...source.match(/export const SUPPORTED_DSH_RELEASES = \[([^\]]*)\]/u)[1].matchAll(/'([^']+)'/gu)].map(match => match[1])
/** Cordis and Schemastery versions published with each exact DSH release. */
const VENDORS = {
  '0.1.5-rc.2': ['4.0.2', '3.18.2'],
  '0.1.5-rc.3': ['4.0.2', '3.18.2'],
  '0.1.6-alpha.1': ['4.0.2', '3.18.2'],
  '0.1.6-alpha.2': ['4.0.2', '3.18.2'],
  '0.1.7-alpha.1': ['4.0.3', '3.18.3'],
  '0.1.7-alpha.2': ['4.0.4', '3.18.4'],
  '0.1.7-rc.1': ['4.0.4', '3.18.4'],
  '0.1.7-rc.2': ['4.0.4', '3.18.4'],
  '0.2.0-rc.1': ['4.0.4', '3.18.4'],
  '0.2.0-rc.2': ['4.0.4', '3.18.4'],
  '0.2.1-alpha.1': ['4.0.5-alpha.1', '3.18.5-alpha.1'],
  '0.2.1-alpha.2': ['4.0.5-alpha.1', '3.18.5-alpha.1'],
}
const requested = process.argv.slice(2)
const selected = requested.length ? requested : releases
for (const version of selected) {
  if (!releases.includes(version)) throw new Error(`Release is outside the support contract: ${version}`)
  if (VENDORS[version] === undefined) throw new Error(`No Cordis/Schemastery pin recorded for ${version}`)
}

const RUNTIME_PACKAGES = [
  '@deepseek-ai/cordis-plugin-group',
  '@deepseek-ai/cordis-plugin-include',
  '@deepseek-ai/cordis-plugin-loader',
  '@deepseek-ai/cosmokit',
]

/** Cordis 4.0.5-alpha.1 rejects the previous stable plugin/cosmokit releases. */
const ALPHA_RUNTIME = {
  '@deepseek-ai/cordis-plugin-group': '1.0.5-alpha.1',
  '@deepseek-ai/cordis-plugin-include': '1.0.10-alpha.1',
  '@deepseek-ai/cordis-plugin-loader': '1.0.6-alpha.1',
  '@deepseek-ai/cosmokit': '1.8.6-alpha.1',
}

function rewriteWorkspace(text, version, cordis, schema) {
  let next = text
    .replace(/(@deepseek-ai\/dsh[\w-]*(?:'?: |@))\d+\.\d+\.\d+(?:-[A-Za-z0-9.]+)?/gu, `$1${version}`)
    .replace(/('@deepseek-ai\/cordis':\s*)\S+/gu, `$1${cordis}`)
    .replace(/('@deepseek-ai\/schemastery':\s*)\S+/gu, `$1${schema}`)
    .replace(/@deepseek-ai\/cordis@[^'\s]+/gu, `@deepseek-ai/cordis@${cordis}`)
    .replace(/@deepseek-ai\/schemastery@[^'\s]+/gu, `@deepseek-ai/schemastery@${schema}`)
  if (cordis !== '4.0.5-alpha.1') {
    for (const name of RUNTIME_PACKAGES) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
      next = next.replace(new RegExp(String.raw`\n  '${escaped}':\s*\S+`, 'gu'), '')
      next = next.replace(new RegExp(String.raw`\n  - '${escaped}@\S+'`, 'gu'), '')
    }
    return next
  }
  for (const [name, pin] of Object.entries(ALPHA_RUNTIME)) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
    if (next.includes(`'${name}':`)) {
      next = next.replace(new RegExp(`('${escaped}':\\s*)\\S+`, 'gu'), `$1${pin}`)
    } else {
      next = next.replace('overrides:\n', `overrides:\n  '${name}': ${pin}\n`)
    }
    if (!next.includes(`'${name}@${pin}'`)) {
      next = next.replace('minimumReleaseAgeExclude:\n', `minimumReleaseAgeExclude:\n  - '${name}@${pin}'\n`)
    }
  }
  return next
}
const results = []
const scratch = mkdtempSync(join(tmpdir(), 'theme-studio-matrix-'))
console.log(`[matrix] evidence: ${scratch}`)
try {
  for (const version of selected) {
    const dir = join(scratch, version)
    cpSync(root, dir, { recursive: true, filter: path => !['node_modules', '.git', '.cursor', 'lib', '.pnpm-store'].includes(path.split('/').filter(Boolean).at(-1)) })
    const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    for (const name of Object.keys(manifest.devDependencies)) {
      if (name.startsWith('@deepseek-ai/dsh')) manifest.devDependencies[name] = version
    }
    const [cordis, schema] = VENDORS[version]
    manifest.devDependencies['@deepseek-ai/cordis'] = cordis
    writeFileSync(join(dir, 'package.json'), JSON.stringify(manifest, null, 2) + '\n')
    const workspace = rewriteWorkspace(readFileSync(join(dir, 'pnpm-workspace.yaml'), 'utf8'), version, cordis, schema)
    writeFileSync(join(dir, 'pnpm-workspace.yaml'), workspace)
    // Resolve each release from scratch rather than verifying the development lockfile
    // against exclusions for a different release.
    rmSync(join(dir, 'pnpm-lock.yaml'), { force: true })
    const steps = [
      ['install', '--ignore-scripts', '--no-frozen-lockfile'],
      ['compat:check'], ['typecheck'], ['test'], ['build'], ['pack', '--dry-run'],
    ]
    const result = { version, steps: [], passed: true }
    for (const args of steps) {
      console.log(`[matrix] ${version}: pnpm ${args.join(' ')}`)
      const run = spawnSync('pnpm', args, { cwd: dir, encoding: 'utf8', env: { ...process.env, CI: 'true' } })
      let log = `${run.stdout ?? ''}${run.stderr ?? ''}${run.error ?? ''}`
      if (args[0] === 'install' && run.status === 0) {
        for (let attempt = 0; attempt < 5; attempt++) {
          const lock = readFileSync(join(dir, 'pnpm-lock.yaml'), 'utf8')
          const drifting = [...new Set([...lock.matchAll(/(@deepseek-ai\/dsh(?:-[\w-]+)?)@(\d+\.\d+\.\d+(?:-[A-Za-z0-9.]+)?)/gu)].filter(match => match[2] !== version).map(match => match[1]))]
          if (!drifting.length) break
          console.log(`[matrix] ${version}: pin transitive peers ${drifting.join(', ')}`)
          const configFile = join(dir, 'pnpm-workspace.yaml')
          let config = readFileSync(configFile, 'utf8')
          config = config.replace('overrides:\n', `overrides:\n${drifting.map(name => `  '${name}': ${version}`).join('\n')}\n`)
          config += drifting.map(name => `  - '${name}@${version}'\n`).join('')
          writeFileSync(configFile, config)
          const normalized = spawnSync('pnpm', args, { cwd: dir, encoding: 'utf8', env: { ...process.env, CI: 'true' } })
          log += `${normalized.stdout ?? ''}${normalized.stderr ?? ''}${normalized.error ?? ''}`
          run.status = normalized.status
          if (run.status !== 0) break
        }
      }
      writeFileSync(join(scratch, `${version}-${args[0].replace(':', '-')}.log`), log)
      result.steps.push({ command: `pnpm ${args.join(' ')}`, exitCode: run.status })
      if (run.status !== 0) {
        console.error(log.slice(-12000))
        result.passed = false
        break
      }
    }
    results.push(result)
    writeFileSync(join(scratch, 'results.json'), JSON.stringify(results, null, 2) + '\n')
    // Logs survive for inspection; remove the large isolated installation.
    if (result.passed) rmSync(dir, { recursive: true, force: true })
  }
} finally {
  console.log(`[matrix] results: ${join(scratch, 'results.json')}`)
}
if (results.some(result => !result.passed)) process.exitCode = 1
