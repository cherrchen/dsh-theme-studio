/** Classify Theme Studio token overrides against one installed ThemeRuntime bundle. */

export const FROZEN_STATIC_TOKENS = [
  '--dsw-static-neutral-00',
  '--dsw-static-neutral-bluish-00',
]

/**
 * @param bundleSource - text of the installed theme client bundle.
 * @param overridden - token names this plugin writes.
 * @param required - token names that must both exist upstream and be overridden.
 * @returns a report. Extra tokens are recorded and are not failures.
 */
export function auditTokens(bundleSource, overridden, required = []) {
  const used = [...bundleSource.matchAll(/--(?:dsw|shiki)-[a-z0-9-]+/gu)].map(match => match[0])
  const usedSet = new Set(used)
  const overriddenSet = new Set(overridden)
  const failures = []
  const extra = []
  const covered = []
  for (const name of overriddenSet) {
    if (FROZEN_STATIC_TOKENS.includes(name)) {
      failures.push(`${name} is fixed white upstream and must not be overridden`)
    } else if (!usedSet.has(name)) extra.push(name)
    else covered.push(name)
  }
  for (const name of required) {
    if (!usedSet.has(name)) failures.push(`${name} is not referenced by the installed ThemeRuntime bundle`)
    if (!overriddenSet.has(name)) failures.push(`${name} is not covered by the builtin presets`)
  }
  const notes = []
  for (const name of FROZEN_STATIC_TOKENS) {
    if (!usedSet.has(name)) notes.push(`${name} is not referenced by this ThemeRuntime bundle`)
    if (overriddenSet.has(name)) notes.push(`${name} is present in the override set`)
  }
  const retained = [...usedSet]
    .filter(name => name.startsWith('--dsw-') && !overriddenSet.has(name) && !FROZEN_STATIC_TOKENS.includes(name))
    .sort()
  return {
    ok: failures.length === 0,
    failures,
    extra: extra.sort(),
    covered: covered.sort(),
    retained,
    notes,
  }
}
