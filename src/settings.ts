/** Theme Studio Host settings namespace, schema, and defaults. */

import z from '@deepseek-ai/schemastery'
import { liveField } from './compat/settings-host.ts'
import {
  ACTIVE_THEME_ID_FIELD, IMPORTED_THEMES_FIELD, THEME_STUDIO_SETTINGS_NAMESPACE,
  type ThemeStudioSettings,
} from './constants.ts'

export { ACTIVE_THEME_ID_FIELD, IMPORTED_THEMES_FIELD, THEME_STUDIO_SETTINGS_NAMESPACE, type ThemeStudioSettings }

/** Default section: no Theme Studio overlay, no imported theme files. */
export const DEFAULT_THEME_STUDIO_SETTINGS: ThemeStudioSettings = {
  activeThemeId: null,
  importedThemes: [],
}

/** One `activeThemeId` field. A fresh schema so `volatile()` cannot alter the register copy. */
function activeThemeIdField(): z<string | null> {
  return z.union([z.string(), z.const(null)]).default(null)
}

/**
 * Loose durable store for theme-file objects. Strict per-file validation runs
 * on the Client so a newer file version degrades to a skipped entry instead of
 * breaking the whole namespace snapshot.
 */
function importedThemesField(): z<unknown[]> {
  return z.array(z.any()).default([])
}

/** Host schema for the Theme Studio namespace. */
export const ThemeStudioSettingsSchema: z<ThemeStudioSettings> = z.object({
  [ACTIVE_THEME_ID_FIELD]: activeThemeIdField(),
  [IMPORTED_THEMES_FIELD]: importedThemesField(),
})

/**
 * Plugin Config read by hosts that persist volatile fields on the profile
 * entry. Both fields are live: the configForms transport rejects writes to
 * non-volatile fields. On older schemastery fields stay plain defaults.
 */
export const Config = z.object({
  [ACTIVE_THEME_ID_FIELD]: liveField(activeThemeIdField()),
  [IMPORTED_THEMES_FIELD]: liveField(importedThemesField()),
})
