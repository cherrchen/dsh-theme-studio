import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

const workflow = (name: string) => parse(readFileSync(new URL(`../../.github/workflows/${name}.yml`, import.meta.url), 'utf8'))

describe('verification and publication boundaries', () => {
  it('derives CI versions from the contract and bootstraps isolated matrix tooling', () => {
    const ci = workflow('ci')
    expect(ci.on).toHaveProperty('workflow_call')
    expect(ci.on).toHaveProperty('pull_request')
    expect(ci.jobs.releases.steps.at(-1).run).toContain('scripts/list-dsh-releases.mjs')
    expect(ci.jobs.verify.strategy['fail-fast']).toBe(false)
    expect(ci.jobs.verify.strategy.matrix.dsh).toContain('needs.releases.outputs.versions')
    const runs = ci.jobs.verify.steps.filter((s: { run?: string }) => s.run).map((s: { run: string }) => s.run)
    expect(runs[0]).toContain('install --frozen-lockfile')
    expect(runs[1]).toContain('scripts/run-dsh-matrix.mjs')
  })

  it('requires the entire reusable CI and all browser releases before OIDC publishing', () => {
    const release = workflow('release')
    expect(release.jobs.verify.uses).toBe('./.github/workflows/ci.yml')
    expect(release.jobs.verify.with.browser_coverage).toBe('all')
    expect(release.jobs.publish.needs).toBe('verify')
    expect(release.jobs.publish.permissions['id-token']).toBe('write')
    const text = JSON.stringify(release)
    expect(text).toContain('theme-studio-release-tarball')
    expect(text).toContain('--provenance')
    expect(text).not.toContain('NPM_TOKEN')
  })

  it('keeps scheduled probes read-only and reports failure as well as success', () => {
    const upgrade = workflow('upgrade')
    expect(upgrade.permissions).toEqual({ contents: 'read' })
    const text = JSON.stringify(upgrade)
    expect(text).not.toMatch(/npm publish|git push|git commit|permissions.*contents.*write/)
    expect(text).toContain('--candidate')
    expect(upgrade.jobs.upgrade.steps.some((s: { if?: string, run?: string }) => s.if === 'always()' && s.run?.includes('GITHUB_STEP_SUMMARY'))).toBe(true)
  })

  it('validates workflow candidates with the same exact-version grammar as local probes', () => {
    const step = workflow('upgrade').jobs.candidate.steps.find((s: { id?: string }) => s.id === 'candidate')
    const match = /node --input-type=module -e '([^']+)'/u.exec(step.run)
    expect(match).not.toBeNull()
    const validate = (version: string) => spawnSync(process.execPath, ['--input-type=module', '-e', match![1]], {
      cwd: fileURLToPath(new URL('../..', import.meta.url)),
      env: { ...process.env, CANDIDATE_VERSION: version },
      encoding: 'utf8',
    })
    for (const version of ['0.2.3', '0.2.3-alpha-hotfix.1', '0.2.3-alpha.1-2', '0.2.3-0.alpha-hotfix']) {
      const result = validate(version)
      expect(result.status, result.stderr).toBe(0)
    }
    for (const version of ['01.2.3', '0.2.3-alpha.01', '0.2.3-alpha_bad', '0.2.3-', '0.2.3;echo', '0.2.3\nversion=9.9.9']) {
      const result = validate(version)
      expect(result.status).toBe(1)
      expect(result.stderr).toContain('Invalid candidate version:')
    }
  })
})
