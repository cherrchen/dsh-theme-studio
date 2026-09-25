/**
 * Exact DSH releases this plugin has been typechecked, tested, and built
 * against. This module is the only support list. Peer ranges, the development
 * pin, and the README compatibility sections are checked against it.
 *
 * The published plugin does not probe the install. `scripts/check-dsh-compat.mjs`
 * reads this allowlist and the installed tree. A mismatched install does not
 * widen file, command, or network authority, so the plugin still starts.
 */

/** Releases verified for this plugin, as exact version strings. */
export const SUPPORTED_DSH_RELEASES = [
  '0.1.5-rc.2',
  '0.1.5-rc.3',
  '0.1.6-alpha.1',
  '0.1.6-alpha.2',
  '0.1.7-alpha.1',
  '0.1.7-alpha.2',
] as const

/** One release this plugin claims to support. */
export type SupportedDshRelease = typeof SUPPORTED_DSH_RELEASES[number]

/**
 * Packages the host half needs. Absence means the settings namespace cannot
 * be registered against the upstream schema this plugin was verified with.
 */
export const REQUIRED_CORE_PACKAGES = [
  '@deepseek-ai/dsh-settings',
] as const

/**
 * Packages a full client composition provides. A headless host may omit them.
 * An installed copy whose version disagrees with the required packages is mixed.
 */
export const OPTIONAL_CORE_PACKAGES = [
  '@deepseek-ai/dsh-api-remotes',
  '@deepseek-ai/dsh-client-connection',
  '@deepseek-ai/dsh-client-locale',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-renderer',
  '@deepseek-ai/dsh-client-ui-settings',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-theme',
] as const

/** Every package the contract inspects, required first. */
export const CORE_PACKAGES = [...REQUIRED_CORE_PACKAGES, ...OPTIONAL_CORE_PACKAGES] as const

/** Why an installation was accepted or rejected. */
export type CompatVerdict = 'supported' | 'incomplete' | 'mixed' | 'unsupported'

/** One inspected package and the version actually resolved for it. */
export interface InspectedPackage {
  /** The package specifier. */
  readonly name: string
  /** The resolved version, or `undefined` when the package is not installed. */
  readonly version: string | undefined
  /** Whether absence alone is a failure. */
  readonly required: boolean
}

/** The judgement passed on one installation. */
export interface CompatReport {
  /** The verdict. */
  readonly verdict: CompatVerdict
  /** The single release every inspected package agreed on, when they did. */
  readonly release: string | undefined
  /** Every inspected package, in {@link CORE_PACKAGES} order. */
  readonly packages: readonly InspectedPackage[]
  /** Operator-facing explanation. */
  readonly message: string
}

/** Reads the installed version of one package, or `undefined` when absent. */
export type VersionReader = (packageName: string) => string | undefined

/**
 * Judge one installation against the allowlist.
 *
 * Missing required packages are reported before mixed versions, and mixed
 * versions before an allowlist miss: a later check has no single release to
 * name once an earlier check has failed.
 * @param readVersion - version reader supplied by the caller. This module does
 * not resolve packages itself.
 * @returns the report; never throws.
 */
export function classifyInstallation(readVersion: VersionReader): CompatReport {
  const packages: InspectedPackage[] = CORE_PACKAGES.map(name => ({
    name,
    version: readVersion(name),
    required: (REQUIRED_CORE_PACKAGES as readonly string[]).includes(name),
  }))

  const missing = packages.filter(entry => entry.required && entry.version === undefined)
  if (missing.length > 0) {
    return report('incomplete', undefined, packages, [
      'theme-studio: required DSH packages are not installed.',
      ...missing.map(entry => `  missing: ${entry.name}`),
      `  supported: ${SUPPORTED_DSH_RELEASES.join(', ')}`,
    ])
  }

  const releases = [...new Set(packages.flatMap(entry => (entry.version === undefined ? [] : [entry.version])))].sort()
  const [release, ...extra] = releases
  if (release === undefined) {
    return report('incomplete', undefined, packages, [
      'theme-studio: no DSH package could be inspected.',
    ])
  }
  if (extra.length > 0) {
    return report('mixed', undefined, packages, [
      'theme-studio: this installation mixes several DSH releases.',
      'Align every installed @deepseek-ai/dsh* package on one supported release.',
      `  releases found: ${releases.join(', ')}`,
      `  supported: ${SUPPORTED_DSH_RELEASES.join(', ')}`,
    ])
  }
  if (!(SUPPORTED_DSH_RELEASES as readonly string[]).includes(release)) {
    return report('unsupported', release, packages, [
      `theme-studio: DSH ${release} is not a supported release.`,
      `  supported: ${SUPPORTED_DSH_RELEASES.join(', ')}`,
      `  installed: ${release}`,
    ])
  }
  return report('supported', release, packages, [
    `theme-studio: DSH ${release} is a supported release.`,
  ])
}

function report(
  verdict: CompatVerdict,
  release: string | undefined,
  packages: readonly InspectedPackage[],
  lines: readonly string[],
): CompatReport {
  return {
    verdict,
    release,
    packages,
    message: lines.join('\n'),
  }
}
