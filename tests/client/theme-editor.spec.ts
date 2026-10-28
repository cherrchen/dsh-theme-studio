import { describe, expect, it } from 'vitest'
import { baseAliasTokens, deriveChrome } from '../../src/client/chrome-tokens.ts'
import { BUILTIN_PRESETS } from '../../src/client/presets.ts'
import {
  checkThemeEditorSize, createThemeEditorDraft, editorTokenCategories, editorTokenGroups, editorTokenNames,
  themeEditorId, validateThemeEditor, type ThemeEditorDraft,
} from '../../src/client/theme-editor.ts'
import { en, zh, type ThemeStudioKey } from '../../src/client/locales.ts'
import {
  compileThemeFile, parseThemeFile, serializeThemeFile, validateThemeFileData, THEME_FILE_MAX_LENGTH,
  type DshThemeFile,
} from '../../src/client/theme-file.ts'

const LIGHT = {
  bgBase: '#f4f8fb', bgLayer1: '#ffffff', bgLayer2: '#eef3f7', bgOverlay: '#ffffff',
  borderL1: '#d7e0e8', borderL2: '#c3d0da', brand: '#2b6cb0',
  labelPrimary: '#1b2a3a', labelSecondary: '#51606f',
  error: '#b3282d', success: '#22793d', warn: '#975a16', sidebar: '#eef3f7',
}
const DARK = {
  bgBase: '#101820', bgLayer1: '#1a2430', bgLayer2: '#223040', bgOverlay: '#101820',
  borderL1: '#2c3c4e', borderL2: '#3a4d63', brand: '#63a4d8',
  labelPrimary: '#e6edf3', labelSecondary: '#9fb0bf',
  error: '#f0838a', success: '#6cc596', warn: '#e0b56a', sidebar: '#1a2430',
}

function importedEntry(over: Record<string, unknown> = {}) {
  const source = {
    version: 1, id: 'user.ocean', name: 'Ocean',
    palette: { light: { ...LIGHT }, dark: { ...DARK } },
    ...over,
  }
  const parsed = validateThemeFileData(source)
  if (!parsed.ok) throw new Error('fixture did not parse')
  return { preset: compileThemeFile(parsed.file), file: parsed.file }
}

function editing(draft: ThemeEditorDraft, over: Partial<ThemeEditorDraft> = {}): ThemeEditorDraft {
  return { ...draft, name: 'Copy', id: 'user.copy', ...over }
}

function derivedTokens(palette: typeof LIGHT): Readonly<Record<string, string>> {
  return { ...deriveChrome(palette), ...baseAliasTokens(palette) }
}

describe('editor token surface', () => {
  it('exposes the compiled preset keys verbatim and groups each key once', () => {
    const names = editorTokenNames()
    expect(names).toEqual(Object.keys(BUILTIN_PRESETS[0]!.tokens.light))
    expect(names).toHaveLength(152)
    const groups = editorTokenGroups()
    const grouped = groups.flatMap(group => group.tokens.map(token => ({ prefix: group.prefix, token })))
    expect(grouped).toHaveLength(names.length)
    expect(new Set(grouped.map(entry => entry.token))).toEqual(new Set(names))
    for (const group of groups) {
      for (const token of group.tokens) expect(token.startsWith(group.prefix)).toBe(true)
    }
    expect(groups.map(group => group.prefix)).toContain('--dsw-alias-')
    expect(groups.map(group => group.prefix)).toContain('--shiki-token-')
  })

  it('exposes a two-level category tree covering each editable token exactly once', () => {
    const categories = editorTokenCategories()
    expect(categories.map(cat => cat.prefix)).toEqual([
      '--dsw-alias', '--dsw-specific', '--dsw-static', '--shiki-token', '--dsw-focus', '--dsw-menu',
    ])
    const flat = categories.flatMap(cat => cat.groups.flatMap(group => group.tokens))
    expect(new Set(flat)).toEqual(new Set(editorTokenNames()))
    expect(flat).toHaveLength(editorTokenNames().length)
    for (const cat of categories) {
      for (const group of cat.groups) {
        expect(group.tokens.length).toBeGreaterThan(0)
        for (const token of group.tokens) expect(token.startsWith(group.prefix)).toBe(true)
      }
    }
  })

  it('provides a bilingual usage note for every editable token', () => {
    for (const name of editorTokenNames()) {
      const key = `token.${name}` as ThemeStudioKey
      expect(zh[key]?.trim().length).toBeGreaterThan(0)
      expect(en[key]?.trim().length).toBeGreaterThan(0)
    }
  })
})

