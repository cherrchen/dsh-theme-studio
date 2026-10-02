import { describe, expect, it } from 'vitest'
import { contrastRatio, DEFAULT_CONTRAST_PAIRS, validateThemeContrast } from '../../src/client/contrast.ts'
import { BUILTIN_PRESETS } from '../../src/client/presets.ts'

describe('WCAG sRGB contrast', () => {
  it('matches black/white, identical colors and published gray/white examples', () => {
    expect(contrastRatio('#000', '#fff')).toBe(21)
    expect(contrastRatio('#fff', '#000')).toBe(21)
    expect(contrastRatio('#123456', '#123456')).toBe(1)
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.478089, 6)
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.542225, 6)
    // Low sRGB channels take the linear branch of the luminance formula.
    expect(contrastRatio('#0a0a0a', '#000')).toBeCloseTo(1 + (10 / 255 / 12.92) / 0.05, 10)
  })

  it('resolves supported RGB/hex forms, token references and var fallbacks', () => {
    expect(contrastRatio('rgb(0 0 0)', 'rgba(100%, 100%, 100%, 100%)')).toBe(21)
    expect(contrastRatio('rgb(0% 0% 0% / 100%)', '#ffff')).toBe(21)
    expect(contrastRatio('#000f', '#ffffffff')).toBe(21)
    expect(contrastRatio('var(--ink)', 'var(--missing, white)', undefined, { '--ink': 'var(--black)', '--black': '#000' })).toBe(21)
  })

  it('composites foreground alpha and requires an explicit opaque background', () => {
    const gray = contrastRatio('rgb(127.5 127.5 127.5)', 'white')
    expect(contrastRatio('rgba(0, 0, 0, 0.5)', 'white')).toBeCloseTo(gray, 10)
    expect(contrastRatio('transparent', 'white')).toBe(1)
    expect(contrastRatio('black', 'rgba(255, 255, 255, 0.5)', 'black')).toBeCloseTo(contrastRatio('black', 'rgb(127.5 127.5 127.5)'), 10)
    expect(() => contrastRatio('black', 'transparent')).toThrow('opaque backdrop')
    expect(() => contrastRatio('black', 'transparent', '#fff8')).toThrow('backdrop must be opaque')
  })

  it('mixes in sRGB with premultiplied alpha, nested mixes and weight normalization', () => {
    expect(contrastRatio('color-mix(in srgb, black, white)', 'white')).toBeCloseTo(contrastRatio('rgb(127.5 127.5 127.5)', 'white'), 10)
    expect(contrastRatio('color-mix(in srgb, black 50%, transparent)', 'white')).toBeCloseTo(contrastRatio('rgba(0,0,0,0.5)', 'white'), 10)
    expect(contrastRatio('color-mix(in srgb, white 25%, transparent)', 'black')).toBeCloseTo(contrastRatio('rgba(255,255,255,0.25)', 'black'), 10)
    expect(contrastRatio('color-mix(in srgb, white 20%, white 30%)', 'black')).toBeCloseTo(contrastRatio('rgba(255,255,255,0.5)', 'black'), 10)
    expect(contrastRatio('color-mix(in srgb, black 80%, white 80%)', 'white')).toBeCloseTo(contrastRatio('rgb(127.5 127.5 127.5)', 'white'), 10)
    expect(contrastRatio('color-mix(in srgb, color-mix(in srgb, black, white) 100%, transparent)', 'white')).toBeCloseTo(contrastRatio('rgb(127.5 127.5 127.5)', 'white'), 10)
  })

  it.each(['#ggg', '#12345', 'rgb(NaN,0,0)', 'rgb(256,0,0)', 'rgba(0,0,0,-1)', 'rgb(0 0 0 1)', 'rgb(0% ,0,0)', 'rgb(0 0 0 / 1 / 1)', 'hsl(0 0% 0%)', 'currentColor', 'color-mix(in oklab, black, white)', 'color-mix(in srgb, black 0%, white 0%)', 'var(--missing)'])('rejects unevaluable colors: %s', color => {
    expect(() => contrastRatio(color, 'white')).toThrow()
  })

  it('rejects cycles and caps nesting', () => {
    expect(() => contrastRatio('--a', 'white', undefined, { '--a': 'var(--b)', '--b': 'var(--a)' })).toThrow('cyclic')
    const nested = 'var(--absent, '.repeat(40) + 'black' + ')'.repeat(40)
    expect(() => contrastRatio(nested, 'white')).toThrow('deeply nested')
  })
})

describe('theme contrast reports', () => {
  it('evaluates both schemes and fails below the threshold without rounding', () => {
    const preset = { id: 'test', tokens: { light: { '--ink': '#777' }, dark: { '--ink': '#767676' } } }
    const report = validateThemeContrast(preset, [{ id: 'body', foreground: '--ink', background: 'white', minimum: 4.5 }])
    expect(report.passed).toBe(false)
    expect(report.checks.map(check => [check.scheme, check.status])).toEqual([['light', 'failed'], ['dark', 'passed']])
    expect(report.checks[0]?.ratio?.toFixed(1)).toBe('4.5')
    expect(Object.isFrozen(report)).toBe(true)
    expect(Object.isFrozen(report.checks)).toBe(true)
    expect(Object.isFrozen(report.checks[0])).toBe(true)
    expect(validateThemeContrast(preset, [{ id: 'large', foreground: '--ink', background: 'white', minimum: 3 }]).passed).toBe(true)
  })

  it('reports all missing/unsupported pairs as unknown and continues evaluating', () => {
    const report = validateThemeContrast({ id: 'test', tokens: { light: {}, dark: {} } }, [
      { id: 'missing', foreground: '--missing', background: 'white', minimum: 4.5 },
      { id: 'unsupported', foreground: 'currentColor', background: 'white', minimum: 4.5 },
      { id: 'valid', foreground: 'black', background: 'white', minimum: 4.5 },
    ])
    expect(report.passed).toBe(false)
    expect(report.checks.filter(check => check.status === 'unknown')).toHaveLength(4)
    expect(report.checks.filter(check => check.status === 'passed')).toHaveLength(2)
    expect(report.checks[0]).toMatchObject({ ratio: null, reason: 'missing token: --missing' })
  })

  it('rejects empty rule sets and invalid thresholds', () => {
    const preset = BUILTIN_PRESETS[0]!
    expect(() => validateThemeContrast(preset, [])).toThrow('at least one')
    for (const minimum of [NaN, Infinity, 0, 22]) {
      expect(() => validateThemeContrast(preset, [{ id: 'bad', foreground: 'black', background: 'white', minimum }])).toThrow('invalid contrast minimum')
    }
  })

  it('evaluates every builtin pair without unknowns, preserves palettes, and exposes existing failures', () => {
    const before = JSON.stringify(BUILTIN_PRESETS)
    for (const preset of BUILTIN_PRESETS) {
      const report = validateThemeContrast(preset)
      expect(report.checks).toHaveLength(DEFAULT_CONTRAST_PAIRS.length * 2)
      expect(report.checks.filter(check => check.status === 'unknown')).toEqual([])
      expect(report.checks.every(check => check.ratio !== null && check.ratio >= 1 && check.ratio <= 21)).toBe(true)
      expect(report.passed).toBe(report.checks.every(check => check.status === 'passed'))
    }
    const claude = validateThemeContrast(BUILTIN_PRESETS[0]!)
    expect(claude.checks.find(check => check.scheme === 'light' && check.id === 'link/bg-base')?.status).toBe('failed')
    expect(JSON.stringify(BUILTIN_PRESETS)).toBe(before)
  })
})
