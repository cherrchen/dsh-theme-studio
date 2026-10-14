import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import Ajv from 'ajv/dist/2020.js'
import { describe, expect, it } from 'vitest'
import { BUILTIN_PRESETS } from '../../src/client/presets.ts'
import {
  compileThemeFile, parseThemeFile, parseStoredThemeFiles, serializeThemeFile, themeFileForPreset,
  themeFileName, uniqueThemeId, validateThemeFileData, THEME_FILE_MAX_LENGTH,
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

function validFile(over: Record<string, unknown> = {}): Record<string, unknown> {
  return { id: 'user.ocean', name: 'Ocean', palette: { light: { ...LIGHT }, dark: { ...DARK } }, ...over }
}

function codeOf(text: string | Record<string, unknown>): string | undefined {
  const parsed = typeof text === 'string' ? parseThemeFile(text) : validateThemeFileData(text)
  return parsed.ok ? undefined : parsed.error.code
}

describe('dsh-theme.json v1 parser', () => {
  it('accepts a minimal palette-only file', () => {
    const parsed = parseThemeFile(JSON.stringify(validFile()))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.file).toMatchObject({ version: 1, id: 'user.ocean', name: 'Ocean' })
    expect(parsed.file.palette.light.brand).toBe('#2b6cb0')
    expect(parsed.source).toBeDefined()
  })

  it('defaults a missing version to 1 and tolerates $schema metadata', () => {
    const parsed = validateThemeFileData(validFile({ $schema: './dsh-theme.schema.json' }))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.file.version).toBe(1)
    expect(parsed.source['$schema']).toBe('./dsh-theme.schema.json')
  })

  it('rejects unknown top-level fields such as preview', () => {
    expect(codeOf(validFile({ preview: { light: {} } }))).toBe('unknown-field')
    expect(codeOf(validFile({ 'x-future': true }))).toBe('unknown-field')
  })

  it('rejects non-JSON text, arrays, and oversized input', () => {
    expect(codeOf('{')).toBe('not-json')
    expect(codeOf('[1]')).toBe('not-object')
    expect(codeOf('42')).toBe('not-object')
    expect(codeOf(`{"a":"${'x'.repeat(THEME_FILE_MAX_LENGTH)}`)).toBe('too-large')
  })

  it('rejects versions other than 1', () => {
    expect(codeOf(validFile({ version: 2 }))).toBe('unsupported-version')
    expect(codeOf(validFile({ version: '1' }))).toBe('unsupported-version')
  })

  it('rejects malformed, reserved, and builtin-namespace ids', () => {
    expect(codeOf(validFile({ id: 'Ocean' }))).toBe('invalid-id')
    expect(codeOf(validFile({ id: 'user.ocean!' }))).toBe('invalid-id')
    expect(codeOf(validFile({ id: '' }))).toBe('invalid-id')
    expect(codeOf(validFile({ id: 'x'.repeat(65) }))).toBe('invalid-id')
    for (const id of ['default', 'light', 'dark', 'system']) {
      expect(codeOf(validFile({ id }))).toBe('reserved-id')
    }
    expect(codeOf(validFile({ id: 'dsh-theme-studio.mine' }))).toBe('builtin-id')
  })

  it('rejects a missing or blank name and non-string metadata', () => {
    const noName = validFile()
    delete noName['name']
    expect(codeOf(noName)).toBe('missing-name')
    expect(codeOf(validFile({ name: '  ' }))).toBe('missing-name')
    expect(codeOf(validFile({ name: { zh: '海' } }))).toBe('missing-name')
    expect(codeOf(validFile({ description: 3 }))).toBe('invalid-metadata')
    expect(codeOf(validFile({ author: ['a'] }))).toBe('invalid-metadata')
  })

  it('rejects missing, extra, or non-string palette fields', () => {
    const missing = validFile()
    delete (missing['palette'] as Record<string, unknown>)['light']
    expect(codeOf(missing)).toBe('invalid-palette')
    expect(codeOf(validFile({ palette: { light: LIGHT, dark: { ...DARK, extra: '#fff' } } })))
      .toBe('invalid-palette')
    expect(codeOf(validFile({ palette: { light: { ...LIGHT, brand: 3 }, dark: DARK } })))
      .toBe('invalid-palette')
    expect(codeOf(validFile({ palette: { light: LIGHT, dark: DARK, sepia: LIGHT } })))
      .toBe('invalid-palette')
  })

  it('rejects unsupported color syntax in palette and overrides', () => {
    expect(codeOf(validFile({ palette: { light: { ...LIGHT, brand: 'hsl(0,0%,0%)' }, dark: DARK } })))
      .toBe('invalid-color')
    expect(codeOf(validFile({ palette: { light: { ...LIGHT, brand: '--other' }, dark: DARK } })))
      .toBe('invalid-color')
    const bad = validFile({
      overrides: { light: { '--dsw-alias-bg-base': 'notacolor' }, dark: { '--dsw-alias-bg-base': 'notacolor' } },
    })
    expect(codeOf(bad)).toBe('invalid-color')
  })

  it('accepts the resolver color subset in palette and overrides', () => {
    const file = validFile({
      palette: {
        light: { ...LIGHT, brand: 'rgb(43, 108, 176)', bgLayer2: 'color-mix(in srgb, #fff 80%, black)' },
        dark: { ...DARK, sidebar: 'rgba(26, 36, 48, 0.9)', labelSecondary: 'var(--dsw-alias-label-secondary, #999)' },
      },
      overrides: {
        light: { '--shiki-token-keyword': '#9a2c9a', '--dsw-alias-brand-primary': 'rgb(1 2 3 / 50%)' },
        dark: { '--shiki-token-keyword': '#d8a0d8', '--dsw-alias-brand-primary': 'transparent' },
      },
    })
    const parsed = validateThemeFileData(file)
    expect(parsed.ok).toBe(true)
  })

  it('rejects override token names outside the allowed prefixes and font tokens', () => {
    for (const name of ['--proto__', 'bgBase', '--x-thing', '--dsh-font-family-text', '--dsw-font-family', '--dsh-content-font-size']) {
      expect(codeOf(validFile({ overrides: { light: { [name]: '#fff' }, dark: { [name]: '#fff' } } })), name)
        .toBe('invalid-override-name')
    }
  })

  it('rejects asymmetric light/dark override key sets', () => {
    expect(codeOf(validFile({
      overrides: { light: { '--shiki-token-keyword': '#fff' }, dark: {} },
    }))).toBe('invalid-override-shape')
    expect(codeOf(validFile({ overrides: { light: { '--shiki-token-keyword': '#fff' } } })))
      .toBe('invalid-override-shape')
    expect(codeOf(validFile({ overrides: 'no' }))).toBe('invalid-override-shape')
    expect(codeOf(validFile({ overrides: { sepia: {} } }))).toBe('invalid-override-shape')
  })

  it('compiles a file into a preset whose tokens override derived chrome', () => {
    const parsed = parseThemeFile(JSON.stringify(validFile({
      overrides: {
        light: { '--shiki-token-keyword': '#9a2c9a' },
        dark: { '--shiki-token-keyword': '#d8a0d8' },
      },
    })))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const preset = compileThemeFile(parsed.file)
    expect(preset.id).toBe('user.ocean')
    expect(preset.tokens.light['--dsw-alias-bg-base']).toBe('#f4f8fb')
    expect(preset.tokens.light['--shiki-token-keyword']).toBe('#9a2c9a')
    expect(preset.tokens.dark['--shiki-token-keyword']).toBe('#d8a0d8')
    expect(preset.preview.light.background).toBe('#f4f8fb')
    expect(Object.keys(preset.tokens.light)).toEqual(Object.keys(preset.tokens.dark))
    expect(Object.isFrozen(preset.tokens.light)).toBe(true)
    expect(Object.isFrozen(preset)).toBe(true)
  })

  it('round-trips a builtin preset through the palette file shape', () => {
    const preset = BUILTIN_PRESETS[0]!
    const file = themeFileForPreset(preset)
    expect(file['id']).toBe(`user.${preset.id.replace('dsh-theme-studio.', '')}`)
    const reparsed = validateThemeFileData(JSON.parse(serializeThemeFile(file)))
    expect(reparsed.ok).toBe(true)
    if (!reparsed.ok) return
    const rebuilt = compileThemeFile(reparsed.file)
    expect(rebuilt.tokens.light).toEqual(preset.tokens.light)
    expect(rebuilt.tokens.dark).toEqual(preset.tokens.dark)
    expect(rebuilt.preview).toEqual(preset.preview)
  })

  it('serializes a stored source verbatim so import→export round-trips', () => {
    const source = validFile({ $schema: './dsh-theme.schema.json', author: 'tester' })
    const text = serializeThemeFile(source)
    expect(JSON.parse(text)).toEqual(source)
  })

  it('names downloads and finds collision-free ids', () => {
    expect(themeFileName('user.ocean')).toBe('user.ocean.dsh-theme.json')
    expect(uniqueThemeId('user.ocean', new Set())).toBe('user.ocean')
    expect(uniqueThemeId('user.ocean', new Set(['user.ocean', 'user.ocean-2']))).toBe('user.ocean-3')
  })

  it('parses a stored list and counts unreadable entries without throwing', () => {
    const stored = parseStoredThemeFiles([validFile(), { id: 'X' }, 'junk', validFile({ id: 'user.moss', name: 'Moss' })])
    expect(stored.dropped).toBe(2)
    expect(stored.entries.map(entry => entry.preset.id)).toEqual(['user.ocean', 'user.moss'])
    expect(parseStoredThemeFiles(undefined)).toEqual({ entries: [], dropped: 0 })
    expect(parseStoredThemeFiles('nope')).toEqual({ entries: [], dropped: 1 })
  })
})

