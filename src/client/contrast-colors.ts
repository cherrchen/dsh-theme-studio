/** Small, DOM-free sRGB resolver for the colors emitted by builtin palettes. */
interface Color { r: number; g: number; b: number; a: number }
type Tokens = Readonly<Record<string, string>>

function split(value: string): string[] {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '(') depth++
    if (value[i] === ')') depth--
    if (depth < 0) throw new Error('unbalanced color expression')
    if (value[i] === ',' && depth === 0) {
      parts.push(value.slice(start, i).trim())
      start = i + 1
    }
  }
  if (depth !== 0) throw new Error('unbalanced color expression')
  parts.push(value.slice(start).trim())
  return parts
}

const NUMBER = /^[+-]?(?:\d*\.\d+|\d+\.?\d*)%?$/
function channel(value: string, scale: number): number {
  if (!NUMBER.test(value)) throw new Error(`invalid color channel: ${value}`)
  const n = Number.parseFloat(value) / (value.endsWith('%') ? 100 : scale)
  if (!Number.isFinite(n) || n < 0 || n > 1) throw new Error(`color channel out of range: ${value}`)
  return n
}

function resolve(value: string, tokens: Tokens, trail: readonly string[] = [], depth = 0): Color {
  if (depth > 32) throw new Error('color expression is too deeply nested')
  const color = value.trim()
  if (color.startsWith('--')) {
    if (trail.includes(color)) throw new Error(`cyclic token reference: ${color}`)
    const next = Object.hasOwn(tokens, color) ? tokens[color] : undefined
    if (next === undefined) throw new Error(`missing token: ${color}`)
    return resolve(next, tokens, [...trail, color], depth + 1)
  }
  const variable = /^var\((.*)\)$/i.exec(color)
  if (variable) {
    const args = split(variable[1]!)
    const name = args[0]!
    if (!/^--[\w-]+$/.test(name) || args.length > 2) throw new Error(`invalid var(): ${color}`)
    if (!Object.hasOwn(tokens, name) && args[1] !== undefined) return resolve(args[1], tokens, trail, depth + 1)
    return resolve(name, tokens, trail, depth + 1)
  }
  const named = color.toLowerCase()
  if (named === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }
  if (named === 'black' || named === 'white') {
    const v = named === 'black' ? 0 : 1
    return { r: v, g: v, b: v, a: 1 }
  }
  if (/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(color)) {
    let hex = color.slice(1)
    if (hex.length <= 4) hex = [...hex].map(c => c + c).join('')
    return {
      r: Number.parseInt(hex.slice(0, 2), 16) / 255,
      g: Number.parseInt(hex.slice(2, 4), 16) / 255,
      b: Number.parseInt(hex.slice(4, 6), 16) / 255,
      a: hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1,
    }
  }
  const rgb = /^rgba?\((.*)\)$/i.exec(color)
  if (rgb) {
    const body = rgb[1]!.trim()
    let args: string[]
    if (body.includes(',')) {
      args = split(body)
      const percents = args.slice(0, 3).filter(value => value.endsWith('%')).length
      if ((args.length !== 3 && args.length !== 4) || (percents !== 0 && percents !== 3)) throw new Error(`invalid rgb(): ${color}`)
    } else {
      const [channels, alpha, ...extra] = body.split('/')
      args = channels!.trim().split(/\s+/)
      if (args.length !== 3 || extra.length !== 0) throw new Error(`invalid rgb(): ${color}`)
      if (alpha !== undefined) args.push(alpha.trim())
    }
    return { r: channel(args[0]!, 255), g: channel(args[1]!, 255), b: channel(args[2]!, 255), a: channel(args[3] ?? '1', 1) }
  }
  const mix = /^color-mix\((.*)\)$/i.exec(color)
  if (mix) {
    const args = split(mix[1]!)
    if (args.length !== 3 || args[0]?.toLowerCase() !== 'in srgb') throw new Error(`unsupported color-mix(): ${color}`)
    const stop = (input: string): { color: Color; weight: number | undefined } => {
      const weight = /\s+([\d.]+%)$/.exec(input)
      return {
        color: resolve(weight ? input.slice(0, weight.index) : input, tokens, trail, depth + 1),
        weight: weight ? channel(weight[1]!, 1) : undefined,
      }
    }
    const left = stop(args[1]!)
    const right = stop(args[2]!)
    const w1 = left.weight ?? (right.weight === undefined ? 0.5 : 1 - right.weight)
    const w2 = right.weight ?? 1 - w1
    const sum = w1 + w2
    if (sum === 0) throw new Error('color-mix() weights sum to zero')
    const p = w1 / sum
    const q = w2 / sum
    const alpha = left.color.a * p + right.color.a * q
    const component = (key: 'r' | 'g' | 'b'): number => alpha === 0 ? 0
      : (left.color[key] * left.color.a * p + right.color[key] * right.color.a * q) / alpha
    return { r: component('r'), g: component('g'), b: component('b'), a: alpha * Math.min(sum, 1) }
  }
  throw new Error(`unsupported color: ${color}`)
}

function over(front: Color, back: Color): Color {
  const a = front.a + back.a * (1 - front.a)
  const component = (key: 'r' | 'g' | 'b'): number => a === 0 ? 0
    : (front[key] * front.a + back[key] * back.a * (1 - front.a)) / a
  return { r: component('r'), g: component('g'), b: component('b'), a }
}

function luminance(color: Color): number {
  const linear = (v: number): number => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  return 0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b)
}

/**
 * WCAG sRGB contrast, without rounding. Translucent backgrounds require an
 * explicit opaque backdrop; unsupported colors throw instead of passing.
 */
export function contrastRatio(
  foreground: string,
  background: string,
  backdrop?: string,
  tokens: Tokens = {},
): number {
  let back = resolve(background, tokens)
  if (back.a < 1) {
    if (backdrop === undefined) throw new Error('translucent background requires an opaque backdrop')
    const base = resolve(backdrop, tokens)
    if (base.a !== 1) throw new Error('backdrop must be opaque')
    back = over(back, base)
  }
  const front = over(resolve(foreground, tokens), back)
  const l1 = luminance(front)
  const l2 = luminance(back)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}
