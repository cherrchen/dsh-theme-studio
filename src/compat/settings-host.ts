/**
 * Host settings registration across the settings-namespace API and the later
 * profile Config API. The choice is the shape of `ctx.settings`, not a version.
 */

import { THEME_STUDIO_SETTINGS_NAMESPACE } from '../constants.ts'

/** Settings service methods this plugin can attach to. */
export interface SettingsServiceFace {
  /**
   * Older hosts: register a durable namespace schema. Returns the owner's
   * namespace scope — a plain object, never a disposer. The provider already
   * ties the registration to the calling fiber, so the scope must not travel
   * back out of a plugin `apply` (see {@link attachThemeStudioSettings}).
   */
  register?: (namespace: string, schema: unknown) => unknown
  /** Newer hosts: suppress the generated form for this plugin fiber. */
  configure?: (presentation: { auto?: boolean }, owner?: object) => (() => void) | void
}

/**
 * Mark a schema field live when the installed schemastery supports it.
 * Older schemastery builds have no `volatile` method; the field stays plain.
 * @param schema - one field schema.
 * @returns the live field, or the original schema.
 */
export function liveField<T>(schema: T): T {
  const candidate = schema as T & { volatile?: () => T }
  return typeof candidate.volatile === 'function' ? candidate.volatile() : schema
}

/**
 * Attach Theme Studio settings to whichever host API is present.
 * `register` wins when both exist, matching hosts that still own a namespace.
 *
 * The legacy `register` path deliberately answers with nothing. Cordis collects
 * a plugin `apply` result only when it is a function, a thenable, or an
 * iterable of those, and throws `Invalid effect` for any other object. The
 * legacy scope is such an object; returning it fails the injection fiber, which
 * rolls the namespace registration back and leaves the client transport with no
 * section to read. The provider's own effect owns that registration's lifetime.
 * @param settings - the injected settings service.
 * @param schema - namespace schema used by `register`.
 * @param owner - plugin fiber passed to `configure`.
 * @returns the disposer when the chosen API returns one, otherwise `undefined`.
 */
export function attachThemeStudioSettings(
  settings: SettingsServiceFace,
  schema: unknown,
  owner: object,
): (() => void) | undefined {
  if (typeof settings.register === 'function') {
    settings.register(THEME_STUDIO_SETTINGS_NAMESPACE, schema)
    return undefined
  }
  if (typeof settings.configure === 'function') {
    return settings.configure({ auto: false }, owner) ?? undefined
  }
  return undefined
}
