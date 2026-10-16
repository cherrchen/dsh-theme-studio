/**
 * Theme Creator skill registration, driven by the durable settings mode.
 * The watcher reconciles `ctx.skills.register()` with the accepted settings
 * snapshot so the skill only exists while its mode asks for it.
 */

import type { SkillRegistration } from '@deepseek-ai/dsh-skill'
import {
  CREATOR_AGENT_MODE_FIELD, creatorAgentModeOf, THEME_CREATOR_SKILL_NAME, type CreatorAgentMode,
} from '../constants.ts'
import type { ThemeStudioHostSection } from '../compat/settings-host.ts'
import {
  creatorSkillContent, THEME_CREATOR_SKILL_DESCRIPTION, THEME_CREATOR_SKILL_WHEN_TO_USE,
} from './skill.ts'

/** The slice of `ctx.skills` this feature needs. */
export interface CreatorSkillRegistry {
  /**
   * Register one runtime skill.
   * @param skill - the registration accepted by the host skill registry.
   * @returns the disposer removing the skill.
   */
  register(skill: SkillRegistration): () => void
}

/** Where the creator watcher reads the settings section scope from. */
export interface CreatorSectionSource {
  /** @returns the current section scope, or `undefined` while settings are detached. */
  get(): ThemeStudioHostSection | undefined
  /**
   * Observe section-scope swaps (settings attach/detach).
   * @param listener - invoked after the scope changes.
   * @returns the disposer removing this listener.
   */
  subscribe(listener: () => void): () => void
}

/**
 * Shared slot the two inject fibers coordinate through: the settings fiber
 * publishes its attachment, the skills fiber reads it.
 * @returns the source with its `set` writer.
 */
export function createCreatorSectionSource(): CreatorSectionSource & {
  /** Publish the current section scope; a same-value set does not notify. */
  set(section: ThemeStudioHostSection | undefined): void
} {
  let current: ThemeStudioHostSection | undefined
  const listeners = new Set<() => void>()
  return {
    get: () => current,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    set: (section) => {
      if (section === current) return
      current = section
      for (const listener of [...listeners]) listener()
    },
  }
}

/**
 * Absolute path of the bundled validator CLI. `import.meta.dirname` resolves
 * inside the emitted host bundle (`lib/index.js`), so the sibling entry
 * `lib/validate-theme.js` is found wherever the package is installed.
 * @returns the filesystem path passed to the skill content.
 */
export function creatorValidatorPath(): string {
  return `${import.meta.dirname}/validate-theme.js`
}

/**
 * Quote a path for one shell command line. POSIX single-quote escaping on
 * POSIX hosts; Windows file names cannot contain `"`, so double-quoting is
 * the form cmd and PowerShell both accept.
 */
function shellQuote(value: string): string {
  return process.platform === 'win32'
    ? `"${value}"`
    : `'${value.replaceAll("'", "'\\''")}'`
}

/**
 * Build the runtime registration for one visibility mode.
 * @param mode - `gesture` keeps the skill user-invocable only (no model
 *   catalog row); `catalog` also lists it for model routing.
 * @param validatorPath - validator CLI path embedded into the skill body.
 * @returns the registration passed to `ctx.skills.register()`.
 */
export function creatorRegistration(
  mode: CreatorAgentMode,
  validatorPath: string = creatorValidatorPath(),
): SkillRegistration {
  return {
    name: THEME_CREATOR_SKILL_NAME,
    description: THEME_CREATOR_SKILL_DESCRIPTION,
    whenToUse: THEME_CREATOR_SKILL_WHEN_TO_USE,
    source: 'bundled',
    invocation: { modelInvocable: mode === 'catalog', userInvocable: true },
    content: creatorSkillContent(`node ${shellQuote(validatorPath)}`),
  }
}

function isSection(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Keep `dsh-theme-creator` registered exactly while the durable mode says so.
 * `off` — and a missing settings transport — register nothing; `gesture`
 * exposes the skill to the user's `/name` gesture only; `catalog` also lists
 * it for model routing. Mode flips dispose and re-register, which publishes a
 * fresh skill catalog to running sessions.
 *
 * Every step that touches a host object (section `get`/`watch`, registry
 * `register`, and the returned disposers) is fault-contained and reported:
 * `reconcile` runs inside event listeners (`settings/document-updated` or the
 * section watch), and cordis event dispatch does not isolate listener errors,
 * so a throwing host service must not escape into the emitter's write path.
 * A fault leaves the current registration in place — or cleared, if the
 * register step itself failed — and the next accepted change retries.
 * @param skills - the host skill registry.
 * @param source - the settings section source shared with the settings attach.
 * @param onError - receives host-side faults; the watcher survives them.
 * @returns the disposer tearing down the watch and any registration.
 */
export function watchCreatorAgent(
  skills: CreatorSkillRegistry,
  source: CreatorSectionSource,
  onError?: (error: unknown) => void,
): () => void {
  let watched: ThemeStudioHostSection | undefined
  let detach: (() => void) | undefined
  let dispose: (() => void) | undefined
  let current: CreatorAgentMode | 'off' | undefined

  const report = (error: unknown): void => {
    try {
      onError?.(error)
    } catch { /* the reporter must not break the watcher either */ }
  }
  const safely = (call: () => void): void => {
    try {
      call()
    } catch (error) {
      report(error)
    }
  }

  const reconcile = (): void => {
    const section = source.get()
    if (section !== watched) {
      safely(() => detach?.())
      detach = undefined
      watched = section
      try {
        detach = section?.watch(reconcile)
      } catch (error) {
        report(error)
      }
    }
    let mode: CreatorAgentMode | 'off'
    try {
      const raw = section?.get()
      mode = section === undefined
        ? 'off'
        : creatorAgentModeOf(isSection(raw) ? raw[CREATOR_AGENT_MODE_FIELD] : undefined)
    } catch (error) {
      // A failed read keeps the current registration; the next event retries.
      report(error)
      return
    }
    if (mode === current) return
    safely(() => dispose?.())
    dispose = undefined
    current = 'off'
    if (mode === 'off') return
    try {
      dispose = skills.register(creatorRegistration(mode))
      current = mode
    } catch (error) {
      // Nothing is registered; `current` stays 'off' so the next reconcile
      // retries the register while the stored mode still asks for it.
      report(error)
    }
  }
  reconcile()
  const unsubscribe = source.subscribe(reconcile)
  return () => {
    unsubscribe()
    safely(() => detach?.())
    safely(() => dispose?.())
    watched = undefined
    detach = undefined
    dispose = undefined
    current = undefined
  }
}
