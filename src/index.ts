/**
 * Theme Studio plugin, node half. Registers the durable `theme-studio`
 * settings namespace when a Host settings service is present; otherwise a
 * no-op so Headless compositions boot without this plugin. When `ctx.skills`
 * exists, the durable creatorAgentMode drives the Theme Creator skill's
 * registration.
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-settings'
import type {} from '@deepseek-ai/dsh-skill'
import { attachThemeStudioSettings, type SettingsServiceFace } from './compat/settings-host.ts'
import { createCreatorSectionSource, watchCreatorAgent } from './creator/register.ts'
import { ThemeStudioSettingsSchema } from './settings.ts'

export {
  ACTIVE_THEME_ID_FIELD, DEFAULT_THEME_STUDIO_SETTINGS, IMPORTED_THEMES_FIELD,
  THEME_STUDIO_SETTINGS_NAMESPACE, Config, ThemeStudioSettingsSchema, type ThemeStudioSettings,
} from './settings.ts'
export {
  ACTIVE_SOURCE, CREATOR_AGENT_MODE_FIELD, CREATOR_AGENT_MODES, DEFAULT_CREATOR_AGENT_MODE,
  PREVIEW_SOURCE, THEME_CREATOR_SKILL_NAME, creatorAgentModeOf, type CreatorAgentMode,
} from './constants.ts'

/** Cordis plugin id matching `cordis.patch.yml`. */
export const name = 'theme-studio'

/**
 * Register the settings namespace, then keep the Theme Creator skill
 * registered exactly while the durable mode says so. The two inject fibers
 * coordinate through a shared section source: whichever settings transport
 * attaches publishes its read scope, and the skills watcher reconciles the
 * registration with each accepted snapshot.
 * @param ctx - Host context that may acquire the settings and skills services.
 */
export function apply(ctx: Context): void {
  const sections = createCreatorSectionSource()
  ctx.inject(['settings'], (settingsCtx) => {
    const attachment = attachThemeStudioSettings(
      settingsCtx.settings as SettingsServiceFace,
      ThemeStudioSettingsSchema,
      ctx,
    )
    sections.set(attachment.section)
    return () => {
      sections.set(undefined)
      attachment.dispose?.()
    }
  })
  ctx.inject(['skills'], (skillsCtx) => {
    return watchCreatorAgent(skillsCtx.skills, sections)
  })
}
