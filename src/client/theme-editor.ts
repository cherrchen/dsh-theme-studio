import { baseAliasTokens, deriveChrome } from './chrome-tokens.ts'
import { checkColorSyntax } from './contrast-colors.ts'
import { validateThemeContrast } from './contrast.ts'
import { BUILTIN_PRESETS } from './presets.ts'
import {
  compileThemeFile, readId, serializeThemeFile, themeFileForPreset, uniqueThemeId, validateThemeFileData,
  THEME_FILE_MAX_LENGTH, THEME_FILE_VERSION, USER_THEME_ID_PREFIX,
  type DshThemeFile, type ThemeFileError,
} from './theme-file.ts'
import type { BuiltinThemePreset } from './types.ts'

export type ThemeEditorScheme = 'light' | 'dark'

export interface ThemeEditorDraft {
  readonly baseId: string
  readonly base: DshThemeFile
  readonly name: string
  readonly id: string
  readonly idEdited: boolean
  readonly description: string
  readonly author: string
  readonly values: {
    readonly light: Readonly<Record<string, string>>
    readonly dark: Readonly<Record<string, string>>
  }
}

export type ThemeEditorError = ThemeFileError | {
  readonly code: 'id-taken'
  readonly path: 'id'
  readonly detail?: string
}

export type ThemeEditorValidation =
  | {
    readonly ok: true
    readonly source: Record<string, unknown>
    readonly file: DshThemeFile
    readonly summary: { readonly failed: number; readonly unknown: number }
  }
  | { readonly ok: false; readonly errors: readonly ThemeEditorError[] }

const SURFACE_TOKENS: readonly string[] = Object.freeze(Object.keys(BUILTIN_PRESETS[0]!.tokens.light))
const SURFACE_SET: ReadonlySet<string> = new Set(SURFACE_TOKENS)

export function editorTokenNames(): readonly string[] {
  return SURFACE_TOKENS
}

export function editorTokenGroups(): readonly { prefix: string; tokens: readonly string[] }[] {
  const groups = new Map<string, string[]>()
  for (const name of SURFACE_TOKENS) {
    const segments = name.split('-').filter(segment => segment !== '')
    const prefix = `--${segments.slice(0, 2).join('-')}-`
    const bucket = groups.get(prefix)
    if (bucket === undefined) groups.set(prefix, [name])
    else bucket.push(name)
  }
  return [...groups.entries()].map(([prefix, tokens]) => Object.freeze({ prefix, tokens: Object.freeze(tokens) }))
}

export interface EditorTokenGroup {
  /** Three-segment prefix, shown with a trailing dash when every member extends it. */
  readonly prefix: string
  readonly display: string
  readonly tokens: readonly string[]
}

export interface EditorTokenCategory {
  /** Two-segment family prefix such as `--dsw-alias`. */
  readonly prefix: string
  readonly groups: readonly EditorTokenGroup[]
}

/** Category order shown in the editor; families not listed keep declaration order after these. */
const CATEGORY_ORDER: readonly string[] = ['--dsw-alias', '--dsw-specific', '--dsw-static', '--shiki-token']

export function editorTokenCategories(): readonly EditorTokenCategory[] {
  const categories = new Map<string, Map<string, string[]>>()
  for (const name of SURFACE_TOKENS) {
    const segments = name.split('-').filter(segment => segment !== '')
    const category = `--${segments.slice(0, 2).join('-')}`
    const group = `--${segments.slice(0, 3).join('-')}`
    let groups = categories.get(category)
    if (groups === undefined) categories.set(category, groups = new Map())
    const bucket = groups.get(group)
    if (bucket === undefined) groups.set(group, [name])
    else bucket.push(name)
  }
  const rank = (prefix: string): number => {
    const index = CATEGORY_ORDER.indexOf(prefix)
    return index === -1 ? CATEGORY_ORDER.length : index
  }
  return [...categories.entries()]
    .sort(([a], [b]) => rank(a) - rank(b))
    .map(([prefix, groups]) => Object.freeze({
      prefix,
      groups: Object.freeze([...groups.entries()].map(([group, tokens]) => Object.freeze({
        prefix: group,
        display: tokens.every(token => token.startsWith(`${group}-`)) ? `${group}-` : group,
        tokens: Object.freeze(tokens),
      }))),
    }))
}

export function themeEditorId(name: string, existing: ReadonlySet<string>): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  const base = `${USER_THEME_ID_PREFIX}${slug === '' ? 'theme' : slug}`.slice(0, 64)
  return uniqueThemeId(base, existing)
}

function copyFile(file: DshThemeFile): DshThemeFile {
  return {
    version: THEME_FILE_VERSION,
    id: file.id,
    name: file.name,
    ...(file.description === undefined ? {} : { description: file.description }),
    ...(file.author === undefined ? {} : { author: file.author }),
    palette: Object.freeze({
      light: Object.freeze({ ...file.palette.light }),
      dark: Object.freeze({ ...file.palette.dark }),
    }),
    ...(file.overrides === undefined ? {} : {
      overrides: Object.freeze({
        ...(file.overrides.light === undefined ? {} : { light: Object.freeze({ ...file.overrides.light }) }),
        ...(file.overrides.dark === undefined ? {} : { dark: Object.freeze({ ...file.overrides.dark }) }),
      }),
    }),
  }
}

