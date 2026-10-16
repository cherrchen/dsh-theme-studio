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

/** Quote a path for one shell command line. */
function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`
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
 * @param skills - the host skill registry.
 * @param source - the settings section source shared with the settings attach.
 * @returns the disposer tearing down the watch and any registration.
 */
export function watchCreatorAgent(
  skills: CreatorSkillRegistry,
  source: CreatorSectionSource,
): () => void {
  let watched: ThemeStudioHostSection | undefined
  let detach: (() => void) | undefined
  let dispose: (() => void) | undefined
  let current: CreatorAgentMode | 'off' | undefined

  const reconcile = (): void => {
    const section = source.get()
    if (section !== watched) {
      detach?.()
      watched = section
      detach = section?.watch(reconcile)
    }
    const raw = section?.get()
    const mode: CreatorAgentMode | 'off' = section === undefined
      ? 'off'
      : creatorAgentModeOf(isSection(raw) ? raw[CREATOR_AGENT_MODE_FIELD] : undefined)
    if (mode === current) return
    dispose?.()
    dispose = undefined
    current = mode
    if (mode !== 'off') dispose = skills.register(creatorRegistration(mode))
  }
  reconcile()
  const unsubscribe = source.subscribe(reconcile)
  return () => {
    unsubscribe()
    detach?.()
    dispose?.()
    watched = undefined
    dispose = undefined
    current = undefined
  }
}
