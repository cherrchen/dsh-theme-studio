/** Public readonly catalog data. This is not a theme-file exchange schema. */
import type { ThemeContrastReport } from './contrast.ts'

/** Four-color chip shown on a theme card. */
export interface ThemePreview {
  /** Card mosaic background. */
  readonly background: string
  /** Card mosaic raised surface. */
  readonly surface: string
  /** Card mosaic foreground sample. */
  readonly foreground: string
  /** Card mosaic accent sample. */
  readonly accent: string
}

/** Stage 1 token names already declared by ThemeRuntime. */
export const STAGE1_TOKENS = [
  '--dsw-alias-bg-base',
  '--dsw-alias-bg-layer-1',
  '--dsw-alias-bg-layer-2',
  '--dsw-alias-bg-overlay',
  '--dsw-alias-border-l1',
  '--dsw-alias-border-l2',
  '--dsw-alias-brand-primary',
  '--dsw-alias-label-primary',
  '--dsw-alias-label-secondary',
  '--dsw-alias-state-error-primary',
  '--dsw-alias-state-success-primary',
  '--dsw-alias-state-warn-primary',
  '--dsw-specific-sidebar-fill',
] as const

/** One Stage 1 token name. */
export type Stage1Token = typeof STAGE1_TOKENS[number]

/** One builtin palette keyed by Stage 1 token names. */
export type ThemeTokenPalette = Readonly<Record<Stage1Token, string>>

/** Compiled builtin theme returned by the discovery catalog. */
export interface BuiltinThemePreset {
  /** Namespaced theme id; never `light`, `dark`, `system`, or `default`. */
  readonly id: string
  /** English display name used until locale dictionaries resolve. */
  readonly name: string
  /** Optional English description. */
  readonly description?: string
  /** Light and dark palettes; every defined token must exist in both. */
  readonly tokens: {
    /** Values applied while the official light base palette is active. */
    readonly light: Readonly<Record<string, string>>
    /** Values applied while the official dark base palette is active. */
    readonly dark: Readonly<Record<string, string>>
  }
  /** Card mosaic colors for each official color scheme. */
  readonly preview: {
    /** Mosaic while Appearance is light. */
    readonly light: ThemePreview
    /** Mosaic while Appearance is dark. */
    readonly dark: ThemePreview
  }
}

/** Minimal lookup consumed by the overlay runtime. */
export interface ThemeCatalog {
  /**
   * Resolve one theme by id.
   * @param id - namespaced theme id.
   * @returns the preset, or `undefined` when the id is unknown.
   */
  get(id: string): BuiltinThemePreset | undefined
  /**
   * List builtin themes in display order.
   * @returns the catalog snapshot.
   */
  list(): readonly BuiltinThemePreset[]
}

/** Public builtin discovery and contrast diagnostics, in Settings card order. */
export interface ThemeStudioCatalog extends ThemeCatalog {
  /** Report for one theme; undefined for unknown ids (including Default). */
  validate(id: string): ThemeContrastReport | undefined
}

/** Client Cordis service provided while Theme Studio is loaded. */
export interface ThemeStudioService {
  readonly catalog: ThemeStudioCatalog
}
