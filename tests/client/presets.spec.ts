// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { BuiltinPresetRegistry } from '../../src/client/catalog.ts'
import { BUILTIN_PRESETS } from '../../src/client/presets.ts'
import { NAME_KEYS } from '../../src/client/ThemeStudioRow.tsx'
import { STAGE1_TOKENS } from '../../src/client/types.ts'

const MUST_IDS = [
  'dsh-theme-studio.claude',
  'dsh-theme-studio.codex',
  'dsh-theme-studio.claude-cream',
] as const

describe('BUILTIN_PRESETS', () => {
  it('includes the three must-add palettes at the front of list() order', () => {
    const ids = new BuiltinPresetRegistry().list().map(preset => preset.id)
    expect(ids.slice(0, 4)).toEqual([
      'dsh-theme-studio.claude',
      'dsh-theme-studio.codex',
      'dsh-theme-studio.claude-cream',
      'dsh-theme-studio.graphite',
    ])
    for (const id of MUST_IDS) {
      expect(BUILTIN_PRESETS.some(preset => preset.id === id)).toBe(true)
    }
  })

  it('gives every preset light and dark palettes covering STAGE1_TOKENS', () => {
    for (const preset of BUILTIN_PRESETS) {
      for (const scheme of ['light', 'dark'] as const) {
        for (const token of STAGE1_TOKENS) {
          expect(preset.tokens[scheme][token]).toEqual(expect.any(String))
        }
      }
    }
  })

  it('locks must-add brand, bgBase, and sidebar values', () => {
    const claude = BUILTIN_PRESETS.find(preset => preset.id === 'dsh-theme-studio.claude')!
    expect(claude.tokens.light['--dsw-alias-brand-primary']).toBe('#D97757')
    expect(claude.tokens.light['--dsw-alias-bg-base']).toBe('#FAF9F5')
    expect(claude.tokens.light['--dsw-specific-sidebar-fill']).toBe('#F0EEE6')
    expect(claude.tokens.dark['--dsw-alias-brand-primary']).toBe('#D97757')
    expect(claude.tokens.dark['--dsw-alias-bg-base']).toBe('#1F1E1D')
    expect(claude.tokens.dark['--dsw-specific-sidebar-fill']).toBe('#141413')

    const codex = BUILTIN_PRESETS.find(preset => preset.id === 'dsh-theme-studio.codex')!
    expect(codex.tokens.light['--dsw-alias-brand-primary']).toBe('#0285FF')
    expect(codex.tokens.light['--dsw-alias-bg-base']).toBe('#FFFFFF')
    expect(codex.tokens.light['--dsw-specific-sidebar-fill']).toBe('#F5F6F7')
    expect(codex.tokens.dark['--dsw-alias-brand-primary']).toBe('#339CFF')
    expect(codex.tokens.dark['--dsw-alias-bg-base']).toBe('#181818')
    expect(codex.tokens.dark['--dsw-specific-sidebar-fill']).toBe('#141414')

    const cream = BUILTIN_PRESETS.find(preset => preset.id === 'dsh-theme-studio.claude-cream')!
    expect(cream.tokens.light['--dsw-alias-brand-primary']).toBe('#B7791F')
    expect(cream.tokens.light['--dsw-alias-bg-base']).toBe('#F5F3E9')
    expect(cream.tokens.light['--dsw-specific-sidebar-fill']).toBe('#F0EEE6')
    expect(cream.tokens.dark['--dsw-alias-brand-primary']).toBe('#E6BF7A')
    expect(cream.tokens.dark['--dsw-alias-bg-base']).toBe('#2D2E2D')
    expect(cream.tokens.dark['--dsw-specific-sidebar-fill']).toBe('#242524')
  })

  it('covers every builtin id in NAME_KEYS so the preview bar does not fall back to Default', () => {
    for (const preset of BUILTIN_PRESETS) {
      expect(NAME_KEYS[preset.id]).toBe(`${preset.id.replace(/^dsh-theme-studio\./, '')}.name`)
    }
  })
})