describe('dsh-theme.schema.json agreement', () => {
  const schema = JSON.parse(readFileSync(
    fileURLToPath(new URL('../../schemas/dsh-theme.schema.json', import.meta.url)), 'utf8',
  ))
  const ajv = new Ajv({ allErrors: true, strict: false })
  const validate = ajv.compile<Record<string, unknown>>(schema)

  it('accepts every file the TypeScript parser accepts in the fixture corpus', () => {
    const files = [
      validFile(),
      validFile({ version: 1, description: 'd', author: 'a' }),
      validFile({
        palette: {
          light: { ...LIGHT, brand: 'rgb(1,2,3)', bgLayer2: 'var(--dsw-alias-bg-base, #fff)' },
          dark: { ...DARK, sidebar: 'color-mix(in srgb, #000 50%, white)', warn: '#abc9' },
        },
        overrides: {
          light: { '--shiki-token-keyword': '#9a2c9a', '--dsw-alias-brand-primary': '#123456' },
          dark: { '--shiki-token-keyword': '#d8a0d8', '--dsw-alias-brand-primary': 'transparent' },
        },
      }),
      validFile({ $schema: 'https://example.invalid/dsh-theme.schema.json' }),
      themeFileForPreset(BUILTIN_PRESETS[0]!),
    ]
    for (const file of files) {
      expect(validateThemeFileData(file).ok, JSON.stringify(file)).toBe(true)
      expect(validate(file), JSON.stringify(validate.errors)).toBe(true)
    }
  })

  it('rejects every structurally invalid file the parser rejects', () => {
    const files = [
      'junk',
      42,
      validFile({ version: 2 }),
      validFile({ id: 'Bad' }),
      validFile({ id: 'default' }),
      validFile({ id: 'dsh-theme-studio.mine' }),
      validFile({ name: 3 }),
      validFile({ palette: { light: LIGHT } }),
      validFile({ palette: { light: { ...LIGHT, brand: 7 }, dark: DARK } }),
      validFile({ palette: { light: { ...LIGHT, bonus: '#fff' }, dark: DARK } }),
      validFile({ preview: { light: {} } }),
      validFile({ overrides: { light: { '--x-nope': '#fff' }, dark: { '--x-nope': '#fff' } } }),
      validFile({ overrides: { light: { '--dsh-font-family-text': 'X' }, dark: { '--dsh-font-family-text': 'X' } } }),
      validFile({ overrides: { light: { '--proto__': '#fff' }, dark: { '--proto__': '#fff' } } }),
      validFile({ overrides: { light: { '--dsw-alias-bg-base': 9 }, dark: { '--dsw-alias-bg-base': 9 } } }),
    ]
    for (const file of files) {
      expect(validateThemeFileData(file).ok, JSON.stringify(file)).toBe(false)
      expect(validate(file), JSON.stringify(file)).toBe(false)
    }
  })

  it('documents that overrides key symmetry is parser-enforced', () => {
    // JSON Schema cannot express "light and dark carry the same key set";
    // the schema may accept shapes the parser still rejects.
    const file = validFile({ overrides: { light: { '--dsw-alias-bg-base': '#fff' }, dark: {} } })
    expect(validateThemeFileData(file).ok).toBe(false)
  })
})
