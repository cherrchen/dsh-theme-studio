/** Invoke npm without a shell. Windows resolves npm through node.exe. */
import { execFileSync } from 'node:child_process'
import { win32 } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * @param args - npm arguments, without the executable.
 * @param platform - override for tests.
 * @param nodePath - node executable used to find the Windows npm CLI.
 * @returns the file and argument list for execFile.
 */
export function npmInvocation(args, platform = process.platform, nodePath = process.execPath) {
  if (platform !== 'win32') return { file: 'npm', args }
  const cli = win32.join(win32.dirname(nodePath), 'node_modules', 'npm', 'bin', 'npm-cli.js')
  return { file: nodePath, args: [cli, ...args] }
}

/**
 * @param args - npm arguments.
 * @returns stdout. npm warnings on stderr are ignored when the exit code is 0.
 */
export function npmOutput(args) {
  const invocation = npmInvocation(args)
  try {
    return execFileSync(invocation.file, invocation.args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 32 * 1024 * 1024,
      timeout: 60000,
    })
  } catch (error) {
    const stderr = typeof error.stderr === 'string' ? error.stderr : error.stderr?.toString?.() ?? ''
    const stdout = typeof error.stdout === 'string' ? error.stdout : error.stdout?.toString?.() ?? ''
    throw new Error(`npm ${args.join(' ')} failed\n${stderr || stdout || error.message}`)
  }
}

/** Resolve a metadata frontier with bounded concurrency, retaining npm's auth/config. */
export function npmOutputBatch(requests) {
  const output = execFileSync(process.execPath, [fileURLToPath(new URL('./npm-batch.mjs', import.meta.url))], {
    input: JSON.stringify(requests),
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  const rows = JSON.parse(output)
  for (const row of rows) if (row.error) throw new Error(row.error)
  return rows.map(row => row.stdout)
}
