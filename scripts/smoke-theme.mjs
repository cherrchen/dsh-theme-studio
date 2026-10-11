/** Re-run the official ThemeRuntime behavior matrix and record its exit status. */
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const files = [
  'tests/integration/official-behavior-matrix.spec.ts',
  'tests/integration/theme-runtime.spec.ts',
  'tests/integration/font-preference.spec.ts',
]
const file = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const child = spawn(file, ['exec', 'vitest', 'run', ...files], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, CI: 'true' },
})
const code = await new Promise((resolve, reject) => {
  child.on('error', reject)
  child.on('close', value => resolve(value ?? 1))
})
const report = { status: code === 0 ? 'passed' : 'failed', exitCode: code, files, runtime: 'official ThemeRuntime bundle' }
console.log(`[smoke:theme] ${JSON.stringify(report)}`)
process.exit(code)
