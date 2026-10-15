import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'
import { exactPin } from '../../scripts/lib/exact-pin.mjs'
import { rangeAdmits, unifyPins } from '../../scripts/lib/range.mjs'
import { parsePackageKey, collectResolved, bareVersion } from '../../scripts/lib/lockfile.mjs'
import { readContract } from '../../scripts/lib/contract.mjs'
import { describeRelease, splitView } from '../../scripts/lib/metadata.mjs'
import { assessRepository } from '../../scripts/lib/assess-compat.mjs'

describe('compatibility tooling', () => {
  it('pins a single caret or tilde and refuses a compound range', () => {
    expect(exactPin('^4.0.2', 'cordis')).toBe('4.0.2')
    expect(exactPin('~1.8.6-alpha.1', 'cosmokit')).toBe('1.8.6-alpha.1')
    expect(exactPin('0.2.1-alpha.2', 'settings')).toBe('0.2.1-alpha.2')
    expect(() => exactPin('>=4.0.2 <5.0.0', 'cordis')).toThrow(/not a single exact/)
  })

  it('selects the one named version that satisfies every declaration', () => {
    expect(unifyPins([
      { name: '@deepseek-ai/cosmokit', range: '^1.8.3', from: 'cordis' },
      { name: '@deepseek-ai/cosmokit', range: '^1.8.4', from: 'settings' },
    ])).toEqual({ '@deepseek-ai/cosmokit': '1.8.4' })
    expect(rangeAdmits('>=4.0.2 <5.0.0 || 4.0.5-alpha.1', '4.0.4')).toBe(true)
    expect(rangeAdmits('>=4.0.2 <5.0.0 || 4.0.5-alpha.1', '4.0.5-alpha.1')).toBe(true)
    expect(rangeAdmits('>=4.0.2 <5.0.0', '4.0.5-alpha.1')).toBe(false)
    expect(() => unifyPins([
      { name: '@deepseek-ai/cosmokit', range: '^1.8.4', from: 'settings' },
      { name: '@deepseek-ai/cosmokit', range: '~1.8.6-alpha.1', from: 'cordis' },
    ])).toThrow(/Cannot determine one pin/)
  })

  it('parses pnpm package keys and peer-suffixed versions', () => {
    expect(parsePackageKey('@deepseek-ai/dsh-settings@0.2.1-alpha.2(@deepseek-ai/cordis@4.0.5-alpha.1)')).toEqual({
      name: '@deepseek-ai/dsh-settings',
      version: '0.2.1-alpha.2',
    })
    expect(bareVersion('3.18.5-alpha.1(@deepseek-ai/cordis@4.0.5-alpha.1)')).toBe('3.18.5-alpha.1')
    const resolved = collectResolved({
      importers: {
        '.': { devDependencies: { '@deepseek-ai/dsh-settings': { specifier: '0.2.1-alpha.2', version: '0.2.1-alpha.2(@deepseek-ai/cordis@4.0.5-alpha.1)' } } },
      },
      snapshots: {
        '@deepseek-ai/dsh-settings@0.2.1-alpha.2': {
          dependencies: { '@deepseek-ai/cordis': '4.0.5-alpha.1' },
        },
      },
    })
    expect(resolved.map(row => `${row.name}@${row.version}`)).toEqual([
      '@deepseek-ai/dsh-settings@0.2.1-alpha.2',
      '@deepseek-ai/dsh-settings@0.2.1-alpha.2',
      '@deepseek-ai/cordis@4.0.5-alpha.1',
    ])
  })

  it('preserves every accepted prerelease identifier in lockfile versions', () => {
    for (const version of ['0.2.3-alpha-hotfix.1', '0.2.3-alpha.1-2', '0.2.3-0.alpha-hotfix']) {
      for (const suffix of ['', '(@deepseek-ai/cordis@4.0.5-alpha.1)']) {
        expect(bareVersion(version + suffix)).toBe(version)
        expect(parsePackageKey(`@deepseek-ai/dsh-settings@${version}${suffix}`)).toEqual({
          name: '@deepseek-ai/dsh-settings', version,
        })
        expect(parsePackageKey(`unscoped@${version}${suffix}`)).toEqual({ name: 'unscoped', version })
      }
      expect(rangeAdmits(`^${version}`, version)).toBe(true)
      expect(unifyPins([{ name: '@deepseek-ai/cordis', range: `^${version}`, from: 'settings' }]))
        .toEqual({ '@deepseek-ai/cordis': version })
    }
  })

  it('does not extract a valid-looking prefix from invalid lockfile versions', () => {
    for (const version of ['01.2.3', '0.2.3-alpha.01', '0.2.3-alpha_bad', '0.2.3-', '0.2.3-alpha..1', '0.2.3;echo']) {
      for (const suffix of ['', '(@deepseek-ai/cordis@4.0.5-alpha.1)']) {
        expect(bareVersion(version + suffix)).toBeUndefined()
        expect(parsePackageKey(`@deepseek-ai/dsh-settings@${version}${suffix}`)).toBeUndefined()
      }
      expect(rangeAdmits(version, version)).toBe(false)
    }
  })

  it('reads a unique allowlist and accepts this checkout', () => {
    const root = fileURLToPath(new URL('../..', import.meta.url))
    const contract = readContract(root)
    expect(new Set(contract.supported).size).toBe(contract.supported.length)
    expect(contract.required).toEqual(['@deepseek-ai/dsh-settings'])
    const report = assessRepository(root)
    expect(report.failures).toEqual([])
    expect(report.ok).toBe(true)
    // A candidate probe keeps a widened checkout honest without claiming support.
    expect(report.diagnosis).toBe(
      process.env.DSH_THEME_STUDIO_CANDIDATE ? 'candidate probe consistent' : 'consistent',
    )
  })

  it('splits an npm view document', () => {
    expect(splitView({ dependencies: { a: '1.0.0' }, peerDependencies: { b: '^2.0.0' } })).toEqual({
      dependencies: { a: '1.0.0' },
      peerDependencies: { b: '^2.0.0' },
    })
    expect(splitView({ '@deepseek-ai/cosmokit': '^1.8.3' })).toEqual({
      dependencies: { '@deepseek-ai/cosmokit': '^1.8.3' },
      peerDependencies: {},
    })
  })

  it('derives vendor pins from release metadata without leaking injected probe caches', () => {
    const names = ['@deepseek-ai/dsh-settings', '@deepseek-ai/dsh-client-ui-theme']
    const metadata = (cordis: string) => (args: string[]) => JSON.stringify(args[1]?.startsWith('@deepseek-ai/dsh-') ? {
      dependencies: { '@deepseek-ai/schemastery': '^3.18.2' },
      peerDependencies: { '@deepseek-ai/cordis': cordis },
    } : {})
    expect(describeRelease('0.1.5-rc.2', names, metadata('^4.0.2')).cordis).toBe('4.0.2')
    expect(describeRelease('0.1.5-rc.2', names, metadata('^4.0.3')).cordis).toBe('4.0.3')
    expect(() => describeRelease('0.1.5-rc.2', names, metadata('>=4.0.2 <5.0.0'))).toThrow(/not a single exact/)
  })
})
