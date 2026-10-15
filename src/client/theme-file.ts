/**
 * Public `dsh-theme.json` v1 file format: parse, validate, compile, serialize.
 *
 * A theme file carries a 13-field {@link ChromePalette} per color scheme plus
 * optional sparse token `overrides` layered over {@link deriveChrome}. The
 * validated object is stored verbatim in settings so export round-trips.
 */

import {
  baseAliasTokens, CHROME_PALETTE_KEYS, deriveChrome, palettePreview, type ChromePalette,
} from './chrome-tokens.ts'
import { checkColorSyntax } from './contrast-colors.ts'
import { isOfficialFontToken } from './font-boundary.ts'
import type { BuiltinThemePreset } from './types.ts'

/** File format version emitted and accepted by this build. */
export const THEME_FILE_VERSION = 1

/** Conventional file suffix for theme files. */
export const THEME_FILE_EXTENSION = '.dsh-theme.json'

/** UTF-16 length cap for one file; the picker also checks `File.size`. */
export const THEME_FILE_MAX_LENGTH = 128 * 1024

/** Prefix used when generating ids for exports and collision-free renames. */
export const USER_THEME_ID_PREFIX = 'user.'

const ID_PATTERN = /^[a-z0-9][a-z0-9.-]{0,63}$/
const RESERVED_IDS = new Set(['default', 'light', 'dark', 'system'])
const BUILTIN_ID_PREFIX = 'dsh-theme-studio.'
const OVERRIDE_NAME = /^--(?:dsw|shiki|dsh)-[\w-]*$/

/** Top-level keys the format understands; anything else is rejected outright. */
const KNOWN_FIELDS = new Set(['$schema', 'version', 'id', 'name', 'description', 'author', 'palette', 'overrides'])

/** Validated shape of a v1 theme file. */

export interface DshThemeFile {
  readonly version: 1
  /** Namespaced theme id; never a builtin prefix or reserved word. */
  readonly id: string
  /** Display name shown verbatim in the Themes menu. */
  readonly name: string
  readonly description?: string
  readonly author?: string
  /** Complete 13-field palette for both schemes. */
  readonly palette: {
    readonly light: ChromePalette
    readonly dark: ChromePalette
  }
  /** Sparse token overrides over the derived chrome; same key set per scheme. */
  readonly overrides?: {
    readonly light?: Readonly<Record<string, string>>
    readonly dark?: Readonly<Record<string, string>>
  }
}

/** Machine-readable rejection reason for a theme file or stored entry. */
export type ThemeFileErrorCode =
  | 'not-json'
  | 'too-large'
  | 'read-failed'
  | 'not-object'
  | 'unsupported-version'
  | 'invalid-id'
  | 'reserved-id'
  | 'builtin-id'
  | 'missing-name'
  | 'invalid-metadata'
  | 'unknown-field'
  | 'invalid-palette'
  | 'invalid-color'
  | 'invalid-override-name'
  | 'invalid-override-shape'

/** One structured parse failure. */
export interface ThemeFileError {
  readonly code: ThemeFileErrorCode
  /** Object path of the offending value, e.g. `palette.light.brand`. */
  readonly path?: string
  /** Free-form detail (the rejected value or parse message). */
  readonly detail?: string
}

/** Parse outcome: the normalized file view plus the verbatim source object. */
export type ThemeFileParse =
  | { readonly ok: true; readonly file: DshThemeFile; readonly source: Record<string, unknown> }
  | { readonly ok: false; readonly error: ThemeFileError }

