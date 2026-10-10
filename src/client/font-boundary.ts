/** Keep color overlays off the CSS variables owned by official font settings. */

import type { ThemeTokenOverrides } from '@deepseek-ai/dsh-client-ui-theme/client'

/**
 * Exact variables the official theme service writes for font preferences.
 * `--dsw-font-family` and `--dsw-font-family-brand` alias the text stack, and
 * `--ds-font-family-code` aliases the code stack. ThemePresenter applies token
 * overlays after those variables, so a same-named overlay would replace them.
 */
const EXACT_FONT_TOKENS = new Set([
  '--dsh-content-font-size',
  '--dsh-code-font-size',
  '--dsh-terminal-font-size',
  '--ds-font-family-code',
  '--dsw-font-family',
  '--dsw-font-family-brand',
])

/**
 * Whether one token name is owned by official font settings.
 * @param name - CSS custom property or token name.
 * @returns true when an overlay of this name would change a font preference.
 */
export function isOfficialFontToken(name: string): boolean {
  return name.startsWith('--dsh-font-family-') || EXACT_FONT_TOKENS.has(name)
}

/**
 * Copy an override map without official font tokens.
 * Returns the same object when it contains none, so callers can skip work.
 * @param tokens - per-token light/dark pairs.
 * @returns the color-only overlay.
 */
export function withoutOfficialFontTokens(tokens: ThemeTokenOverrides): ThemeTokenOverrides {
  const names = Object.keys(tokens)
  if (!names.some(isOfficialFontToken)) return tokens
  const next: ThemeTokenOverrides = {}
  for (const name of names) {
    if (!isOfficialFontToken(name)) {
      const value = tokens[name]
      if (value !== undefined) next[name] = value
    }
  }
  return next
}
