/** Pure report builder coverage for the validate-theme CLI. */

import { describe, expect, it } from 'vitest'
import { reportOf } from '../../src/creator/report.ts'
import { BUILTIN_PRESETS } from '../../src/client/presets.ts'
import { serializeThemeFile, themeFileForPreset } from '../../src/client/theme-file.ts'

function themeFile(overrides: Record<string, unknown> = {}): string {
  const base = themeFileForPreset(BUILTIN_PRESETS[0]!)
  return JSON.stringify({
    ...base,
    id: 'user.probe',
    name: 'Probe',
    ...overrides,
  })
}

describe('reportOf', () => {
  it('reports a format error without a contrast section', () => {
    const report = reportOf('{')
    expect(report.ok).toBe(false)
    expect(report.format.ok).toBe(false)
    expect(report.format.error?.code).toBe('not-json')
    expect(report.contrast).toBeUndefined()
  })

  it('reports schema errors with their path', () => {
    const report = reportOf(JSON.stringify({ version: 1, id: 'bad id' }))
    expect(report.format.ok).toBe(false)
    expect(report.format.error?.code).toBe('invalid-id')
    expect(report.format.error?.path).toBe('id')
  })

  it('runs contrast diagnostics on a valid file', () => {
    const report = reportOf(themeFile())
    expect(report.format.ok).toBe(true)
    expect(report.contrast).toBeDefined()
    expect(report.contrast?.total).toBeGreaterThan(0)
    expect((report.contrast?.failed ?? 0) + (report.contrast?.unknown ?? 0))
      .toBe(report.contrast?.issues.length)
    expect(report.ok).toBe(report.contrast?.passed)
  })

  it('keeps non-passing checks in issues with scheme and minimum', () => {
    const report = reportOf(themeFile())
    for (const issue of report.contrast?.issues ?? []) {
      expect(['failed', 'unknown']).toContain(issue.status)
      expect(['light', 'dark']).toContain(issue.scheme)
      expect(issue.minimum).toBeGreaterThan(0)
      if (issue.status === 'failed') expect(issue.ratio).not.toBeNull()
    }
  })

  it('fails the report when any contrast check fails or stays unknown', () => {
    const report = reportOf(themeFile())
    if ((report.contrast?.issues.length ?? 0) > 0) {
      expect(report.ok).toBe(false)
    }
  })
})
