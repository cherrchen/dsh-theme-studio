import { describe, expect, it } from 'vitest'
import { BuiltinPresetRegistry } from '../../src/client/catalog.ts'
import { BUILTIN_PRESETS } from '../../src/client/presets.ts'

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