describe('editor draft and diff', () => {
  it('creates a builtin draft with a valid user-prefixed file snapshot', () => {
    const preset = BUILTIN_PRESETS[0]!
    const draft = createThemeEditorDraft(preset)
    expect(draft.baseId).toBe(preset.id)
    expect(draft.name).toBe('')
    expect(draft.id).toBe('user.theme')
    expect(draft.idEdited).toBe(false)
    expect(draft.description).toBe(preset.description)
    expect(draft.author).toBe('')
    expect(draft.base.version).toBe(1)
    expect(draft.base.id.startsWith('user.')).toBe(true)
    expect(validateThemeFileData(draft.base).ok).toBe(true)
    expect(Object.keys(draft.values.light)).toEqual([...editorTokenNames()])
    expect(draft.values.light['--dsw-alias-bg-base']).toBe(preset.tokens.light['--dsw-alias-bg-base'])
    expect(Object.isFrozen(draft.base.palette.light)).toBe(true)
    expect(Object.isFrozen(draft.values.light)).toBe(true)
  })

  it('copies the imported base and carries raw var/mix override text', () => {
    const { preset, file } = importedEntry({
      description: 'Blue.', author: 'tester',
      overrides: {
        light: {
          '--dsw-alias-brand-primary': 'var(--dsh-custom-accent)',
          '--dsh-custom-accent': 'color-mix(in srgb, #2b6cb0 60%, #ffffff)',
        },
        dark: {
          '--dsw-alias-brand-primary': 'var(--dsh-custom-accent)',
          '--dsh-custom-accent': 'color-mix(in srgb, #63a4d8 60%, #000000)',
        },
      },
    })
    const raw = JSON.parse(JSON.stringify(file)) as DshThemeFile
    const draft = createThemeEditorDraft(preset, raw)
    expect(draft.description).toBe('Blue.')
    expect(draft.author).toBe('tester')
    expect(draft.values.light['--dsw-alias-brand-primary']).toBe('var(--dsh-custom-accent)')
    expect(draft.values.dark['--dsw-alias-brand-primary']).toBe('var(--dsh-custom-accent)')
    expect(Object.keys(draft.values.light)).not.toContain('--dsh-custom-accent')
    ;(raw.palette.light as Record<string, string>)['bgBase'] = '#000000'
    ;((raw.overrides as { light: Record<string, string> }).light)['--dsh-custom-accent'] = '#000000'
    expect(draft.base.palette.light.bgBase).toBe('#f4f8fb')
    expect(draft.base.overrides?.light?.['--dsh-custom-accent']).toBe('color-mix(in srgb, #2b6cb0 60%, #ffffff)')
  })

  it('emits both schemes when only one scheme differs from the derived baseline', () => {
    const { preset, file } = importedEntry()
    const draft = createThemeEditorDraft(preset, file)
    const result = validateThemeEditor(editing(draft, {
      values: {
        light: { ...draft.values.light, '--dsw-alias-bg-base': '#000001' },
        dark: draft.values.dark,
      },
    }), new Set())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const overrides = result.source['overrides'] as { light: Record<string, string>; dark: Record<string, string> }
    expect(overrides.light['--dsw-alias-bg-base']).toBe('#000001')
    expect(overrides.dark['--dsw-alias-bg-base']).toBe('#101820')
    expect(Object.keys(overrides.light)).toEqual(['--dsw-alias-bg-base'])
    expect(Object.keys(overrides.dark)).toEqual(['--dsw-alias-bg-base'])
  })

  it('drops an in-surface override restored to the palette-derived value', () => {
    const { preset, file } = importedEntry({
      overrides: {
        light: { '--dsw-alias-bg-base': '#123123' },
        dark: { '--dsw-alias-bg-base': '#123123' },
      },
    })
    const draft = createThemeEditorDraft(preset, file)
    expect(draft.values.light['--dsw-alias-bg-base']).toBe('#123123')
    const result = validateThemeEditor(editing(draft, {
      values: {
        light: { ...draft.values.light, '--dsw-alias-bg-base': derivedTokens(LIGHT)['--dsw-alias-bg-base']! },
        dark: { ...draft.values.dark, '--dsw-alias-bg-base': derivedTokens(DARK)['--dsw-alias-bg-base']! },
      },
    }), new Set())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.source['overrides']).toBeUndefined()
  })

  it('omits a redundant in-surface base override equal to the derived value', () => {
    const { preset, file } = importedEntry({
      overrides: {
        light: { '--dsw-alias-bg-base': '#f4f8fb' },
        dark: { '--dsw-alias-bg-base': '#101820' },
      },
    })
    const result = validateThemeEditor(editing(createThemeEditorDraft(preset, file)), new Set())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.source['overrides']).toBeUndefined()
  })

  it('preserves every off-surface base override verbatim in both schemes', () => {
    const { preset, file } = importedEntry({
      overrides: {
        light: {
          '--dsh-custom-var': '#123456',
          '--dsh-chain': 'var(--dsw-alias-bg-base)',
          '--dsw-static-neutral-00': '#fefefe',
          '--dsw-alias-future-token': 'color-mix(in srgb, #2b6cb0 20%, #ffffff)',
          '--shiki-token-future': '#a1b2c3',
        },
        dark: {
          '--dsh-custom-var': '#654321',
          '--dsh-chain': 'var(--dsw-alias-bg-base)',
          '--dsw-static-neutral-00': '#0f0f0f',
          '--dsw-alias-future-token': 'color-mix(in srgb, #63a4d8 20%, #000000)',
          '--shiki-token-future': '#c3b2a1',
        },
      },
    })
    const result = validateThemeEditor(editing(createThemeEditorDraft(preset, file)), new Set())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const overrides = result.source['overrides'] as { light: Record<string, string>; dark: Record<string, string> }
    expect(overrides.light).toEqual({
      '--dsh-custom-var': '#123456',
      '--dsh-chain': 'var(--dsw-alias-bg-base)',
      '--dsw-static-neutral-00': '#fefefe',
      '--dsw-alias-future-token': 'color-mix(in srgb, #2b6cb0 20%, #ffffff)',
      '--shiki-token-future': '#a1b2c3',
    })
    expect(overrides.dark).toEqual({
      '--dsh-custom-var': '#654321',
      '--dsh-chain': 'var(--dsw-alias-bg-base)',
      '--dsw-static-neutral-00': '#0f0f0f',
      '--dsw-alias-future-token': 'color-mix(in srgb, #63a4d8 20%, #000000)',
      '--shiki-token-future': '#c3b2a1',
    })
  })

  it('compiles a rename-only draft to the base token maps without mutating the base', () => {
    const { preset, file } = importedEntry({
      overrides: {
        light: {
          '--dsh-custom-var': 'var(--dsw-alias-bg-base)',
          '--dsw-alias-brand-primary': '#0000ff',
        },
        dark: {
          '--dsh-custom-var': 'var(--dsw-alias-bg-base)',
          '--dsw-alias-brand-primary': '#00ffff',
        },
      },
    })
    const draft = createThemeEditorDraft(preset, file)
    const baseSnapshot = JSON.stringify(draft.base)
    const result = validateThemeEditor(editing(draft), new Set())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const baseCompiled = compileThemeFile(draft.base)
    const rebuilt = compileThemeFile(result.file)
    expect(rebuilt.tokens.light).toEqual(baseCompiled.tokens.light)
    expect(rebuilt.tokens.dark).toEqual(baseCompiled.tokens.dark)
    expect(result.file.palette).toEqual(draft.base.palette)
    expect(JSON.stringify(draft.base)).toBe(baseSnapshot)
  })

  it.each(BUILTIN_PRESETS.map((preset, index) => [preset.id, index] as const))(
    'rebuilds builtin %s without edits',
    (_id, index) => {
      const preset = BUILTIN_PRESETS[index]!
      const draft = editing(createThemeEditorDraft(preset), { name: preset.name, id: `user.builtin-${index}` })
      const result = validateThemeEditor(draft, new Set())
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const rebuilt = compileThemeFile(result.file)
      expect(rebuilt.tokens.light).toEqual(preset.tokens.light)
      expect(rebuilt.tokens.dark).toEqual(preset.tokens.dark)
      expect(rebuilt.palette).toEqual(preset.palette)
    },
  )
})

