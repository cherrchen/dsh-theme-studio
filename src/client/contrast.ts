/** Automated token-pair diagnostics, not certification of a rendered host UI. */
import { contrastRatio } from './contrast-colors.ts'
import type { BuiltinThemePreset } from './types.ts'

export { contrastRatio } from './contrast-colors.ts'

/** A semantic pair; operands are token names or supported CSS colors. */
export interface ThemeContrastPair {
  readonly id: string
  readonly foreground: string
  readonly background: string
  /** Opaque surface underneath a translucent background. */
  readonly backdrop?: string
  /** 4.5 for normal text, 3 for large text or essential non-text graphics. */
  readonly minimum: number
}

/** One result. Unknown colors and missing tokens are never counted as passes. */
export interface ThemeContrastCheck extends ThemeContrastPair {
  readonly scheme: 'light' | 'dark'
  readonly status: 'passed' | 'failed' | 'unknown'
  /** Full precision; null means the pair could not be evaluated. */
  readonly ratio: number | null
  readonly reason?: string
}

export interface ThemeContrastReport {
  readonly themeId: string
  /** True only when every requested pair passes in both schemes. */
  readonly passed: boolean
  readonly checks: readonly ThemeContrastCheck[]
}

const surfaces = ['bg-base', 'bg-layer-1', 'bg-layer-2', 'bg-overlay', 'specific-sidebar-fill']
const text = ['label-primary', 'label-secondary', 'link', 'state-error-primary', 'state-success-primary', 'state-warn-primary']
const token = (name: string): string => name.startsWith('specific-') ? `--dsw-${name}` : `--dsw-alias-${name}`
const pair = (id: string, foreground: string, background: string, minimum = 4.5, backdrop?: string): ThemeContrastPair => ({
  id, foreground, background, minimum, ...(backdrop === undefined ? {} : { backdrop }),
})

/**
 * Normal text on five principal surfaces, code syntax on code-block fill,
 * toast/tooltip/menu copy, and focus indicators. Decorative borders, disabled
 * labels, gradients and actual DOM placement are outside this diagnostic scope.
 */
export const DEFAULT_CONTRAST_PAIRS: readonly ThemeContrastPair[] = Object.freeze([
  ...surfaces.flatMap(surface => text.map(label => pair(`${label}/${surface}`, token(label), token(surface)))),
  ...['comment', 'punctuation', 'string', 'string-expression', 'keyword', 'constant', 'function', 'link', 'parameter']
    .map(name => pair(`code/${name}`, `--shiki-token-${name}`, token('markdown-code-block'))),
  pair('toast', token('toast-label'), token('toast-bg')),
  pair('tooltip', '#ffffff', token('tooltip-bg')),
  pair('menu/primary', token('label-primary'), '--dsw-menu-surface-fill', 4.5, token('bg-base')),
  pair('menu/secondary', token('label-secondary'), '--dsw-menu-surface-fill', 4.5, token('bg-base')),
  ...surfaces.map(surface => pair(`focus/${surface}`, '--dsw-focus-ring-color', token(surface), 3)),
].map(value => Object.freeze(value)))

/** Evaluate light and dark independently, collecting all failures and errors. */
export function validateThemeContrast(
  preset: Pick<BuiltinThemePreset, 'id' | 'tokens'>,
  pairs: readonly ThemeContrastPair[] = DEFAULT_CONTRAST_PAIRS,
): ThemeContrastReport {
  if (pairs.length === 0) throw new Error('at least one contrast pair is required')
  for (const rule of pairs) {
    if (!Number.isFinite(rule.minimum) || rule.minimum < 1 || rule.minimum > 21) {
      throw new Error(`invalid contrast minimum for ${rule.id}`)
    }
  }
  const checks = (['light', 'dark'] as const).flatMap(scheme => pairs.map(rule => {
    try {
      const ratio = contrastRatio(rule.foreground, rule.background, rule.backdrop, preset.tokens[scheme])
      return Object.freeze({ ...rule, scheme, ratio, status: ratio >= rule.minimum ? 'passed' : 'failed' } as const)
    } catch (error) {
      return Object.freeze({
        ...rule, scheme, ratio: null, status: 'unknown' as const,
        reason: error instanceof Error ? error.message : String(error),
      })
    }
  }))
  return Object.freeze({ themeId: preset.id, passed: checks.every(check => check.status === 'passed'), checks: Object.freeze(checks) })
}
