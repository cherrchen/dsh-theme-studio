/**
 * Colors the Stage 1 palette does not name, derived from it.
 *
 * Most DSH aliases point at `--dsw-static-*` or a literal rgba, so overriding
 * the 13 Stage 1 tokens leaves them on the official sheet. `overrideTokens`
 * writes onto `body`, and a child `var()` picks that up, so these values
 * recolor the semantic layer without a host change.
 *
 * `--dsw-static-neutral-00` and `--dsw-static-neutral-bluish-00` stay
 * untouched: both schemes define them as white, and tooltip text plus the
 * light sheen on file tiles read that white directly.
 */

/** The 13 handwritten palette fields. Chrome colors are computed from these. */
export interface ChromePalette {
  bgBase: string
  bgLayer1: string
  bgLayer2: string
  bgOverlay: string
  borderL1: string
  borderL2: string
  brand: string
  labelPrimary: string
  labelSecondary: string
  error: string
  success: string
  warn: string
  sidebar: string
}

/** Share of `color` mixed toward `withColor`. */
function mix(color: string, withColor: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, ${withColor})`
}

/** Share of `color` over transparency. Label ink flips with the scheme, so borders and hovers do too. */
function fade(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`
}

/**
 * Builtin base surfaces sit far from mid-gray. Tooltip and toast copy is
 * painted with the static white `--dsw-static-neutral-bluish-00`, so a light
 * scheme needs a dark bubble and a dark scheme needs a bubble darker than the page.
 */
function darkSurface(hex: string): boolean {
  const raw = hex.replace('#', '')
  const expanded = raw.length === 3 ? [...raw].map(ch => ch + ch).join('') : raw
  const r = Number.parseInt(expanded.slice(0, 2), 16)
  const g = Number.parseInt(expanded.slice(2, 4), 16)
  const b = Number.parseInt(expanded.slice(4, 6), 16)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128
}

/**
 * Semantic aliases, specifics, shiki tokens, and the few statics components
 * read directly. Does not emit Stage 1 tokens.
 * @param palette - one scheme of a builtin theme.
 * @returns CSS variable names to values for that scheme.
 */
