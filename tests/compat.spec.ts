import { describe, expect, it } from 'vitest'
import {
  OPTIONAL_CORE_PACKAGES,
  REQUIRED_CORE_PACKAGES,
  SUPPORTED_DSH_RELEASES,
  classifyInstallation,
  type VersionReader,
} from '../src/compat/dsh-version.ts'

const [baseline, second, newest] = SUPPORTED_DSH_RELEASES

function reader(versions: Readonly<Record<string, string | undefined>>): VersionReader {
  return (name) => versions[name]
}

function unified(version: string | undefined): Record<string, string | undefined> {
  return Object.fromEntries([...REQUIRED_CORE_PACKAGES, ...OPTIONAL_CORE_PACKAGES].map(name => [name, version]))
}

describe('DSH compatibility classification', () => {
  it('accepts each allowlisted release when every inspected package agrees', () => {
    for (const version of SUPPORTED_DSH_RELEASES) {
      const report = classifyInstallation(reader(unified(version)))
      expect(report.verdict).toBe('supported')
      expect(report.release).toBe(version)
    }
  })

  it('accepts a headless install that has only the host settings package', () => {
    const report = classifyInstallation(reader({
      '@deepseek-ai/dsh-settings': baseline,
    }))
    expect(report.verdict).toBe('supported')
    expect(report.release).toBe(baseline)
  })

  it('reports a missing required package before comparing versions', () => {
    const report = classifyInstallation(reader({}))
    expect(report.verdict).toBe('incomplete')
    expect(report.message).toContain('missing: @deepseek-ai/dsh-settings')
  })

  it('reports a mixed install when an optional package disagrees', () => {
    const report = classifyInstallation(reader({
      ...unified(baseline),
      '@deepseek-ai/dsh-client-ui-theme': second,
    }))
    expect(report.verdict).toBe('mixed')
    expect(report.release).toBeUndefined()
    expect(report.message).toContain(baseline)
    expect(report.message).toContain(second)
  })

  it('reports a uniform install that is not on the allowlist', () => {
    const report = classifyInstallation(reader(unified('0.1.2-rc.1')))
    expect(report.verdict).toBe('unsupported')
    expect(report.release).toBe('0.1.2-rc.1')
    expect(report.message).toContain(newest)
  })
})
