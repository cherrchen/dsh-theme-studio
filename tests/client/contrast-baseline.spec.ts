import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { BUILTIN_PRESETS } from '../../src/client/presets.ts'
import { validateThemeContrast } from '../../src/client/contrast.ts'

/**
 * Failure ids recorded on 2026-10-10 from the current builtin palettes.
 * A new failure or a disappearing one changes this file and has to be reviewed.
 * The file is not a waiver: `pnpm contrast:report --strict` still exits 1.
 */
const KNOWN_FAILURES = JSON.parse(readFileSync(fileURLToPath(new URL('./contrast-baseline.json', import.meta.url)), 'utf8')) as string[]

describe('contrast regression diff', () => {
  it('matches the recorded low-contrast baseline and has no unknown colors', () => {
    const failed: string[] = []
    for (const preset of BUILTIN_PRESETS) {
      const report = validateThemeContrast(preset)
      expect(report.checks.some(check => check.status === 'unknown')).toBe(false)
      for (const check of report.checks) {
        if (check.status === 'failed') failed.push(`${preset.id.replace('dsh-theme-studio.', '')} ${check.scheme} ${check.id}`)
      }
    }
    failed.sort()
    expect(failed).toEqual(KNOWN_FAILURES)
  })
})
