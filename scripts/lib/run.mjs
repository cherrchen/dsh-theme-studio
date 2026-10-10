/** Run a command and keep the full log beside the live console stream. */
import { spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'

/**
 * @param command - executable.
 * @param args - arguments.
 * @param options - cwd, env, and the log file to write.
 * @returns the exit code.
 */
export function runLogged(command, args, options) {
  const file = process.platform === 'win32' && command === 'pnpm' ? 'pnpm.cmd' : command
  return new Promise((resolve, reject) => {
    const log = createWriteStream(options.logFile)
    const child = spawn(file, args, {
      cwd: options.cwd,
      env: options.env,
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const write = (chunk) => {
      process.stdout.write(chunk)
      log.write(chunk)
    }
    child.stdout.on('data', write)
    child.stderr.on('data', write)
    child.on('error', (error) => {
      log.end()
      reject(error)
    })
    child.on('close', (code) => {
      log.end(() => resolve(code ?? 1))
    })
  })
}