describe('editor id generation', () => {
  it('slugs ASCII names, falls back on non-ASCII, and de-dupes', () => {
    expect(themeEditorId('My Cool Theme!', new Set())).toBe('user.my-cool-theme')
    expect(themeEditorId('  --Odd__Name--  ', new Set())).toBe('user.odd-name')
    expect(themeEditorId('深色主题', new Set())).toBe('user.theme')
    expect(themeEditorId('', new Set())).toBe('user.theme')
    expect(themeEditorId('My Cool Theme!', new Set(['user.my-cool-theme']))).toBe('user.my-cool-theme-2')
    expect(themeEditorId('My Cool Theme!', new Set(['user.my-cool-theme', 'user.my-cool-theme-2'])))
      .toBe('user.my-cool-theme-3')
  })

  it('truncates generated ids to 64 characters and stays valid', () => {
    const id = themeEditorId(`a${'b'.repeat(100)}`, new Set())
    expect(id.length).toBeLessThanOrEqual(64)
    expect(id).toBe(`user.a${'b'.repeat(58)}`)
    const taken = themeEditorId(`a${'b'.repeat(100)}`, new Set([id]))
    expect(taken).not.toBe(id)
    expect(taken.length).toBeLessThanOrEqual(64)
    const { file } = importedEntry()
    expect(validateThemeFileData({ ...file, id: taken }).ok).toBe(true)
  })
})