function fail(code: ThemeFileErrorCode, path?: string, detail?: string): ThemeFileParse {
  const error: ThemeFileError = {
    code,
    ...(path === undefined ? {} : { path }),
    ...(detail === undefined ? {} : { detail }),
  }
  return { ok: false, error }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readId(value: unknown): ThemeFileError | null {
  if (typeof value !== 'string' || !ID_PATTERN.test(value)) {
    return { code: 'invalid-id', path: 'id', detail: String(value) }
  }
  if (RESERVED_IDS.has(value)) return { code: 'reserved-id', path: 'id', detail: value }
  if (value.startsWith(BUILTIN_ID_PREFIX)) return { code: 'builtin-id', path: 'id', detail: value }
  return null
}

function readPaletteField(owner: Record<string, unknown>, key: keyof ChromePalette, path: string): { ok: true; value: string } | { ok: false; error: ThemeFileError } {
  const value = owner[key]
  if (typeof value !== 'string') {
    return { ok: false, error: { code: 'invalid-palette', path: `${path}.${key}`, detail: 'required string missing' } }
  }
  if (!checkColorSyntax(value)) {
    return { ok: false, error: { code: 'invalid-color', path: `${path}.${key}`, detail: value } }
  }
  return { ok: true, value }
}

function readPalette(value: unknown, path: string): { ok: true; palette: ChromePalette } | { ok: false; error: ThemeFileError } {
  if (!isPlainObject(value)) {
    return { ok: false, error: { code: 'invalid-palette', path, detail: 'expected an object' } }
  }
  for (const key of Object.keys(value)) {
    if (!(CHROME_PALETTE_KEYS as readonly string[]).includes(key)) {
      return { ok: false, error: { code: 'invalid-palette', path: `${path}.${key}`, detail: 'unknown palette field' } }
    }
  }
  const palette: Record<string, string> = {}
  for (const key of CHROME_PALETTE_KEYS) {
    const field = readPaletteField(value, key, path)
    if (!field.ok) return field
    palette[key] = field.value
  }
  return { ok: true, palette: palette as unknown as ChromePalette }
}

function readOverrideMap(value: unknown, path: string): { ok: true; map: Readonly<Record<string, string>> } | { ok: false; error: ThemeFileError } {
  if (!isPlainObject(value)) {
    return { ok: false, error: { code: 'invalid-override-shape', path, detail: 'expected an object' } }
  }
  const map: Record<string, string> = {}
  for (const [name, color] of Object.entries(value)) {
    if (!OVERRIDE_NAME.test(name) || isOfficialFontToken(name)) {
      return { ok: false, error: { code: 'invalid-override-name', path: `${path}.${name}`, detail: name } }
    }
    if (typeof color !== 'string' || !checkColorSyntax(color)) {
      return { ok: false, error: { code: 'invalid-color', path: `${path}.${name}`, detail: String(color) } }
    }
    map[name] = color
  }
  return { ok: true, map }
}

function readOverrides(value: unknown): { ok: true; overrides: DshThemeFile['overrides'] } | { ok: false; error: ThemeFileError } {
  if (value === undefined) return { ok: true, overrides: undefined }
  if (!isPlainObject(value)) {
    return { ok: false, error: { code: 'invalid-override-shape', path: 'overrides', detail: 'expected an object' } }
  }
  for (const key of Object.keys(value)) {
    if (key !== 'light' && key !== 'dark') {
      return { ok: false, error: { code: 'invalid-override-shape', path: `overrides.${key}`, detail: 'expected light or dark' } }
    }
  }
  const out: { light?: Readonly<Record<string, string>>; dark?: Readonly<Record<string, string>> } = {}
  if (value['light'] !== undefined) {
    const light = readOverrideMap(value['light'], 'overrides.light')
    if (!light.ok) return light
    out.light = light.map
  }
  if (value['dark'] !== undefined) {
    const dark = readOverrideMap(value['dark'], 'overrides.dark')
    if (!dark.ok) return dark
    out.dark = dark.map
  }
  const lightKeys = new Set(Object.keys(out.light ?? {}))
  for (const key of Object.keys(out.dark ?? {})) lightKeys.add(key)
  for (const key of lightKeys) {
    if (!Object.hasOwn(out.light ?? {}, key) || !Object.hasOwn(out.dark ?? {}, key)) {
      return { ok: false, error: { code: 'invalid-override-shape', path: 'overrides', detail: `token ${key} must exist in both schemes` } }
    }
  }
  return { ok: true, overrides: out }
}

/**
 * Validate an already-parsed value as a v1 theme file. The original object is
 * returned verbatim as `source` for durable storage and re-export.
 * @param data - parsed JSON value.
 * @returns the typed file view or a structured error.
 */
export function validateThemeFileData(data: unknown): ThemeFileParse {
  if (!isPlainObject(data)) return fail('not-object')
  for (const key of Object.keys(data)) {
    if (!KNOWN_FIELDS.has(key)) return fail('unknown-field', key)
  }
  const version = data['version'] === undefined ? THEME_FILE_VERSION : data['version']
  if (version !== THEME_FILE_VERSION) {
    return fail('unsupported-version', 'version', String(data['version']))
  }
  const idError = readId(data['id'])
  if (idError) return { ok: false, error: idError }
  const id = data['id'] as string
  const name = data['name']
  if (typeof name !== 'string' || name.trim().length === 0) {
    return fail('missing-name', 'name', String(name))
  }
  for (const key of ['$schema', 'description', 'author'] as const) {
    if (data[key] !== undefined && typeof data[key] !== 'string') {
      return fail('invalid-metadata', key, String(data[key]))
    }
  }
  const paletteValue = data['palette']
  if (!isPlainObject(paletteValue)) return fail('invalid-palette', 'palette', 'expected an object')
  for (const key of Object.keys(paletteValue)) {
    if (key !== 'light' && key !== 'dark') {
      return fail('invalid-palette', `palette.${key}`, 'expected light or dark')
    }
  }
  const light = readPalette(paletteValue['light'], 'palette.light')
  if (!light.ok) return light
  const dark = readPalette(paletteValue['dark'], 'palette.dark')
  if (!dark.ok) return dark
  const overrides = readOverrides(data['overrides'])
  if (!overrides.ok) return overrides
  const file: DshThemeFile = {
    version: THEME_FILE_VERSION,
    id,
    name: name.trim(),
    ...(typeof data['description'] === 'string' ? { description: data['description'] } : {}),
    ...(typeof data['author'] === 'string' ? { author: data['author'] } : {}),
    palette: Object.freeze({ light: Object.freeze({ ...light.palette }), dark: Object.freeze({ ...dark.palette }) }),
    ...(overrides.overrides === undefined ? {} : {
      overrides: Object.freeze({
        ...(overrides.overrides.light === undefined ? {} : { light: Object.freeze({ ...overrides.overrides.light }) }),
        ...(overrides.overrides.dark === undefined ? {} : { dark: Object.freeze({ ...overrides.overrides.dark }) }),
      }),
    }),
  }
  return { ok: true, file, source: data }
}

/**
 * Parse raw file text: size cap, JSON, then structural validation.
 * @param text - file contents.
 * @returns the typed file view or a structured error.
 */
export function parseThemeFile(text: string): ThemeFileParse {
  if (text.length > THEME_FILE_MAX_LENGTH) {
    return fail('too-large', undefined, `${text.length} chars`)
  }
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch (error) {
    return fail('not-json', undefined, error instanceof Error ? error.message : String(error))
  }
  return validateThemeFileData(data)
}

/**
 * Compile a validated file into the preset shape used by catalog and runtime:
 * base aliases and derived chrome, then scheme overrides on top.
 * @param file - the normalized file view.
 * @returns a deeply frozen preset.
 */
export function compileThemeFile(file: DshThemeFile): BuiltinThemePreset {
  const light = { ...file.palette.light }
  const dark = { ...file.palette.dark }
  return Object.freeze({
    id: file.id,
    name: file.name,
    ...(file.description === undefined ? {} : { description: file.description }),
    palette: Object.freeze({ light: Object.freeze(light), dark: Object.freeze(dark) }),
    tokens: Object.freeze({
      light: Object.freeze({
        ...deriveChrome(file.palette.light),
        ...baseAliasTokens(file.palette.light),
        ...file.overrides?.light,
      }),
      dark: Object.freeze({
        ...deriveChrome(file.palette.dark),
        ...baseAliasTokens(file.palette.dark),
        ...file.overrides?.dark,
      }),
    }),
    preview: Object.freeze({
      light: Object.freeze(palettePreview(file.palette.light)),
      dark: Object.freeze(palettePreview(file.palette.dark)),
    }),
  })
}

/** One stored entry that compiled successfully, paired with its verbatim source. */
export interface StoredThemeEntry {
  readonly preset: BuiltinThemePreset
  readonly source: Record<string, unknown>
}

/** Outcome of reading the durable `importedThemes` field. */
export interface StoredThemeParse {
  readonly entries: readonly StoredThemeEntry[]
  /** Count of stored entries skipped as unreadable. */
  readonly dropped: number
}

/**
 * Compile the durable imported-themes array. Non-array input and entries that
 * fail validation are skipped and counted, never thrown.
 * @param raw - the settings field value.
 * @returns compiled presets paired with their source objects.
 */
export function parseStoredThemeFiles(raw: unknown): StoredThemeParse {
  if (raw === undefined || raw === null) return { entries: [], dropped: 0 }
  if (!Array.isArray(raw)) return { entries: [], dropped: 1 }
  const entries: StoredThemeEntry[] = []
  let dropped = 0
  for (const item of raw) {
    const parsed = validateThemeFileData(item)
    if (parsed.ok) entries.push({ preset: compileThemeFile(parsed.file), source: parsed.source })
    else dropped += 1
  }
  return { entries, dropped }
}

/**
 * Build an exportable file object for a builtin preset. The builtin id is
 * rewritten under `user.` so the exported file can be imported back.
 * @param preset - a builtin preset carrying its source palette.
 * @returns the theme-file object.
 */
export function themeFileForPreset(preset: BuiltinThemePreset): Record<string, unknown> {
  const short = preset.id.startsWith(BUILTIN_ID_PREFIX) ? preset.id.slice(BUILTIN_ID_PREFIX.length) : preset.id
  return {
    version: THEME_FILE_VERSION,
    id: `${USER_THEME_ID_PREFIX}${short}`,
    name: preset.name,
    ...(preset.description === undefined ? {} : { description: preset.description }),
    palette: preset.palette,
  }
}

/**
 * Serialize a stored or freshly built file object for download.
 * @param source - theme-file object.
 * @returns pretty-printed JSON text.
 */
export function serializeThemeFile(source: Record<string, unknown>): string {
  return `${JSON.stringify(source, null, 2)}\n`
}

/**
 * Download filename for one theme id.
 * @param id - theme id (filesystem-safe charset by schema rule).
 * @returns `<id>.dsh-theme.json`.
 */
export function themeFileName(id: string): string {
  return `${id}${THEME_FILE_EXTENSION}`
}

/**
 * First collision-free id derived from `base` against existing ids.
 * @param base - preferred id.
 * @param existing - ids already in use.
 * @returns `base` itself, or `base-2`, `base-3`, …, shortening the base to fit 64 characters.
 */
export function uniqueThemeId(base: string, existing: ReadonlySet<string>): string {
  if (!existing.has(base)) return base
  for (let n = 2; ; n += 1) {
    const suffix = `-${n}`
    const candidate = `${base.slice(0, 64 - suffix.length)}${suffix}`
    if (!existing.has(candidate)) return candidate
  }
}