export function deriveChrome(palette: ChromePalette): Readonly<Record<string, string>> {
  const { bgBase, bgLayer1, bgLayer2, bgOverlay, brand, labelPrimary, labelSecondary, error, success, warn, sidebar } = palette
  const dark = darkSurface(bgBase)
  const hoverWash = fade(labelPrimary, 8)
  const quietSurface = mix(bgBase, labelPrimary, 94)
  const liftedLayer = mix(bgLayer2, labelPrimary, 92)
  const watermark = mix(bgBase, labelPrimary, 82)
  const bubble = dark ? mix(bgBase, 'black', 70) : labelPrimary
  const toastBg = dark ? mix(bgBase, 'black', 75) : labelPrimary
  const toastLabel = dark ? labelPrimary : bgBase

  return {
    '--dsw-alias-label-tertiary': mix(labelSecondary, bgBase, 72),
    '--dsw-alias-label-caption': mix(labelSecondary, bgBase, 55),
    '--dsw-alias-label-dimmed': mix(labelSecondary, bgBase, 40),
    '--dsw-alias-label-primary-dimmed': mix(labelPrimary, bgBase, 80),
    '--dsw-alias-label-primary-foreground': bgBase,
    '--dsw-alias-label-primary-inverted': bgBase,
    '--dsw-alias-label-primary-bluish': brand,
    '--dsw-alias-label-document-preview': labelSecondary,
    '--dsw-alias-menu-icon': labelSecondary,
    '--dsw-alias-brand-text': brand,
    '--dsw-alias-brand-primary-invert': brand,
    '--dsw-alias-brand-primary-new-colorprimary-new-color': brand,

    '--dsw-alias-bg-layer-3': liftedLayer,
    '--dsw-alias-bg-module-platform': quietSurface,
    '--dsw-alias-bg-multi-select': quietSurface,
    '--dsw-alias-bg-skeleton': fade(labelPrimary, 6),
    '--dsw-alias-bg-document-preview': bgLayer2,
    '--dsw-alias-bg-mask-1': fade('black', dark ? 50 : 24),
    '--dsw-alias-bg-mask-2': fade('black', dark ? 20 : 12),
    '--dsw-alias-bg-mask-3': fade('black', 48),
    '--dsw-alias-bg-mask-photo': fade('black', 88),
    '--dsw-alias-bg-mask-drop': dark ? fade(bgBase, 70) : fade('white', 70),

    '--dsw-alias-border-l3': fade(labelPrimary, 12),
    '--dsw-alias-border-l4': fade(labelPrimary, 16),
    '--dsw-alias-border-l2-darkmode-thin': fade(labelPrimary, 10),
    '--dsw-alias-border-inverted': fade(labelPrimary, 6),
    '--dsw-alias-border-inverted2': fade(labelPrimary, 8),

    '--dsw-alias-interactive-bg-hover': hoverWash,
    '--dsw-alias-interactive-bg-hover-accent': fade(labelPrimary, 14),
    '--dsw-alias-interactive-bg-active': fade(labelPrimary, 10),
    '--dsw-alias-interactive-bg-hover-solid': bgLayer2,
    '--dsw-alias-interactive-bg-hover-danger': fade(error, 8),

    '--dsw-alias-button-primary-hover': mix(brand, labelPrimary, 82),
    '--dsw-alias-button-primary-dimmed': mix(brand, bgBase, 18),
    '--dsw-alias-button-contrast-fill': labelPrimary,
    '--dsw-alias-button-elevated-fill': bgLayer1,
    '--dsw-alias-button-floating-fill': bgOverlay,
    '--dsw-alias-button-floating-hover': mix(bgOverlay, labelPrimary, 90),
    '--dsw-alias-button-ghost-active-border': fade(labelPrimary, 40),
    '--dsw-alias-button-ghost-active-fill': bgLayer2,
    '--dsw-alias-button-ghost-active-hover': mix(bgLayer2, labelPrimary, 88),
    '--dsw-alias-button-info-fill': brand,
    '--dsw-alias-button-info-hover': mix(brand, labelPrimary, 82),
    '--dsw-alias-button-tool-bar-fill-invisible': fade(labelPrimary, 36),
    '--dsw-alias-button-tool-bar-fill': fade(labelPrimary, 50),
    '--dsw-alias-button-tool-bar-hover': fade(labelPrimary, 60),

    '--dsw-alias-state-business-primary': brand,
    '--dsw-alias-state-business-tertiary': fade(brand, 16),
    '--dsw-alias-state-error-secondary': mix(error, bgBase, 70),
    '--dsw-alias-state-success-secondary': mix(success, bgBase, 70),
    '--dsw-alias-state-success-tertiary': fade(success, 16),
    '--dsw-alias-state-warn-label': warn,
    '--dsw-alias-state-warn-secondary': mix(warn, bgBase, 70),
    '--dsw-alias-state-warn-tertiary': fade(warn, 16),
    '--dsw-alias-state-idle-primary': mix(labelSecondary, bgBase, 45),
    '--dsw-alias-link': brand,
    '--dsw-focus-ring-color': brand,

    '--dsw-menu-surface-fill': fade(bgOverlay, 92),
    '--dsw-specific-menu': fade(bgOverlay, 92),
    '--dsw-alias-toast-bg': toastBg,
    '--dsw-alias-toast-label': toastLabel,
    '--dsw-alias-tooltip-bg': bubble,

    '--dsw-specific-sidebar-nav-item-active': bgLayer2,
    '--dsw-specific-sidebar-nav-item-hover': mix(sidebar, labelPrimary, 92),
    '--dsw-specific-sidebar-nav-item-active-accent': fade(brand, 18),
    '--dsw-specific-input-major': bgLayer1,
    '--dsw-specific-login-input': bgLayer2,
    '--dsw-specific-selector': quietSurface,
    '--dsw-specific-tip': quietSurface,
    '--dsw-specific-bubble': fade(brand, 12),
    '--dsw-specific-bubble-highlight': fade(brand, 22),

    '--dsw-alias-markdown-code-block': bgLayer2,
    '--dsw-alias-markdown-code-block-banner': mix(bgLayer2, bgBase, 50),
    '--dsw-alias-markdown-inline-code': liftedLayer,
    '--dsw-alias-markdown-citation': bgLayer2,
    '--dsw-alias-markdown-tag': quietSurface,
    '--dsw-alias-markdown-placeholder': bgLayer2,
    '--dsw-alias-markdown-code-segment-selected': bgLayer1,
    '--dsw-alias-markdown-code-segment-unselected': bgLayer2,
    '--dsw-alias-scrollbar-bg-l1': fade(labelPrimary, 28),
    '--dsw-alias-scrollbar-bg-l2': fade(labelPrimary, 28),
    '--dsw-alias-scrollbar-hover-l1': fade(labelPrimary, 45),
    '--dsw-alias-scrollbar-hover-l2': fade(labelPrimary, 45),
    '--dsw-alias-code-diff-added': fade(success, 16),
    '--dsw-alias-code-diff-deleted': fade(error, 16),
    '--dsw-alias-file-diff-added-bg': fade(success, 16),
    '--dsw-alias-file-diff-added-gutter': fade(success, 10),
    '--dsw-alias-file-diff-added-marker': success,
    '--dsw-alias-file-diff-deleted-bg': fade(error, 16),
    '--dsw-alias-file-diff-deleted-gutter': fade(error, 10),
    '--dsw-alias-file-diff-deleted-marker': error,

    '--dsw-alias-onboarding-accent': brand,
    '--dsw-alias-onboarding-card-fill': fade(bgBase, 80),
    '--dsw-alias-onboarding-secondary-fill': bgLayer1,
    '--dsw-alias-onboarding-checkbox-border': fade(labelPrimary, 20),

    '--shiki-token-comment': labelSecondary,
    '--shiki-token-punctuation': labelSecondary,
    '--shiki-token-string': success,
    '--shiki-token-string-expression': success,
    '--shiki-token-keyword': error,
    '--shiki-token-constant': brand,
    '--shiki-token-function': brand,
    '--shiki-token-link': brand,
    '--shiki-token-parameter': warn,

    '--dsw-static-deepseek-400': brand,
    '--dsw-static-deepseek-450': brand,
    '--dsw-static-deepseek-500': brand,
    '--dsw-static-blue-400': brand,
    '--dsw-static-blue-450': brand,
    '--dsw-static-blue-500': brand,
    '--dsw-static-blue-600': brand,
    '--dsw-static-green-500': success,
    '--dsw-static-amber-400': warn,
    '--dsw-static-amber-500': warn,
    '--dsw-static-red-600': error,
    '--dsw-static-neutral-bluish-300': labelSecondary,
    '--dsw-static-neutral-bluish-400': labelSecondary,
    '--dsw-static-neutral-bluish-1000': labelPrimary,
    '--dsw-static-neutral-50': bgLayer2,
    '--dsw-static-neutral-850': bgLayer2,
    '--dsw-static-neutral-100': liftedLayer,
    '--dsw-static-neutral-800': liftedLayer,
    '--dsw-static-neutral-200': watermark,
    '--dsw-static-neutral-700': watermark,
  }
}

const CHROME_NAME_PROBE: ChromePalette = {
  bgBase: '#ffffff',
  bgLayer1: '#ffffff',
  bgLayer2: '#f5f5f5',
  bgOverlay: '#ffffff',
  borderL1: 'transparent',
  borderL2: 'transparent',
  brand: '#000000',
  labelPrimary: '#111111',
  labelSecondary: '#666666',
  error: '#ff0000',
  success: '#00ff00',
  warn: '#ffaa00',
  sidebar: '#f5f5f5',
}

/** Every variable {@link deriveChrome} writes. Same set for light and dark. */
export const CHROME_TOKEN_NAMES: readonly string[] = Object.freeze(Object.keys(deriveChrome(CHROME_NAME_PROBE)))