export function createThemeEditorDraft(preset: BuiltinThemePreset, source?: DshThemeFile): ThemeEditorDraft {
  let base: DshThemeFile
  if (source === undefined) {
    const parsed = validateThemeFileData(themeFileForPreset(preset))
    if (!parsed.ok) throw new Error(`preset ${preset.id} does not produce a valid theme file`)
    base = parsed.file
  } else {
    base = source
  }
  const pick = (tokens: Readonly<Record<string, string>>) => {
    const out: Record<string, string> = {}
    for (const name of SURFACE_TOKENS) out[name] = tokens[name]!
    return Object.freeze(out)
  }
  return {
    baseId: preset.id,
    base: copyFile(base),
    name: '',
    id: themeEditorId('', new Set()),
    idEdited: false,
    description: source?.description ?? preset.description ?? '',
    author: source?.author ?? '',
    values: Object.freeze({
      light: pick(preset.tokens.light),
      dark: pick(preset.tokens.dark),
    }),
  }
}

function assembleSource(draft: ThemeEditorDraft): Record<string, unknown> {
  const derived = {
    light: { ...deriveChrome(draft.base.palette.light), ...baseAliasTokens(draft.base.palette.light) },
    dark: { ...deriveChrome(draft.base.palette.dark), ...baseAliasTokens(draft.base.palette.dark) },
  }
  const compiled = compileThemeFile(draft.base).tokens
  const light: Record<string, string> = {}
  const dark: Record<string, string> = {}
  for (const [name, value] of Object.entries(draft.base.overrides?.light ?? {})) {
    if (!SURFACE_SET.has(name)) light[name] = value
  }
  for (const [name, value] of Object.entries(draft.base.overrides?.dark ?? {})) {
    if (!SURFACE_SET.has(name)) dark[name] = value
  }
  for (const name of SURFACE_TOKENS) {
    const nextLight = draft.values.light[name] ?? compiled.light[name]!
    const nextDark = draft.values.dark[name] ?? compiled.dark[name]!
    if (nextLight !== derived.light[name] || nextDark !== derived.dark[name]) {
      light[name] = nextLight
      dark[name] = nextDark
    }
  }
  return {
    version: THEME_FILE_VERSION,
    id: draft.id,
    name: draft.name,
    ...(draft.description === '' ? {} : { description: draft.description }),
    ...(draft.author === '' ? {} : { author: draft.author }),
    palette: draft.base.palette,
    ...(Object.keys(light).length === 0 ? {} : { overrides: { light, dark } }),
  }
}

export function checkThemeEditorSize(source: Record<string, unknown>): ThemeFileError | null {
  const text = serializeThemeFile(source)
  const utf16 = text.length
  const utf8 = new TextEncoder().encode(text).length
  if (utf16 <= THEME_FILE_MAX_LENGTH && utf8 <= THEME_FILE_MAX_LENGTH) return null
  let largestPath = 'source'
  let largestBytes = -1
  const visit = (value: unknown, path: string): void => {
    if (typeof value === 'string') {
      const bytes = new TextEncoder().encode(value).length
      if (bytes > largestBytes) {
        largestBytes = bytes
        largestPath = path
      }
      return
    }
    if (Array.isArray(value)) {
      for (const [index, inner] of value.entries()) visit(inner, `${path}.${index}`)
      return
    }
    if (typeof value === 'object' && value !== null) {
      for (const [key, inner] of Object.entries(value)) visit(inner, `${path}.${key}`)
    }
  }
  for (const key of ['name', 'id', 'description', 'author', 'overrides', 'palette'] as const) {
    visit(source[key], key)
  }
  return {
    code: 'too-large',
    path: largestPath.startsWith('palette.') ? 'source' : largestPath,
    detail: `file totals ${utf16} UTF-16 chars / ${utf8} UTF-8 bytes exceed ${THEME_FILE_MAX_LENGTH}; largest contribution: ${largestPath}`,
  }
}

export function validateThemeEditor(draft: ThemeEditorDraft, existing: ReadonlySet<string>): ThemeEditorValidation {
  const errors: ThemeEditorError[] = []
  if (draft.name.trim().length === 0) errors.push({ code: 'missing-name', path: 'name', detail: draft.name })
  const idError = readId(draft.id)
  if (idError !== null) errors.push(idError)
  else if (existing.has(draft.id)) errors.push({ code: 'id-taken', path: 'id', detail: draft.id })
  for (const scheme of ['light', 'dark'] as const) {
    for (const name of SURFACE_TOKENS) {
      const value = draft.values[scheme][name]
      if (value !== undefined && !checkColorSyntax(value)) {
        errors.push({ code: 'invalid-color', path: `overrides.${scheme}.${name}`, detail: value })
      }
    }
  }
  const source = assembleSource(draft)
  const sizeError = checkThemeEditorSize(source)
  if (sizeError !== null) errors.push(sizeError)
  if (errors.length > 0) return { ok: false, errors: Object.freeze(errors) }
  const parsed = validateThemeFileData(source)
  if (!parsed.ok) return { ok: false, errors: Object.freeze([parsed.error]) }
  const report = validateThemeContrast(compileThemeFile(parsed.file))
  return {
    ok: true,
    source,
    file: parsed.file,
    summary: {
      failed: report.checks.filter(check => check.status === 'failed').length,
      unknown: report.checks.filter(check => check.status === 'unknown').length,
    },
  }
}
