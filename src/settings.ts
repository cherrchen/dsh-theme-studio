/** Theme Studio Host settings namespace, schema, and defaults. */

import z from '@deepseek-ai/schemastery'
import { liveField } from './compat/settings-host.ts'
import {
  ACTIVE_THEME_ID_FIELD, THEME_STUDIO_SETTINGS_NAMESPACE, type ThemeStudioSettings,
} from './constants.ts'

export { ACTIVE_THEME_ID_FIELD, THEME_STUDIO_SETTINGS_NAMESPACE, type ThemeStudioSettings }

/** Default section: no Theme Studio overlay, official Appearance only. */
export const DEFAULT_THEME_STUDIO_SETTINGS: ThemeStudioSettings = {
  activeThemeId: null,
}

/** One `activeThemeId` field. A fresh schema so `volatile()` cannot alter the register copy. */
function activeThemeIdField(): z<string | null> {
  return z.union([z.string(), z.const(null)]).default(null)
}

/** Host schema for the Theme Studio namespace. */
export const ThemeStudioSettingsSchema: z<ThemeStudioSettings> = z.object({
  [ACTIVE_THEME_ID_FIELD]: activeThemeIdField(),
})

/**
 * Plugin Config read by hosts that persist volatile fields on the profile
 * entry. On older schemastery the field stays a plain default.
 */
export const Config = z.object({
  [ACTIVE_THEME_ID_FIELD]: liveField(activeThemeIdField()),
})
