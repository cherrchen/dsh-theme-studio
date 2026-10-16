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
  /** Newer hosts: read live form values for every configurable profile entry. */
  describe?: () => readonly { ns: string; value: unknown }[]
}

/** Cordis members the attachment needs beyond the settings service. */
export interface AttachContextFace {
  /** Plugin fiber passed to `configure`. */
  readonly fiber: object
  /**
   * Subscribe to a host event (used for `settings/document-updated`).
   * @param name - event name.
   * @param listener - event listener.
   * @returns a disposer removing the listener, when the host returns one.
   */
  on(name: string, listener: () => void): unknown
}

/**
 * Read/watch seam for the durable Theme Studio section on the host side.
 * `get` returns the resolved section value (an object on both transports);
 * `watch` notifies on every accepted change. Either may be a projection of
 * the volatile fields only, so consumers read fields defensively.
 */
export interface ThemeStudioHostSection {
  /** @returns the current section value. */
  get(): unknown
  /**
   * Observe accepted section changes.
   * @param listener - invoked after a change lands.
   * @returns the disposer removing this listener.
   */
  watch(listener: () => void): () => void
}

/** What a successful attach leaves behind. */
export interface ThemeStudioSettingsAttachment {
  /** Host-side section seam; absent when the transport cannot expose one. */
  readonly section: ThemeStudioHostSection | undefined
  /** Transport registration disposer, when the chosen API returns one. */
  readonly dispose: (() => void) | undefined
}

/**
 * Adapt a subscribe call whose return may not be a disposer. The wrapped
 * listener is gated so the seam's detach still silences notifications when
 * the upstream registration cannot be removed; a returned disposer is used
 * normally.
 * @param subscribe - upstream `watch`/`on` call.
 * @returns a `watch` implementation honoring {@link ThemeStudioHostSection}.
 */
function gateListener(subscribe: (listener: () => void) => unknown): (listener: () => void) => () => void {
  return (listener) => {
    let active = true
    const stop = subscribe(() => {
      if (active) listener()
    })
    return () => {
      active = false
      if (typeof stop === 'function') stop()
    }
  }
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
 * The returned attachment is a plain object, and Cordis collects a plugin
 * `apply` result only when it is a function, a thenable, or an iterable of
 * those — callers must hand back {@link ThemeStudioSettingsAttachment.dispose}
 * (or their own function), never this object. That is the same reason the
 * legacy scope cannot travel out of `apply` itself (see the previous
 * regression): an object return fails the injection fiber and rolls the
 * namespace registration back.
 * @param settings - the injected settings service.
 * @param schema - namespace schema used by `register`.
 * @param ctx - plugin context face (fiber plus event subscription).
 * @returns the section seam and the transport disposer.
 */
export function attachThemeStudioSettings(
  settings: SettingsServiceFace,
  schema: unknown,
  ctx: AttachContextFace,
): ThemeStudioSettingsAttachment {
  if (typeof settings.register === 'function') {
    const scope = settings.register(THEME_STUDIO_SETTINGS_NAMESPACE, schema) as {
      get?: () => unknown
      watch?: (listener: () => void) => (() => void) | void
    } | undefined
    // Read once into bound locals: inside the section's closures TypeScript
    // does not keep property narrowing, some scopes legitimately lack watch,
    // and the scope's own methods may rely on `this`.
    const scopeGet = scope?.get?.bind(scope)
    const scopeWatch = scope?.watch?.bind(scope)
    const section: ThemeStudioHostSection | undefined =
      typeof scopeGet === 'function' && typeof scopeWatch === 'function'
        ? {
            get: () => scopeGet(),
            watch: gateListener(scopeWatch),
          }
        : undefined
    return { section, dispose: undefined }
  }
  if (typeof settings.configure === 'function') {
    const dispose = settings.configure({ auto: false }, ctx.fiber) ?? undefined
    const describe = settings.describe?.bind(settings)
    const section: ThemeStudioHostSection | undefined = describe === undefined
      ? undefined
      : {
          get: () => describe().find(row => row.ns === THEME_STUDIO_SETTINGS_NAMESPACE)?.value,
          watch: gateListener(listener => ctx.on('settings/document-updated', listener)),
        }
    return { section, dispose }
  }
  return { section: undefined, dispose: undefined }
}
