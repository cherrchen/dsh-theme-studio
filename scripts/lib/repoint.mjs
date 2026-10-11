/** Repoint one checkout's DSH pin without editing the support allowlist. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { readContract } from './contract.mjs'
import { describeRelease } from './metadata.mjs'
import { admitRange } from './range.mjs'

const HEADER = `# Upstream packages depend on ^ ranges, which otherwise float to a newer
# pre-release than the one this repository is verifying.
`

/**
 * @param name - package name.
 * @returns whether it is a DeepSeek Harness package.
 */
export function isDshPackage(name) {
  return name === '@deepseek-ai/dsh' || name.startsWith('@deepseek-ai/dsh-')
}

/**
 * @param pins - unified pins.
 * @returns override entries in a stable order.
 */
export function orderedPins(pins) {
  const preferred = [
    '@deepseek-ai/cordis',
    '@deepseek-ai/schemastery',
    '@deepseek-ai/cosmokit',
  ]
  const names = Object.keys(pins).sort((left, right) => {
    const leftRank = preferred.indexOf(left)
    const rightRank = preferred.indexOf(right)
    if (leftRank !== -1 || rightRank !== -1) {
      if (leftRank === -1) return 1
      if (rightRank === -1) return -1
      return leftRank - rightRank
    }
    return left.localeCompare(right)
  })
  return names.map(name => [name, pins[name]])
}

/**
 * @param pins - package name to exact version.
 * @returns pnpm-workspace.yaml text.
 */
export function renderWorkspace(pins) {
  const lines = [HEADER.trimEnd(), '', 'overrides:']
  for (const [name, version] of orderedPins(pins)) lines.push(`  '${name}': ${version}`)
  lines.push('', 'minimumReleaseAgeExclude:')
  for (const [name, version] of orderedPins(pins)) lines.push(`  - '${name}@${version}'`)
  lines.push('')
  return lines.join('\n')
}

/**
 * Widen peer and dependency ranges in memory so a candidate can be installed.
 * The allowlist in source is not modified.
 * @param manifest - parsed package.json.
 * @param version - candidate release.
 * @param metadata - {@link describeRelease} result.
 * @param supported - current allowlist.
 */
export function admitCandidate(manifest, version, metadata, supported) {
  const peers = [...supported, version].join(' || ')
  for (const name of Object.keys(manifest.peerDependencies ?? {})) {
    if (isDshPackage(name)) manifest.peerDependencies[name] = peers
  }
  const cordis = manifest.peerDependencies?.['@deepseek-ai/cordis']
  if (typeof cordis === 'string') {
    manifest.peerDependencies['@deepseek-ai/cordis'] = admitRange(cordis, metadata.cordis)
  }
  const schema = manifest.dependencies?.['@deepseek-ai/schemastery']
  if (typeof schema === 'string') {
    manifest.dependencies['@deepseek-ai/schemastery'] = admitRange(schema, metadata.schemastery)
  }
}

/**
 * Rewrite devDependencies and workspace overrides for one exact release.
 * @param root - checkout to edit.
 * @param version - exact DSH release.
 * @param options - `admitCandidate` widens peers in this checkout only.
 * @returns the metadata the pins came from, and the devDependency edits.
 */
export function repointInstallation(root, version, options = {}) {
  if (options.admitCandidate === true && existsSync(join(root, '.git')) && process.env.GITHUB_ACTIONS !== 'true') {
    throw new Error('Candidate peer admission requires an isolated copy without .git or a throwaway GitHub Actions checkout. Use run-dsh-matrix.mjs --candidate.')
  }
  const manifestPath = join(root, 'package.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const direct = Object.keys(manifest.devDependencies ?? {}).filter(isDshPackage)
  const metadata = describeRelease(version, direct, options.npmOutput)
  const changed = []
  for (const name of direct) {
    if (manifest.devDependencies[name] === version) continue
    changed.push(`${name}: ${manifest.devDependencies[name]} → ${version}`)
    manifest.devDependencies[name] = version
  }
  const cordisName = '@deepseek-ai/cordis'
  if (manifest.devDependencies?.[cordisName] !== metadata.cordis) {
    changed.push(`${cordisName}: ${manifest.devDependencies?.[cordisName]} → ${metadata.cordis}`)
    manifest.devDependencies[cordisName] = metadata.cordis
  }
  const pins = { ...metadata.pins }
  for (const name of direct) {
    if (pins[name] !== undefined && pins[name] !== version) {
      throw new Error(`${name} metadata names ${pins[name]}, which is not DSH ${version}`)
    }
    pins[name] = version
  }
  const written = { ...metadata, pins }
  if (options.admitCandidate === true) {
    admitCandidate(manifest, version, written, readContract(root).supported)
    changed.push(`peer admission widened for candidate ${version}`)
  }
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  writeFileSync(join(root, 'pnpm-workspace.yaml'), renderWorkspace(pins))
  return { metadata: written, changed }
}
