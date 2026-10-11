import { afterEach, describe, expect, it } from 'vitest'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { STAGE1_TOKENS } from '../../src/client/types.ts'

const root = fileURLToPath(new URL('../..', import.meta.url))
const fixtures: string[] = []
afterEach(() => { for (const dir of fixtures.splice(0)) rmSync(dir, { recursive: true, force: true }) })

function auditFixture() {
  const dir = mkdtempSync(join(tmpdir(), 'theme-studio-token-audit-'))
  fixtures.push(dir)
  for (const file of ['scripts/audit-theme-tokens.mjs', 'scripts/lib/token-audit.mjs', 'scripts/lib/contract.mjs', 'scripts/lib/exact-pin.mjs', 'src/client/types.ts', 'src/client/presets.ts', 'src/client/chrome-tokens.ts']) {
    mkdirSync(join(dir, file, '..'), { recursive: true })
    cpSync(join(root, file), join(dir, file))
  }
  writeFileSync(join(dir, 'package.json'), '{"type":"module"}')
  const theme = join(dir, 'node_modules/@deepseek-ai/dsh-client-ui-theme')
  mkdirSync(theme, { recursive: true })
  writeFileSync(join(theme, 'package.json'), '{"exports":{"./client":"./client.js"}}')
  writeFileSync(join(theme, 'client.js'), STAGE1_TOKENS.join('\n'))
  return dir
}

describe('token audit command', () => {
  it('accepts the implemented mappings against an upstream bundle with all required tokens', () => {
    const dir = auditFixture()
    const result = spawnSync(process.execPath, ['scripts/audit-theme-tokens.mjs'], { cwd: dir, encoding: 'utf8' })
    expect(result.status, result.stderr).toBe(0)
  })

  it('fails when a required mapping is deleted even though the contract and upstream still name it', () => {
    const dir = auditFixture()
    const file = join(dir, 'src/client/presets.ts')
    const source = readFileSync(file, 'utf8')
    const mapping = "    '--dsw-alias-bg-base': palette.bgBase,"
    expect(source).toContain(mapping)
    writeFileSync(file, source.replace(mapping, ''))
    const result = spawnSync(process.execPath, ['scripts/audit-theme-tokens.mjs'], { cwd: dir, encoding: 'utf8' })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('--dsw-alias-bg-base is not covered by the builtin presets')
  })
})
