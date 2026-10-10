/**
 * Enough semver to decide whether one named version satisfies every
 * declaration. This is not a general solver: an unnamed newer release that
 * also sits in the intersection is never selected.
 */
import { exactPin, isExactVersion } from './exact-pin.mjs'
import { satisfies } from 'semver'

/** Apply standard SemVer rules, including the narrower caret range below 1.0. */
export function comparatorAdmits(part, version) {
  return satisfies(version, part)
}

/**
 * @param range - a range of `||` alternatives.
 * @param version - an exact version.
 * @returns true when any alternative admits the version.
 */
export function rangeAdmits(range, version) {
  if (typeof range !== 'string' || !isExactVersion(version)) return false
  return range.split('||').some(part => comparatorAdmits(part.trim(), version))
}

/**
 * Keep `range` when it already admits `version`; otherwise append the exact version.
 * @param range - the current manifest range.
 * @param version - the pin that must be installable.
 * @returns the range to write.
 */
export function admitRange(range, version) {
  if (typeof range !== 'string' || range.length === 0) return version
  if (rangeAdmits(range, version)) return range
  return `${range} || ${version}`
}

/**
 * Choose the one named version that satisfies every declaration.
 * @param declarations - `{ name, range, from }` rows.
 * @returns a map of package name to exact pin.
 */
export function unifyPins(declarations) {
  /** @type {Map<string, { name: string, range: string, from: string, pin: string }[]>} */
  const grouped = new Map()
  for (const declaration of declarations) {
    if (!declaration.name.startsWith('@deepseek-ai/')) continue
    const pin = exactPin(declaration.range, `${declaration.name} required by ${declaration.from}`)
    const rows = grouped.get(declaration.name) ?? []
    rows.push({ ...declaration, pin })
    grouped.set(declaration.name, rows)
  }
  /** @type {Record<string, string>} */
  const resolved = {}
  for (const [name, rows] of grouped) {
    const named = [...new Set(rows.map(row => row.pin))]
    const satisfying = named.filter(version => rows.every(row => rangeAdmits(row.range, version)))
    if (satisfying.length !== 1) {
      const described = rows.map(row => `${row.from} declares ${row.range}`).join('; ')
      throw new Error(
        `Cannot determine one pin for ${name}. ${described}. `
        + `Named versions that satisfy every range: ${satisfying.join(', ') || 'none'}.`,
      )
    }
    resolved[name] = satisfying[0]
  }
  return resolved
}
