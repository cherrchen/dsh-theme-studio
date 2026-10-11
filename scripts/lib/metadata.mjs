/**
 * Vendor pins come from the published dependency declarations of the release
 * under test. A range that does not name exactly one satisfying version fails
 * the probe instead of being rounded to a nearby release.
 */
import { npmOutput, npmOutputBatch } from './npm-cli.mjs'
import { isExactVersion } from './exact-pin.mjs'
import { unifyPins } from './range.mjs'

const HOPS = 8
const viewCache = new Map()

/**
 * Split an `npm view` document into dependency maps.
 * npm wraps multiple requested fields, and returns the field value itself
 * when only one of them exists.
 * @param parsed - JSON from npm.
 * @returns dependency and peer maps.
 */
export function splitView(parsed) {
  if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
    && ('dependencies' in parsed || 'peerDependencies' in parsed)) {
    return {
      dependencies: parsed.dependencies ?? {},
      peerDependencies: parsed.peerDependencies ?? {},
    }
  }
  if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return { dependencies: parsed, peerDependencies: {} }
  }
  return { dependencies: {}, peerDependencies: {} }
}

/**
 * @param version - exact DSH release.
 * @param packageNames - direct `@deepseek-ai/dsh*` packages to inspect at that release.
 * @param output - npm stdout function, injectable in tests.
 * @returns cordis, schemastery, and every other unified `@deepseek-ai/*` pin.
 */
export function describeRelease(version, packageNames, output = npmOutput) {
  if (!isExactVersion(version)) throw new Error(`${JSON.stringify(version)} is not an exact version`)
  const names = [...new Set(packageNames)].sort()
  if (!names.includes('@deepseek-ai/dsh-settings')) {
    throw new Error('metadata probe requires @deepseek-ai/dsh-settings in the direct DSH dependencies')
  }
  if (!names.includes('@deepseek-ai/dsh-client-ui-theme')) {
    throw new Error('metadata probe requires @deepseek-ai/dsh-client-ui-theme in the direct DSH dependencies')
  }
  const cache = output === npmOutput ? viewCache : new Map()
  const view = (name, pinned) => {
    const key = `${name}@${pinned}`
    if (cache.has(key)) return cache.get(key)
    let parsed
    try {
      const raw = output(['view', key, 'dependencies', 'peerDependencies', '--json'])
      parsed = raw.trim() === '' ? {} : JSON.parse(raw)
    } catch (error) {
      throw new Error(`Cannot read npm metadata for ${key}. ${error.message}`)
    }
    const maps = splitView(parsed)
    cache.set(key, maps)
    return maps
  }

  /** @type {{ name: string, range: string, from: string }[]} */
  const declarations = []
  const seen = new Set()
  let frontier = names.map(name => ({ name, version }))
  for (let hop = 0; hop < HOPS && frontier.length > 0; hop += 1) {
    const next = []
    if (output === npmOutput) {
      const pending = frontier.filter(item => !cache.has(`${item.name}@${item.version}`))
      const documents = npmOutputBatch(pending.map(item => ['view', `${item.name}@${item.version}`, 'dependencies', 'peerDependencies', '--json']))
      pending.forEach((item, index) => {
        const raw = documents[index]
        cache.set(`${item.name}@${item.version}`, splitView(raw.trim() === '' ? {} : JSON.parse(raw)))
      })
    }
    for (const item of frontier) {
      const key = `${item.name}@${item.version}`
      if (seen.has(key)) continue
      seen.add(key)
      const maps = view(item.name, item.version)
      for (const field of ['dependencies', 'peerDependencies']) {
        for (const [name, range] of Object.entries(maps[field] ?? {})) {
          if (!name.startsWith('@deepseek-ai/')) continue
          declarations.push({ name, range, from: `${key} ${field}` })
        }
      }
    }
    const pins = unifyPins(declarations)
    for (const [name, pin] of Object.entries(pins)) {
      if (name.startsWith('@deepseek-ai/dsh') && pin !== version) {
        throw new Error(`${name} metadata names ${pin}, which is not DSH ${version}`)
      }
      if (!seen.has(`${name}@${pin}`)) next.push({ name, version: pin })
    }
    frontier = next
    if (hop === HOPS - 1 && frontier.length > 0) {
      throw new Error(`Dependency metadata did not stabilize. Still unresolved: ${frontier.map(item => `${item.name}@${item.version}`).join(', ')}`)
    }
  }
  const pins = unifyPins(declarations)
  for (const [name, pin] of Object.entries(pins)) {
    if (name.startsWith('@deepseek-ai/dsh') && pin !== version) {
      throw new Error(`${name} metadata names ${pin}, which is not DSH ${version}`)
    }
  }
  const cordis = pins['@deepseek-ai/cordis']
  const schemastery = pins['@deepseek-ai/schemastery']
  if (cordis === undefined || schemastery === undefined) {
    throw new Error(`DSH ${version} metadata did not declare both Cordis and Schemastery`)
  }
  return { version, cordis, schemastery, pins }
}

/** Newest published pre-release of the `@deepseek-ai/dsh` CLI, in publish order. */
export function latestPrerelease(output = npmOutput) {
  const versions = JSON.parse(output(['view', '@deepseek-ai/dsh', 'versions', '--json']))
  if (!Array.isArray(versions)) throw new Error('npm view @deepseek-ai/dsh versions did not return an array')
  const newest = versions.filter(version => typeof version === 'string' && version.includes('-')).at(-1)
  if (newest === undefined) throw new Error('@deepseek-ai/dsh has published no pre-release')
  if (!isExactVersion(newest)) throw new Error(`Newest pre-release ${JSON.stringify(newest)} is not an exact version`)
  return newest
}
