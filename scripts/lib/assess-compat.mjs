/**
 * Static half of the compatibility contract. It reads source, manifests, the
 * lockfile, and the installed tree. It does not query the registry.
 */
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import { readContract } from './contract.mjs'
import { readLockfile, versionsOf } from './lockfile.mjs'
import { isDshPackage } from './repoint.mjs'
import { rangeAdmits } from './range.mjs'
import { isExactVersion } from './exact-pin.mjs'
import { readInstalledVersion } from './installed.mjs'

const RECOVERY = [
  'Align devDependencies, the DSH peer list, pnpm overrides, the lockfile, and the installed modules on one release.',
  'A mixed or incomplete tree is not a passing installation.',
  'A candidate probe edits an isolated copy and does not add the release to SUPPORTED_DSH_RELEASES.',
].join(' ')

/**
 * Versions named in one README section.
 * @param markdown - README text.
 * @param heading - heading including the hashes.
 * @returns version strings in appearance order.
 */
export function readmeVersions(markdown, heading) {
  const start = markdown.indexOf(heading)
  if (start < 0) throw new Error(`missing heading ${heading}`)
  const rest = markdown.slice(start + heading.length)
  const next = rest.search(/\n## /u)
  const section = next < 0 ? rest : rest.slice(0, next)
  return [...section.matchAll(/\d+\.\d+\.\d+(?:-[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)*)?/gu)].map(token => token[0])
}

/**
 * @param root - repository root.
 * @param options - `candidate` is an explicit probe release, not a support claim.
 * @returns a diagnosis the CLI can print before build.
 */
export function assessRepository(root, options = {}) {
  const candidate = options.candidate ?? process.env.DSH_THEME_STUDIO_CANDIDATE
  const failures = []
  const notes = []
  const fail = (code, message) => { failures.push({ code, message }) }
  const contract = readContract(root)
  const { supported, required, optional, core } = contract
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  const peers = manifest.peerDependencies ?? {}
  const devs = manifest.devDependencies ?? {}
  const dependencies = manifest.dependencies ?? {}
  const workspace = parse(readFileSync(join(root, 'pnpm-workspace.yaml'), 'utf8'))
  const overrides = workspace?.overrides ?? {}
  const ageExclude = new Set(workspace?.minimumReleaseAgeExclude ?? [])
  const require = createRequire(join(root, 'package.json'))

  notes.push(`allowlist: ${supported.join(', ')}`)
  if (candidate !== undefined && candidate !== '') {
    if (!isExactVersion(candidate)) {
      fail('candidate', `${candidate} is not an exact candidate version`)
    } else if (supported.includes(candidate)) {
      fail('candidate', `${candidate} is already supported; the candidate flag must not be set for it`)
    } else {
      notes.push(`candidate probe: ${candidate} (not a supported release)`)
    }
  }

  const expectedPeers = candidate !== undefined && candidate !== '' && !supported.includes(candidate)
    ? [...supported, candidate].join(' || ')
    : supported.join(' || ')
  for (const [name, range] of Object.entries(peers)) {
    if (!isDshPackage(name)) continue
    if (range !== expectedPeers) fail('peers', `peerDependencies["${name}"] is "${range}" but the contract expects "${expectedPeers}"`)
  }
  for (const name of core) {
    if (!(name in peers)) fail('peers', `${name} is inspected by the contract but is not a peerDependency`)
  }
  for (const name of required) {
    if (optional.includes(name)) fail('contract', `${name} is listed as both required and optional`)
  }

  const pinned = new Set()
  for (const [name, version] of Object.entries(devs)) {
    if (!isDshPackage(name)) continue
    pinned.add(version)
  }
  let pin
  if (pinned.size !== 1) {
    fail('pin', `devDependencies pin ${pinned.size === 0 ? 'no' : [...pinned].sort().join(', ')} DSH release(s); pin exactly one`)
  } else {
    pin = [...pinned][0]
    if (candidate !== undefined && candidate !== '' && !supported.includes(candidate)) {
      if (pin !== candidate) fail('candidate', `development pin is ${pin} but the candidate probe is ${candidate}`)
    } else if (!supported.includes(pin)) {
      fail('pin', `devDependencies pin ${pin}, which is not on the allowlist`)
    }
    notes.push(`development pin: ${pin}`)
  }

  if (pin !== undefined) {
    for (const [name, version] of Object.entries(overrides)) {
      if (!ageExclude.has(`${name}@${version}`)) fail('age', `minimumReleaseAgeExclude is missing ${name}@${version}`)
      if (isDshPackage(name) && version !== pin) {
        fail('overrides', `pnpm override ${name} is ${version} but the development pin is ${pin}`)
      }
    }
    for (const [name, version] of Object.entries(devs)) {
      if (!isDshPackage(name) && name !== '@deepseek-ai/cordis') continue
      if (overrides[name] !== version) fail('overrides', `pnpm override for ${name} does not match devDependencies (${version})`)
      if (!ageExclude.has(`${name}@${version}`)) fail('age', `minimumReleaseAgeExclude is missing ${name}@${version}`)
    }
    const cordis = devs['@deepseek-ai/cordis']
    if (typeof peers['@deepseek-ai/cordis'] === 'string' && typeof cordis === 'string' && !rangeAdmits(peers['@deepseek-ai/cordis'], cordis)) {
      fail('cordis', `Cordis peer ${peers['@deepseek-ai/cordis']} does not admit the development pin ${cordis}`)
    }
    const schemaOverride = overrides['@deepseek-ai/schemastery']
    const schemaRange = dependencies['@deepseek-ai/schemastery']
    if (typeof schemaRange === 'string' && typeof schemaOverride === 'string' && !rangeAdmits(schemaRange, schemaOverride)) {
      fail('schemastery', `Schemastery dependency ${schemaRange} does not admit override ${schemaOverride}`)
    }
    if (typeof schemaOverride === 'string' && !ageExclude.has(`@deepseek-ai/schemastery@${schemaOverride}`)) {
      fail('age', `minimumReleaseAgeExclude is missing @deepseek-ai/schemastery@${schemaOverride}`)
    }
  }

  /** @type {Map<string, string | undefined>} */
  const installed = new Map()
  for (const name of [...core, '@deepseek-ai/cordis', '@deepseek-ai/schemastery']) {
    try {
      installed.set(name, readInstalledVersion(require, name))
    } catch (error) {
      fail('resolution', `${name} is present but cannot be inspected: ${error.message}`)
      installed.set(name, undefined)
    }
  }
  for (const name of required) {
    if (installed.get(name) === undefined) fail('incomplete', `${name} is required but not installed (run pnpm install)`)
  }
  const installedReleases = [...new Set([...core].map(name => installed.get(name)).filter(version => version !== undefined))]
  if (installedReleases.length > 1) {
    fail('mixed', `the installed tree mixes DSH releases: ${installedReleases.sort().join(', ')}`)
    for (const name of core) notes.push(`resolved ${name} ${installed.get(name) ?? '(not installed)'}`)
  } else if (installedReleases.length === 1) {
    const [release] = installedReleases
    if (pin !== undefined && release !== pin) fail('mixed', `installed DSH ${release} does not match development pin ${pin}`)
    else if (candidate !== undefined && candidate !== '' && !supported.includes(candidate)) {
      notes.push(`installed candidate tree: ${release}`)
    } else if (!supported.includes(release)) fail('unsupported', `the installed tree is DSH ${release}, which is not on the allowlist`)
    else notes.push(`installed tree: ${release}`)
  }
  if (pin !== undefined) {
    for (const [name, version] of Object.entries(devs)) {
      if (!isDshPackage(name) && name !== '@deepseek-ai/cordis') continue
      let actual
      try {
        actual = require(`${name}/package.json`).version
      } catch {
        actual = undefined
      }
      if (actual === undefined) fail('incomplete', `${name} cannot be resolved from the installed tree`)
      else if (actual !== version) fail('resolution', `${name} resolves to ${actual} but is pinned to ${version}`)
    }
    const schema = installed.get('@deepseek-ai/schemastery')
    const schemaOverride = overrides['@deepseek-ai/schemastery']
    if (schema === undefined) fail('incomplete', '@deepseek-ai/schemastery cannot be resolved from the installed tree')
    else if (schemaOverride !== undefined && schema !== schemaOverride) {
      fail('resolution', `@deepseek-ai/schemastery resolves to ${schema} but the override is ${schemaOverride}`)
    }
  }

  try {
    const { resolved } = readLockfile(join(root, 'pnpm-lock.yaml'))
    const lockedDsh = [...new Set(resolved.filter(row => isDshPackage(row.name)).map(row => row.version))].sort()
    if (lockedDsh.length > 1) fail('mixed', `pnpm-lock.yaml mixes DSH releases: ${lockedDsh.join(', ')}`)
    else if (pin !== undefined && lockedDsh.length === 1 && lockedDsh[0] !== pin) {
      fail('lockfile', `pnpm-lock.yaml resolved DSH ${lockedDsh[0]} but devDependencies pin ${pin}`)
    }
    for (const name of ['@deepseek-ai/cordis', '@deepseek-ai/schemastery']) {
      const versions = versionsOf(resolved, name)
      const expected = name === '@deepseek-ai/cordis' ? devs['@deepseek-ai/cordis'] : overrides['@deepseek-ai/schemastery']
      if (versions.length === 0) fail('lockfile', `pnpm-lock.yaml does not resolve ${name}`)
      else if (versions.length > 1) fail('mixed', `pnpm-lock.yaml mixes ${name}: ${versions.join(', ')}`)
      else if (expected !== undefined && versions[0] !== expected) {
        fail('lockfile', `pnpm-lock.yaml resolves ${name} ${versions[0]} but the pin is ${expected}`)
      }
    }
    if (pin !== undefined) {
      for (const [name, version] of Object.entries(overrides)) {
        if (!name.startsWith('@deepseek-ai/')) continue
        const versions = versionsOf(resolved, name)
        if (versions.length > 1) fail('mixed', `pnpm-lock.yaml mixes ${name}: ${versions.join(', ')}`)
        else if (versions.length === 1 && versions[0] !== version) {
          fail('lockfile', `pnpm-lock.yaml resolves ${name} ${versions[0]} but the override is ${version}`)
        }
      }
    }
  } catch (error) {
    fail('lockfile', `could not parse pnpm-lock.yaml: ${error.message}`)
  }

  {
    // Candidate admission never changes the public support statement.
    for (const [file, heading] of [['README.md', '## DSH 兼容性'], ['README.en.md', '## DSH compatibility']]) {
      try {
        const versions = readmeVersions(readFileSync(join(root, file), 'utf8'), heading)
        const unique = [...new Set(versions)]
        if (unique.join('\n') !== supported.join('\n') || versions.length !== supported.length) {
          fail('readme', `${file} compatibility section lists ${unique.join(', ') || '(none)'} but the allowlist is ${supported.join(', ')}`)
        }
      } catch (error) {
        fail('readme', `${file}: ${error.message}`)
      }
    }
  }

  const diagnosis = failures.some(failure => failure.code === 'incomplete') ? 'incomplete installation'
    : failures.some(failure => failure.code === 'mixed') ? 'mixed installation'
      : failures.some(failure => failure.code === 'unsupported') ? 'unsupported release'
        : failures.some(failure => failure.code === 'candidate') ? 'candidate probe is inconsistent'
          : failures.length > 0 ? 'declaration drift'
            : candidate !== undefined && candidate !== '' && !supported.includes(candidate) ? 'candidate probe consistent'
              : 'consistent'
  return { ok: failures.length === 0, diagnosis, failures, notes, recovery: RECOVERY, pin }
}
