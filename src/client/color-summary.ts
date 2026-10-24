/**
 * Readable one-line summaries for theme-file color values, for the editor's
 * token table. Pure: resolves parts against the same-scheme token map with
 * {@link resolveCssColor} and never writes anywhere. Unresolvable parts carry
 * `color: null` so the renderer can show the hatched placeholder.
 */
import { parseColorMix, resolveCssColor } from './contrast-colors.ts'

type Tokens = Readonly<Record<string, string>>

/** One resolved paint target inside a summary. */
export interface ColorSummaryPart {
  /** Short display text: `var()` targets lose the `var()` wrapper. */
  readonly text: string
  /** Resolved paint, or null for the hatched placeholder. */
  readonly color: string | null
}

/** How a value is shown in the token table's scheme cells. */
export type ColorSummary =
  /** A literal (`#hex`, `rgb()`, named): swatch + uppercase text. */
  | { readonly kind: 'literal'; readonly text: string; readonly color: string | null }
  /** `var(--x)`: swatch resolved through the map + `→ --x`. */
  | { readonly kind: 'var'; readonly target: string; readonly color: string | null }
  /** `color-mix(in srgb, A p%, B)`: swatch + the two parts and the weight. */
  | {
    readonly kind: 'mix'
    readonly color: string | null
    readonly left: ColorSummaryPart
    readonly percent: number
    readonly right: ColorSummaryPart
  }
  /** Anything else: raw text, no swatch. */
  | { readonly kind: 'raw'; readonly text: string }

/** `var(--x)` → `--x`; every other value keeps its raw text. */
function partText(value: string): string {
  const reference = /^var\(\s*(--[\w-]+)(?:\s*,.*)?\)$/i.exec(value.trim())
  return reference === null ? value.trim() : reference[1]!
}

function part(value: string, tokens: Tokens): ColorSummaryPart {
  const text = partText(value)
  return { text, color: resolveCssColor(value, tokens) }
}

const LITERAL = /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$|^rgba?\(.*\)$|^(?:transparent|black|white)$/i

/**
 * Summarize a draft color value for display.
 * @param value - raw theme-file color value.
 * @param tokens - same-scheme token map for swatch resolution.
 * @returns the structured summary; never throws on bad input.
 */
export function summarizeColorValue(value: string, tokens: Tokens): ColorSummary {
  const text = value.trim()
  const reference = /^var\(\s*(--[\w-]+)\s*\)$/i.exec(text)
  if (reference !== null) {
    return { kind: 'var', target: reference[1]!, color: resolveCssColor(text, tokens) }
  }
  const mix = parseColorMix(text)
  if (mix !== null) {
    return {
      kind: 'mix',
      color: resolveCssColor(text, tokens),
      left: part(mix.color, tokens),
      percent: mix.percent,
      right: part(mix.withColor, tokens),
    }
  }
  if (LITERAL.test(text)) {
    return { kind: 'literal', text: text.startsWith('#') ? text.toUpperCase() : text, color: resolveCssColor(text, tokens) }
  }
  return { kind: 'raw', text }
}
