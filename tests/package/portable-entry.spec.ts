import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('portable entries', () => {
  it('does not probe packages or import Electron from the host or client entry', () => {
    const host = readFileSync(new URL('../../src/index.ts', import.meta.url), 'utf8')
    const client = readFileSync(new URL('../../src/client/index.ts', import.meta.url), 'utf8')
    for (const source of [host, client]) {
      expect(source).not.toContain('createRequire')
      expect(source).not.toContain('node:')
      expect(source).not.toContain('electron')
      expect(source).not.toContain('ctx.desktop')
      expect(source).not.toContain('dsh-version')
    }
  })
})
