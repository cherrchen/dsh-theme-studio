import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

const workflow = (name: string) => parse(readFileSync(new URL(`../../.github/workflows/${name}.yml`, import.meta.url), 'utf8'))

// Release runs on Ubuntu. Execute its actual Bash gate with GitHub's pipefail
// settings on POSIX; Windows matrix jobs do not run this publication step.
describe.skipIf(process.platform === 'win32')('verified release tarball gate', () => {
  it.each([
    { name: 'large registered bundle', marker: 'window.__ModuleLoader__.load', version: '0.1.3', missing: undefined, passed: true, error: '' },
    { name: 'unregistered bundle', marker: '', version: '0.1.3', missing: undefined, passed: false, error: 'no ModuleLoader registration' },
    { name: 'lookalike marker', marker: 'windowX__ModuleLoader__Yload', version: '0.1.3', missing: undefined, passed: false, error: 'no ModuleLoader registration' },
    { name: 'missing declaration', marker: 'window.__ModuleLoader__.load', version: '0.1.3', missing: 'lib/types/client/index.d.ts', passed: false, error: 'missing package/lib/types/client/index.d.ts' },
    { name: 'mismatched version', marker: 'window.__ModuleLoader__.load', version: '0.1.4', missing: undefined, passed: false, error: 'does not match tag' },
  ])('$name', ({ marker, version, missing, passed, error }) => {
    const dir = mkdtempSync(join(tmpdir(), 'theme-studio-release-gate-'))
    try {
      mkdirSync(join(dir, 'dist'))
      const files = [
        'package.json', 'cordis.patch.yml', 'lib/index.js', 'lib/client.js',
        'lib/types/index.d.ts', 'lib/types/client/index.d.ts',
        'README.md', 'README.en.md', 'CHANGELOG.md', 'CHANGELOG.en.md',
      ]
      for (const file of files) {
        if (file === missing) continue
        const path = join(dir, 'package', file)
        mkdirSync(dirname(path), { recursive: true })
        const content = file === 'package.json' ? JSON.stringify({ version })
          : file === 'lib/client.js' ? `// ${marker}\n${'x'.repeat(2 * 1024 * 1024)}\n` : 'fixture\n'
        writeFileSync(path, content)
      }
      const packed = spawnSync('tar', ['-czf', 'dist/plugin.tgz', 'package'], { cwd: dir, encoding: 'utf8' })
      expect(packed.status, packed.stderr).toBe(0)
      const step = workflow('release').jobs.publish.steps.find((s: { name?: string }) => s.name === 'Check the verified tarball')
      expect(step.shell).toBe('bash')
      const result = spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', step.run], {
        cwd: dir,
        env: { ...process.env, GITHUB_REF_NAME: 'v0.1.3', GITHUB_ENV: join(dir, 'github-env') },
        encoding: 'utf8',
        timeout: 15000,
      })
      expect(result.error).toBeUndefined()
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(passed ? 0 : 1)
      if (!passed) expect(result.stdout).toContain(error)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

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
