import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { STAGE1_TOKENS } from '../../src/client/types.ts'
import { auditTokens, FROZEN_STATIC_TOKENS } from '../../scripts/lib/token-audit.mjs'
import { BUILTIN_PRESETS } from '../../src/client/presets.ts'

describe('installed ThemeRuntime token audit', () => {
  it('covers stage-1 tokens and does not override static white', () => {
    const require = createRequire(import.meta.url)
    const bundle = readFileSync(require.resolve('@deepseek-ai/dsh-client-ui-theme/client'), 'utf8')
    for (const preset of BUILTIN_PRESETS) {
      for (const tokens of Object.values(preset.tokens)) {
        const overridden = Object.keys(tokens)
        const report = auditTokens(bundle, overridden, [...STAGE1_TOKENS])
        expect(report.failures).toEqual([])
        expect(report.ok).toBe(true)
        for (const name of FROZEN_STATIC_TOKENS) expect(overridden).not.toContain(name)
        expect(report.covered).toEqual(expect.arrayContaining([...STAGE1_TOKENS]))
      }
    }
  })
})
