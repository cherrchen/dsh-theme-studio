/** Immutable builtin discovery catalog shared by the service and runtime. */

import { BUILTIN_PRESETS } from './presets.ts'
import { validateThemeContrast, type ThemeContrastReport } from './contrast.ts'
import type { BuiltinThemePreset, ThemeStudioCatalog } from './types.ts'

/** In-memory registry over compiled builtin presets. */
export class BuiltinPresetRegistry implements ThemeStudioCatalog {
  private readonly presets: readonly BuiltinThemePreset[]
  /**
   * @param presets - theme list copied into an immutable snapshot.
   */
  constructor(presets: readonly BuiltinThemePreset[] = BUILTIN_PRESETS) {
    const ids = new Set<string>()
    this.presets = Object.freeze(presets.map(preset => {
      if (ids.has(preset.id)) throw new Error(`duplicate theme id: ${preset.id}`)
      ids.add(preset.id)
      return Object.freeze({
        ...preset,
        tokens: Object.freeze({
          light: Object.freeze({ ...preset.tokens.light }),
          dark: Object.freeze({ ...preset.tokens.dark }),
        }),
        preview: Object.freeze({
          light: Object.freeze({ ...preset.preview.light }),
          dark: Object.freeze({ ...preset.preview.dark }),
        }),
      })
    }))
    Object.freeze(this)
  }

  /**
   * Resolve one builtin theme.
   * @param id - namespaced theme id.
   * @returns the preset, or `undefined` when the id is unknown.
   */
  get(id: string): BuiltinThemePreset | undefined {
    return this.presets.find(preset => preset.id === id)
  }

  /**
   * List builtin themes in display order.
   * @returns the catalog snapshot.
   */
  list(): readonly BuiltinThemePreset[] {
    return this.presets
  }

  /** Evaluate the catalog snapshot without changing any tokens or settings. */
  validate(id: string): ThemeContrastReport | undefined {
    const preset = this.get(id)
    return preset === undefined ? undefined : validateThemeContrast(preset)
  }
}
