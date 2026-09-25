/**
 * Host settings registration across the settings-namespace API and the later
 * profile Config API. The choice is the shape of `ctx.settings`, not a version.
 */

import { THEME_STUDIO_SETTINGS_NAMESPACE } from '../constants.ts'

/** Settings service methods this plugin can attach to. */
export interface SettingsServiceFace {
  /** Older hosts: register a durable namespace schema. */
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
 * @param settings - the injected settings service.
 * @param schema - namespace schema used by `register`.
 * @param owner - plugin fiber passed to `configure`.
 * @returns the disposer, when the chosen API returns one.
 */
export function attachThemeStudioSettings(
  settings: SettingsServiceFace,
  schema: unknown,
  owner: object,
): unknown {
  if (typeof settings.register === 'function') {
    return settings.register(THEME_STUDIO_SETTINGS_NAMESPACE, schema)
  }
  if (typeof settings.configure === 'function') {
    return settings.configure({ auto: false }, owner)
  }
}
