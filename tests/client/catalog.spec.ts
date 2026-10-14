import { describe, expect, it, vi } from 'vitest'
import { BuiltinPresetRegistry, ThemeStudioRegistry } from '../../src/client/catalog.ts'
import { BUILTIN_PRESETS } from '../../src/client/presets.ts'
import { compileThemeFile, validateThemeFileData } from '../../src/client/theme-file.ts'

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

function storedEntry(id: string, name = id) {
  const source = { version: 1, id, name, palette: { light: { ...LIGHT }, dark: { ...DARK } } }
  const parsed = validateThemeFileData(source)
  if (!parsed.ok) throw new Error('fixture did not parse')
  return { preset: compileThemeFile(parsed.file), source }
}

describe('public catalog', () => {
  it('discovers ordered themes with stable list/get snapshots and diagnostics', () => {
    const catalog = new BuiltinPresetRegistry()
    expect(catalog.list().map(theme => theme.id)).toEqual(BUILTIN_PRESETS.map(theme => theme.id))
    expect(catalog.list()).toBe(catalog.list())
    const first = catalog.list()[0]!
    expect(catalog.get(first.id)).toBe(first)
    expect(catalog.validate(first.id)).toMatchObject({ themeId: first.id, checks: expect.any(Array) })
    for (const id of ['unknown', 'default', 'light', 'dark', 'system']) {
      expect(catalog.get(id)).toBeUndefined()
      expect(catalog.validate(id)).toBeUndefined()
    }
  })

  it('takes a deeply immutable copy so consumers cannot modify runtime palettes', () => {
    const source = BUILTIN_PRESETS.map(preset => ({
      ...preset,
      tokens: { light: { ...preset.tokens.light }, dark: { ...preset.tokens.dark } },
      preview: { light: { ...preset.preview.light }, dark: { ...preset.preview.dark } },
    }))
    const catalog = new BuiltinPresetRegistry(source)
    const first = catalog.list()[0]!
    source[0]!.name = 'changed'
    source[0]!.tokens.light['--dsw-alias-bg-base'] = 'red'
    source[0]!.preview.light.background = 'red'
    source.length = 0
    expect(first).toEqual(BUILTIN_PRESETS[0])
    for (const value of [catalog, catalog.list(), first, first.tokens, first.tokens.light, first.tokens.dark, first.preview, first.preview.light, first.preview.dark]) {
      expect(Object.isFrozen(value)).toBe(true)
    }
    expect(() => { (first.tokens.light as Record<string, string>)['--dsw-alias-bg-base'] = 'red' }).toThrow()
  })

  it('rejects duplicate ids', () => {
    expect(() => new BuiltinPresetRegistry([BUILTIN_PRESETS[0]!, BUILTIN_PRESETS[0]!])).toThrow('duplicate theme id')
  })
})

describe('composite catalog', () => {
  it('lists builtins first, then imported entries in stored order', () => {
    const registry = new ThemeStudioRegistry()
    expect(registry.list().length).toBe(BUILTIN_PRESETS.length)
    registry.setImported([storedEntry('user.ocean', 'Ocean'), storedEntry('user.moss', 'Moss')])
    const ids = registry.list().map(preset => preset.id)
    expect(ids.slice(0, BUILTIN_PRESETS.length)).toEqual(BUILTIN_PRESETS.map(preset => preset.id))
    expect(ids.slice(-2)).toEqual(['user.ocean', 'user.moss'])
    expect(registry.get('user.ocean')?.name).toBe('Ocean')
    expect(registry.validate('user.ocean')?.checks.length).toBeGreaterThan(0)
    expect(registry.isImported('user.ocean')).toBe(true)
    expect(registry.isImported(BUILTIN_PRESETS[0]!.id)).toBe(false)
  })

  it('returns a frozen snapshot that changes only when the imported section does', () => {
    const registry = new ThemeStudioRegistry()
    const before = registry.list()
    expect(registry.setImported([storedEntry('user.ocean')])).toBe(true)
    const after = registry.list()
    expect(after).not.toBe(before)
    expect(Object.isFrozen(after)).toBe(true)
    expect(registry.setImported([storedEntry('user.ocean')])).toBe(false)
    expect(registry.list()).toBe(after)
  })

  it('notifies subscribers only on real imported-section changes', () => {
    const registry = new ThemeStudioRegistry()
    const listener = vi.fn()
    const off = registry.subscribe(listener)
    registry.setImported([storedEntry('user.ocean')])
    registry.setImported([storedEntry('user.ocean')])
    expect(listener).toHaveBeenCalledTimes(1)
    registry.setImported([])
    expect(listener).toHaveBeenCalledTimes(2)
    off()
    registry.setImported([storedEntry('user.moss')])
    expect(listener).toHaveBeenCalledTimes(2)
    expect(registry.revision).toBe(3)
  })

  it('drops imported entries colliding with a builtin id', () => {
    const registry = new ThemeStudioRegistry()
    const clashing = storedEntry('user.shadow')
    const asBuiltin = { ...clashing, preset: { ...clashing.preset, id: BUILTIN_PRESETS[0]!.id }, source: { ...clashing.source, id: BUILTIN_PRESETS[0]!.id } }
    expect(registry.setImported([asBuiltin])).toBe(false)
    expect(registry.isImported(BUILTIN_PRESETS[0]!.id)).toBe(false)
  })

  it('overwrites a later duplicate imported id in place', () => {
    const registry = new ThemeStudioRegistry()
    registry.setImported([storedEntry('user.ocean', 'V1'), storedEntry('user.ocean', 'V2')])
    expect(registry.get('user.ocean')?.name).toBe('V2')
    expect(registry.list().filter(preset => preset.id === 'user.ocean')).toHaveLength(1)
  })

  it('exposes the verbatim stored source for re-export and keeps it immutable', () => {
    const registry = new ThemeStudioRegistry()
    const entry = storedEntry('user.ocean', 'Ocean')
    registry.setImported([entry])
    expect(registry.sourceOf('user.ocean')).toEqual(entry.source)
    expect(registry.importedEntries()[0]!.preset.name).toBe('Ocean')
    const preset = registry.get('user.ocean')!
    expect(Object.isFrozen(preset.tokens.light)).toBe(true)
    expect(() => { (preset.tokens.light as Record<string, string>)['x'] = 'y' }).toThrow()
  })
})
