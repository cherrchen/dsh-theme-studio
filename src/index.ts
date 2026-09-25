/**
 * Theme Studio plugin, node half. Registers the durable `theme-studio`
 * settings namespace when a Host settings service is present; otherwise a
 * no-op so Headless compositions boot without this plugin.
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-settings'
import { classifyInstallation, warnUnlessSupported } from './compat/dsh-version.ts'
import { attachThemeStudioSettings, type SettingsServiceFace } from './compat/settings-host.ts'
import { ThemeStudioSettingsSchema } from './settings.ts'

export {
  ACTIVE_THEME_ID_FIELD, DEFAULT_THEME_STUDIO_SETTINGS, THEME_STUDIO_SETTINGS_NAMESPACE,
  Config, ThemeStudioSettingsSchema, type ThemeStudioSettings,
} from './settings.ts'
export { ACTIVE_SOURCE, PREVIEW_SOURCE } from './constants.ts'

/** Cordis plugin id matching `cordis.patch.yml`. */
export const name = 'theme-studio'

/**
 * Register the Theme Studio settings namespace when `ctx.settings` exists.
 * @param ctx - Host context that may acquire the settings service.
 */
export function apply(ctx: Context): void {
  warnUnlessSupported(classifyInstallation())
  ctx.inject(['settings'], (settingsCtx) => {
    return attachThemeStudioSettings(
      settingsCtx.settings as unknown as SettingsServiceFace,
      ThemeStudioSettingsSchema,
      ctx.fiber,
    )
  })
}
