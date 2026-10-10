import { afterEach, describe, expect, it } from 'vitest'
import { createRequire } from 'node:module'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assessRepository, readmeVersions } from '../../scripts/lib/assess-compat.mjs'
import { readInstalledVersion } from '../../scripts/lib/installed.mjs'
import { repointInstallation } from '../../scripts/lib/repoint.mjs'
import { readContract, readStringArray } from '../../scripts/lib/contract.mjs'
import { isExactVersion } from '../../scripts/lib/exact-pin.mjs'
import { rangeAdmits } from '../../scripts/lib/range.mjs'

const root = fileURLToPath(new URL('../..', import.meta.url))
const fixtures: string[] = []
afterEach(() => { for (const dir of fixtures.splice(0)) rmSync(dir, { recursive: true, force: true }) })

function fixture(candidate?: string) {
  const dir = mkdtempSync(join(tmpdir(), 'theme-studio-contract-'))
  fixtures.push(dir)
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  const pin = manifest.devDependencies['@deepseek-ai/dsh-settings']
  const contract = readContract(root)
  for (const file of ['pnpm-lock.yaml', 'pnpm-workspace.yaml', 'README.md', 'README.en.md', 'src/compat/dsh-version.ts']) {
    mkdirSync(join(dir, file, '..'), { recursive: true })
    let content = readFileSync(join(root, file), 'utf8')
    if (candidate && file.startsWith('pnpm-')) content = content.replaceAll(pin, candidate)
    writeFileSync(join(dir, file), content)
  }
  for (const [name, value] of Object.entries(manifest.devDependencies)) {
    if (!name.startsWith('@deepseek-ai/')) continue
    const version = candidate && name.startsWith('@deepseek-ai/dsh-') ? candidate : value
    manifest.devDependencies[name] = version
    const packageDir = join(dir, 'node_modules', name)
    mkdirSync(packageDir, { recursive: true })
    writeFileSync(join(packageDir, 'package.json'), JSON.stringify({ name, version }))
  }
  if (candidate) for (const name of contract.core) manifest.peerDependencies[name] = [...contract.supported, candidate].join(' || ')
  const schemaDir = join(dir, 'node_modules/@deepseek-ai/schemastery')
  mkdirSync(schemaDir, { recursive: true })
  const schema = createRequire(join(root, 'package.json'))('@deepseek-ai/schemastery/package.json').version
  writeFileSync(join(schemaDir, 'package.json'), JSON.stringify({ version: schema }))
  writeFileSync(join(dir, 'package.json'), JSON.stringify(manifest))
  return dir
}

describe('probe boundaries', () => {
  it.each(['## DSH 兼容性', '## DSH compatibility'])('reads complete exact releases in %s', heading => {
    const versions = ['0.2.0', '0.2.3-alpha-hotfix.1', '0.2.3-0.1', '0.2.3-01a.--']
    const markdown = `0.1.0\n${heading}\n${versions.map(version => `\`${version}\``).join(' / ')}\n## Next\n0.3.0`
    expect(readmeVersions(markdown, heading)).toEqual(versions)
    expect(readmeVersions(`${heading}\nSupported: ${versions.join(', ')}.\n`, heading)).toEqual(versions)
    const invalid = ['01.2.3', '0.2.3-alpha.01', '0.2.3-alpha_bad', '0.2.3-', '0.2.3+build']
    expect(readmeVersions(`${heading}\n${invalid.join(' / ')}`, heading)).toEqual([])
  })

  it('accepts a promoted hyphenated prerelease in both README support lists', () => {
    const dir = fixture()
    const previous = readContract(dir).supported[0]
    for (const file of ['src/compat/dsh-version.ts', 'package.json', 'README.md', 'README.en.md']) {
      const path = join(dir, file)
      writeFileSync(path, readFileSync(path, 'utf8').replaceAll(previous, '0.2.3-alpha-hotfix.1'))
    }
    expect(assessRepository(dir).ok).toBe(true)
  })

  it('uses exact SemVer and standard pre-1.0 caret bounds', () => {
    for (const invalid of ['01.2.3', '0.2.3-alpha.01', '0.2.3-alpha_bad', '0.2.3-', '0.2.3;echo']) expect(isExactVersion(invalid)).toBe(false)
    expect(isExactVersion('0.2.3-alpha-foo.1')).toBe(true)
    expect(rangeAdmits('^0.1.2', '0.2.0')).toBe(false)
    expect(rangeAdmits('^0.0.2', '0.0.3')).toBe(false)
    expect(() => readStringArray("export const X = ['0.2.0', dynamic]", 'X')).toThrow(/string literals/)
  })

  it('only relaxes a uniform explicitly named candidate, never mixed or incomplete trees', () => {
    const dir = fixture('9.9.9-alpha-hotfix.1')
    expect(assessRepository(dir).ok).toBe(false)
    expect(assessRepository(dir, { candidate: '9.9.9-alpha-hotfix.1' }).ok).toBe(true)
    const readme = readFileSync(join(dir, 'README.md'), 'utf8')
    writeFileSync(join(dir, 'README.md'), readme.replace('0.1.5-rc.2', '9.9.9-alpha.1'))
    expect(assessRepository(dir, { candidate: '9.9.9-alpha-hotfix.1' }).failures.some((f: { code: string }) => f.code === 'readme')).toBe(true)
    writeFileSync(join(dir, 'README.md'), readme)
    expect(assessRepository(dir, { candidate: '9.9.9-alpha.2' }).ok).toBe(false)
    writeFileSync(join(dir, 'node_modules/@deepseek-ai/dsh-client-ui-theme/package.json'), JSON.stringify({ version: '9.9.9-alpha.2' }))
    expect(assessRepository(dir, { candidate: '9.9.9-alpha-hotfix.1' }).diagnosis).toBe('mixed installation')
    rmSync(join(dir, 'node_modules/@deepseek-ai/dsh-settings'), { recursive: true })
    expect(assessRepository(dir, { candidate: '9.9.9-alpha-hotfix.1' }).diagnosis).toBe('incomplete installation')
  })

  it('distinguishes absent optional packages from broken installed metadata', () => {
    const dir = fixture()
    const require = createRequire(join(dir, 'package.json'))
    expect(readInstalledVersion(require, '@deepseek-ai/not-installed')).toBeUndefined()
    writeFileSync(join(dir, 'node_modules/@deepseek-ai/dsh-client-ui-theme/package.json'), '{broken')
    expect(() => readInstalledVersion(require, '@deepseek-ai/dsh-client-ui-theme')).toThrow()
    expect(assessRepository(dir).failures.some((f: { code: string, message: string }) => f.code === 'resolution' && f.message.includes('present'))).toBe(true)
  })

  it('refuses candidate peer mutation in a local git checkout before reading metadata', () => {
    const dir = fixture()
    mkdirSync(join(dir, '.git'))
    const before = readFileSync(join(dir, 'package.json'), 'utf8')
    if (process.env.GITHUB_ACTIONS === 'true') return
    expect(() => repointInstallation(dir, '9.9.9-alpha.1', { admitCandidate: true })).toThrow(/isolated copy/)
    expect(readFileSync(join(dir, 'package.json'), 'utf8')).toBe(before)
  })
})
