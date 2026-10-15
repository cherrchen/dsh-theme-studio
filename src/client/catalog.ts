/** Theme catalog: frozen builtin registry plus the imported-themes composite. */

import { BUILTIN_PRESETS } from './presets.ts'
import { validateThemeContrast, type ThemeContrastReport } from './contrast.ts'
import type { StoredThemeEntry } from './theme-file.ts'
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
      return freezePreset(preset)
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

/**
 * Deep-copy one stored file object into a fully frozen private copy. Stored
 * sources arrive as mutable Host snapshot objects; the catalog owns a frozen
 * copy so neither side can mutate the other through the shared reference.
 */
function freezeSource(source: Record<string, unknown>): Record<string, unknown> {
  const clone = (value: unknown): unknown => {
    if (Array.isArray(value)) return Object.freeze(value.map(clone))
    if (typeof value === 'object' && value !== null) {
      const out: Record<string, unknown> = {}
      for (const [key, inner] of Object.entries(value as Record<string, unknown>)) out[key] = clone(inner)
      return Object.freeze(out)
    }
    return value
  }
  return clone(source) as Record<string, unknown>
}

function freezePreset(preset: BuiltinThemePreset): BuiltinThemePreset {
  return Object.freeze({
    ...preset,
    palette: Object.freeze({
      light: Object.freeze({ ...preset.palette.light }),
      dark: Object.freeze({ ...preset.palette.dark }),
    }),
    tokens: Object.freeze({
      light: Object.freeze({ ...preset.tokens.light }),
      dark: Object.freeze({ ...preset.tokens.dark }),
    }),
    preview: Object.freeze({
      light: Object.freeze({ ...preset.preview.light }),
      dark: Object.freeze({ ...preset.preview.dark }),
    }),
  })
}

/**
 * Discovery catalog over builtin plus imported themes. `list()` returns the
 * frozen snapshot taken at call time; the builtin section never changes while
 * the imported section is replaced wholesale by {@link setImported}.
 */
export class ThemeStudioRegistry implements ThemeStudioCatalog {
  private readonly builtin: BuiltinPresetRegistry
  private importedPresets: readonly BuiltinThemePreset[] = Object.freeze([])
  private importedMap: ReadonlyMap<string, BuiltinThemePreset> = new Map()
  private sources: ReadonlyMap<string, Record<string, unknown>> = new Map()
  private signature = ''
  private cachedList: readonly BuiltinThemePreset[]
  private readonly listeners = new Set<() => void>()
  private rev = 0

  /**
   * @param presets - builtin theme list; wrapped in a frozen registry.
   */
  constructor(presets: readonly BuiltinThemePreset[] = BUILTIN_PRESETS) {
    this.builtin = new BuiltinPresetRegistry(presets)
    this.cachedList = this.builtin.list()
  }

  /** Monotonic counter bumped whenever the imported section changes. */
  get revision(): number {
    return this.rev
  }

  /**
   * Replace the imported section from the durable snapshot. Entries whose ids
   * collide with a builtin are dropped; later duplicate ids overwrite in
   * place. Each stored source is cloned and deep-frozen so the catalog owns
   * immutable copies. Returns true when the visible set actually changed.
   * @param entries - compiled presets paired with their stored sources.
   */
  setImported(entries: readonly StoredThemeEntry[]): boolean {
    const byId = new Map<string, StoredThemeEntry>()
    for (const entry of entries) {
      if (this.builtin.get(entry.preset.id) !== undefined) continue
      byId.set(entry.preset.id, entry)
    }
    const signature = [...byId.values()].map(entry => `${entry.preset.id}=${JSON.stringify(entry.source)}`).join('')
    if (signature === this.signature) return false
    this.signature = signature
    this.importedPresets = Object.freeze([...byId.values()].map(entry => freezePreset(entry.preset)))
    this.importedMap = new Map(this.importedPresets.map(preset => [preset.id, preset]))
    this.sources = new Map([...byId.values()].map(entry => [entry.preset.id, freezeSource(entry.source)]))
    this.cachedList = Object.freeze([...this.builtin.list(), ...this.importedPresets])
    this.rev += 1
    for (const listener of [...this.listeners]) listener()
    return true
  }

  /** Whether a resolved id belongs to the imported section. */
  isImported(id: string): boolean {
    return this.importedMap.has(id)
  }

  /** The frozen verbatim stored file object for an imported theme, if any. */
  sourceOf(id: string): Record<string, unknown> | undefined {
    return this.sources.get(id)
  }

  /** Imported themes with their frozen stored sources, in menu order. */
  importedEntries(): readonly StoredThemeEntry[] {
    return this.importedPresets.map(preset => ({ preset, source: this.sources.get(preset.id)! }))
  }

  /**
   * Observe imported-section replacements.
   * @param listener - invoked after each change.
   * @returns the disposer removing this listener.
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  /**
   * Resolve a builtin or imported theme.
   * @param id - namespaced theme id.
   * @returns the preset, or `undefined` when the id is unknown.
   */
  get(id: string): BuiltinThemePreset | undefined {
    return this.builtin.get(id) ?? this.importedMap.get(id)
  }

  /**
   * Current themes in display order: builtins, then imported. A fresh frozen
   * array is published per imported-section change.
   * @returns the catalog snapshot.
   */
  list(): readonly BuiltinThemePreset[] {
    return this.cachedList
  }

  /** Evaluate one theme without changing any tokens or settings. */
  validate(id: string): ThemeContrastReport | undefined {
    const preset = this.get(id)
    return preset === undefined ? undefined : validateThemeContrast(preset)
  }
}
