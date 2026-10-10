/** Read the support allowlist from source so checks run before `pnpm build`. */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isExactVersion } from './exact-pin.mjs'

/**
 * @param source - `src/compat/dsh-version.ts` text.
 * @param name - exported array binding.
 * @returns the string entries, in order.
 */
export function readStringArray(source, name) {
  const match = new RegExp(String.raw`export const ${name} = \[([^\]]*)\]`, 'u').exec(source)
  if (match === null) throw new Error(`${name} is not an array literal in src/compat/dsh-version.ts`)
  const body = match[1].replace(/\/\/[^\n]*/gu, '')
  if (!/^\s*(?:'[^']+'\s*,\s*)*(?:'[^']+'\s*,?\s*)?$/u.test(body)) {
    throw new Error(`${name} must contain only single-quoted string literals`)
  }
  return [...body.matchAll(/'([^']+)'/gu)].map(token => token[1])
}

/**
 * @param root - repository root.
 * @returns the allowlist and the packages the contract inspects.
 */
export function readContract(root) {
  const source = readFileSync(join(root, 'src', 'compat', 'dsh-version.ts'), 'utf8')
  const supported = readStringArray(source, 'SUPPORTED_DSH_RELEASES')
  const required = readStringArray(source, 'REQUIRED_CORE_PACKAGES')
  const optional = readStringArray(source, 'OPTIONAL_CORE_PACKAGES')
  if (supported.length === 0) throw new Error('SUPPORTED_DSH_RELEASES is empty')
  if (new Set(supported).size !== supported.length) throw new Error('SUPPORTED_DSH_RELEASES contains duplicates')
  if (supported.some(version => !isExactVersion(version))) throw new Error('SUPPORTED_DSH_RELEASES contains a non-exact version')
  if (required.length === 0) throw new Error('REQUIRED_CORE_PACKAGES is empty')
  if (required.some(name => optional.includes(name))) throw new Error('A package is both required and optional')
  return { supported, required, optional, core: [...required, ...optional] }
}
