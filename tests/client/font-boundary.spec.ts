import { describe, expect, it } from 'vitest'
import type { ThemeTokenOverrides } from '@deepseek-ai/dsh-client-ui-theme/client'
import { isOfficialFontToken, withoutOfficialFontTokens } from '../../src/client/font-boundary.ts'

describe('official font token boundary', () => {
  it('recognizes the font variables owned by the upstream theme service', () => {
    expect(isOfficialFontToken('--dsh-font-family-text')).toBe(true)
    expect(isOfficialFontToken('--dsh-font-family-code')).toBe(true)
    expect(isOfficialFontToken('--dsh-font-family-terminal')).toBe(true)
    expect(isOfficialFontToken('--dsh-content-font-size')).toBe(true)
    expect(isOfficialFontToken('--dsh-code-font-size')).toBe(true)
    expect(isOfficialFontToken('--dsh-terminal-font-size')).toBe(true)
    expect(isOfficialFontToken('--ds-font-family-code')).toBe(true)
    expect(isOfficialFontToken('--dsw-font-family')).toBe(true)
    expect(isOfficialFontToken('--dsw-alias-bg-base')).toBe(false)
  })

  it('returns the same map when no font token is present', () => {
    const tokens: ThemeTokenOverrides = {
      '--dsw-alias-bg-base': { light: '#fff', dark: '#111' },
    }
    expect(withoutOfficialFontTokens(tokens)).toBe(tokens)
  })

  it('drops font tokens and keeps color tokens', () => {
    const tokens: ThemeTokenOverrides = {
      '--dsw-alias-brand-primary': { light: '#123456', dark: '#abcdef' },
      '--dsh-font-family-terminal': { light: 'Leak', dark: 'Leak' },
      '--dsh-code-font-size': { light: '99px', dark: '99px' },
    }
    expect(withoutOfficialFontTokens(tokens)).toEqual({
      '--dsw-alias-brand-primary': { light: '#123456', dark: '#abcdef' },
    })
  })
})
