/** Structured pnpm lockfile inspection. Package keys are parsed, not scanned with a package-name regex. */
import { readFileSync } from 'node:fs'
import { parse } from 'yaml'

const PACKAGE_KEY = /^((?:@[^^/]+\/)?[^@/]+)@(\d+\.\d+\.\d+(?:-[\w.]+)?)(?:\(|$)/u
const RESOLVED_VERSION = /^(\d+\.\d+\.\d+(?:-[\w.]+)?)/u

/**
 * @param value - a lockfile version field, possibly with a peer suffix.
 * @returns the resolved version, or undefined when the field is not a version.
 */
export function bareVersion(value) {
  if (typeof value !== 'string') return undefined
  return RESOLVED_VERSION.exec(value)?.[1]
}

/**
 * @param key - a packages or snapshots key.
 * @returns the package name and resolved version.
 */
export function parsePackageKey(key) {
  const match = PACKAGE_KEY.exec(key)
  if (match === null) return undefined
  return { name: match[1], version: match[2] }
}

/**
 * @param lock - a parsed pnpm lockfile document.
 * @returns every resolved package occurrence the document names.
 */
export function collectResolved(lock) {
  /** @type {{ name: string, version: string, where: string }[]} */
  const found = []
  const consider = (name, value, where) => {
    if (typeof name !== 'string') return
    const version = bareVersion(value)
    if (version === undefined) return
    found.push({ name, version, where })
  }
  for (const [importer, data] of Object.entries(lock?.importers ?? {})) {
    if (data === null || typeof data !== 'object') continue
    for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
      for (const [name, spec] of Object.entries(data[section] ?? {})) {
        if (spec !== null && typeof spec === 'object') consider(name, spec.version, `${importer} ${section}`)
      }
    }
  }
  for (const section of ['packages', 'snapshots']) {
    for (const [key, value] of Object.entries(lock?.[section] ?? {})) {
      const parsed = parsePackageKey(key)
      if (parsed !== undefined) found.push({ ...parsed, where: `${section} ${key}` })
      if (value !== null && typeof value === 'object' && value.dependencies !== undefined) {
        for (const [name, version] of Object.entries(value.dependencies)) {
          consider(name, version, `${section} dependency of ${key}`)
        }
      }
    }
  }
  return found
}

/**
 * @param file - path to pnpm-lock.yaml.
 * @returns the parsed document and its resolved rows.
 */
export function readLockfile(file) {
  const lock = parse(readFileSync(file, 'utf8'))
  if (lock === null || typeof lock !== 'object' || Array.isArray(lock)) {
    throw new Error(`${file} is not a lockfile document`)
  }
  return { lock, resolved: collectResolved(lock) }
}

/**
 * @param resolved - rows from {@link collectResolved}.
 * @param name - exact package name.
 * @returns the distinct versions found.
 */
export function versionsOf(resolved, name) {
  return [...new Set(resolved.filter(row => row.name === name).map(row => row.version))].sort()
}