describe('editor validation', () => {
  it('collects name, id, and every invalid color in one result', () => {
    const { preset, file } = importedEntry()
    const draft = createThemeEditorDraft(preset, file)
    const result = validateThemeEditor({
      ...draft,
      name: '   ',
      id: 'Bad ID',
      values: {
        light: { ...draft.values.light, '--dsw-alias-bg-base': 'hsl(0 0% 0%)', '--shiki-token-keyword': '--bare' },
        dark: { ...draft.values.dark, '--dsw-alias-bg-base': 'notacolor' },
      },
    }, new Set())
    expect(result.ok).toBe(false)
    if (result.ok) return
    const codes = result.errors.map(error => error.code)
    expect(codes).toContain('missing-name')
    expect(codes).toContain('invalid-id')
    expect(result.errors.filter(error => error.code === 'invalid-color')).toHaveLength(3)
    const paths = result.errors.map(error => error.path)
    expect(paths).toContain('overrides.light.--dsw-alias-bg-base')
    expect(paths).toContain('overrides.light.--shiki-token-keyword')
    expect(paths).toContain('overrides.dark.--dsw-alias-bg-base')
  })

  it('rejects reserved, builtin-prefixed, overlong, and taken ids', () => {
    const { preset, file } = importedEntry()
    const draft = editing(createThemeEditorDraft(preset, file))
    for (const [id, code] of [
      ['default', 'reserved-id'],
      ['light', 'reserved-id'],
      ['dsh-theme-studio.mine', 'builtin-id'],
      ['x'.repeat(65), 'invalid-id'],
      ['UPPER', 'invalid-id'],
    ] as const) {
      const result = validateThemeEditor({ ...draft, id }, new Set())
      expect(result.ok).toBe(false)
      if (result.ok) continue
      expect(result.errors.map(error => error.code)).toContain(code)
    }
    const taken = validateThemeEditor({ ...draft, id: 'user.copy' }, new Set(['user.copy']))
    expect(taken.ok).toBe(false)
    if (taken.ok) return
    expect(taken.errors).toEqual([{ code: 'id-taken', path: 'id', detail: 'user.copy' }])
  })

  it('accepts a candidate at the exact serialized size boundary', () => {
    const { preset, file } = importedEntry()
    const draft = editing(createThemeEditorDraft(preset, file), { description: 'pad' })
    const first = validateThemeEditor(draft, new Set())
    expect(first.ok).toBe(true)
    if (!first.ok) return
    const gap = THEME_FILE_MAX_LENGTH - serializeThemeFile(first.source).length
    const padded = validateThemeEditor({ ...draft, description: `pad${'x'.repeat(gap)}` }, new Set())
    expect(padded.ok).toBe(true)
    if (!padded.ok) return
    const text = serializeThemeFile(padded.source)
    expect(text.length).toBe(THEME_FILE_MAX_LENGTH)
    expect(new TextEncoder().encode(text).length).toBe(THEME_FILE_MAX_LENGTH)
    const reparsed = parseThemeFile(text)
    expect(reparsed.ok).toBe(true)
  })

  it('rejects one char over the limit and multibyte UTF-8 overflow with an actionable path', () => {
    const { preset, file } = importedEntry()
    const draft = editing(createThemeEditorDraft(preset, file), { description: 'pad' })
    const first = validateThemeEditor(draft, new Set())
    if (!first.ok) throw new Error('fixture did not validate')
    const gap = THEME_FILE_MAX_LENGTH - serializeThemeFile(first.source).length
    const over = validateThemeEditor({ ...draft, description: `pad${'x'.repeat(gap + 1)}` }, new Set())
    expect(over.ok).toBe(false)
    if (over.ok) return
    const tooLarge = over.errors.find(error => error.code === 'too-large')
    expect(tooLarge?.path).toBe('description')
    expect(tooLarge?.detail).toContain('UTF-16')
    expect(tooLarge?.detail).toContain('UTF-8')
    expect(tooLarge?.detail).toContain('largest contribution')
    const wide = validateThemeEditor({ ...draft, description: '中'.repeat(gap) }, new Set())
    expect(wide.ok).toBe(false)
    if (wide.ok) return
    expect(wide.errors.map(error => error.code)).toContain('too-large')
  })

  it('round-trips a candidate carrying a long legal nested var fallback', () => {
    const { preset, file } = importedEntry()
    const draft = createThemeEditorDraft(preset, file)
    const nested = `${'var(--dsh-absent-token, '.repeat(10)}#ffffff${')'.repeat(10)}`
    const edited = editing(draft, {
      values: {
        light: { ...draft.values.light, '--dsw-alias-brand-primary': nested },
        dark: { ...draft.values.dark, '--dsw-alias-brand-primary': nested },
      },
    })
    const result = validateThemeEditor(edited, new Set())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const reparsed = parseThemeFile(serializeThemeFile(result.source))
    expect(reparsed.ok).toBe(true)
    if (!reparsed.ok) return
    expect(reparsed.file.overrides?.light?.['--dsw-alias-brand-primary']).toBe(nested)
  })

  it('reports contrast failures and unknowns without blocking the save', () => {
    const { preset, file } = importedEntry()
    const draft = createThemeEditorDraft(preset, file)
    const result = validateThemeEditor(editing(draft, {
      values: {
        light: {
          ...draft.values.light,
          '--dsw-alias-label-primary': '#f4f8fb',
          '--dsw-alias-link': 'var(--dsh-nothing)',
        },
        dark: {
          ...draft.values.dark,
          '--dsw-alias-label-primary': '#101820',
          '--dsw-alias-link': 'var(--dsh-nothing)',
        },
      },
    }), new Set())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.summary.failed).toBeGreaterThan(0)
    expect(result.summary.unknown).toBeGreaterThan(0)
  })

  it('flags an immutable palette-dominated oversized file as a source issue', () => {
    const huge = {
      version: 1, id: 'user.ocean', name: 'Ocean',
      palette: { light: { ...LIGHT, bgBase: `#${'1'.repeat(THEME_FILE_MAX_LENGTH)}` }, dark: { ...DARK } },
    }
    const error = checkThemeEditorSize(huge)
    expect(error?.code).toBe('too-large')
    expect(error?.path).toBe('source')
  })
})
