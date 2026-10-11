import { readFileSync } from 'node:fs'

/** Missing optional packages are allowed; exports, IO and JSON errors propagate. */
export function readInstalledVersion(require, name) {
  let path
  try {
    path = require.resolve(`${name}/package.json`)
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') return undefined
    throw error
  }
  const manifest = JSON.parse(readFileSync(path, 'utf8'))
  if (typeof manifest.version !== 'string') throw new Error(`${name} has no package version`)
  return manifest.version
}
