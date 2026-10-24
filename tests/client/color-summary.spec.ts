import { describe, expect, it } from 'vitest'
import { summarizeColorValue } from '../../src/client/color-summary.ts'

const TOKENS = {
  '--dsw-alias-label-primary': '#141413',
  '--dsw-alias-brand': 'var(--dsw-static-deepseek-500)',
  '--dsw-static-deepseek-500': '#4d6bfe',
}

describe('summarizeColorValue', () => {
  it('reports literals with uppercase hex text and a resolved color', () => {
    const summary = summarizeColorValue('#d97757', TOKENS)
    expect(summary).toEqual({ kind: 'literal', text: '#D97757', color: 'rgba(217, 119, 87, 1)' })
  })

  it('keeps non-hex literal text as written', () => {
    const summary = summarizeColorValue('transparent', TOKENS)
    expect(summary).toEqual({ kind: 'literal', text: 'transparent', color: 'rgba(0, 0, 0, 0)' })
  })

  it('reports var() targets with the referenced name resolved through the map', () => {
    const summary = summarizeColorValue('var(--dsw-alias-label-primary)', TOKENS)
    expect(summary).toEqual({
      kind: 'var',
      target: '--dsw-alias-label-primary',
      color: 'rgba(20, 20, 19, 1)',
    })
  })

  it('resolves var() chains and reports null for unresolvable targets', () => {
    expect(summarizeColorValue('var(--dsw-alias-brand)', TOKENS))
      .toMatchObject({ kind: 'var', target: '--dsw-alias-brand', color: 'rgba(77, 107, 254, 1)' })
    expect(summarizeColorValue('var(--missing)', TOKENS))
      .toMatchObject({ kind: 'var', target: '--missing', color: null })
  })

  it('splits a flat color-mix into resolved parts and the weight', () => {
    const summary = summarizeColorValue(
      'color-mix(in srgb, var(--dsw-alias-label-primary) 30%, transparent)',
      TOKENS,
    )
    expect(summary.kind).toBe('mix')
    if (summary.kind !== 'mix') return
    expect(summary.percent).toBe(30)
    expect(summary.left.text).toBe('--dsw-alias-label-primary')
    expect(summary.left.color).toBe('rgba(20, 20, 19, 1)')
    expect(summary.right.text).toBe('transparent')
    expect(summary.right.color).toBe('rgba(0, 0, 0, 0)')
    expect(summary.color).toContain('rgba(')
  })

  it('falls back to raw text for unsupported expressions', () => {
    expect(summarizeColorValue('hsl(0 0% 0%)', TOKENS)).toEqual({ kind: 'raw', text: 'hsl(0 0% 0%)' })
    expect(summarizeColorValue('', TOKENS)).toEqual({ kind: 'raw', text: '' })
  })
})
