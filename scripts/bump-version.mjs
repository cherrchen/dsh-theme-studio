/** Bump package.json version: `pnpm release <patch|minor|major|prerelease|<semver>> [--pre <id>] [--tag]`. */

import { readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const USAGE = `Usage: pnpm release <patch|minor|major|prerelease|<semver>> [--pre <id>] [--tag]
Examples:
  pnpm release patch
  pnpm release minor --tag
  pnpm release 1.2.3 --tag
  pnpm release prerelease --pre rc`
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.[0-9a-zA-Z-]+)*))?$/

function git(args) {
  const result = spawnSync('git', args, { encoding: 'utf8' })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed:\n${(result.stderr || result.stdout || '').trim()}`)
  return result.stdout
}

function parseArgs(args) {
  const positional = []
  const options = { pre: undefined, tag: false }
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--tag') options.tag = true
    else if (args[i] === '--pre') {
      const value = args[++i]
      if (!value || value.startsWith('--')) throw new Error('--pre requires an identifier\n\n' + USAGE)
      options.pre = value
    } else if (args[i].startsWith('--')) throw new Error(`Unknown option: ${args[i]}\n\n${USAGE}`)
    else positional.push(args[i])
  }
  if (positional.length !== 1) throw new Error(USAGE)
  return { bump: positional[0], ...options }
}

function nextVersion(current, bump, pre) {
  const match = current.match(SEMVER)
  if (!match) throw new Error(`Current version ${current} is not valid semver`)
  if (bump === 'prerelease') {
    const [, major, minor, patch, existing] = match
    if (!existing) return `${major}.${minor}.${Number(patch) + 1}-${pre ?? 'rc'}.1`
    const [id, number] = existing.split('.')
    const nextId = pre ?? id
    return `${major}.${minor}.${patch}-${nextId}.${nextId === id ? Number(number ?? 0) + 1 : 1}`
  }
  if (['patch', 'minor', 'major'].includes(bump)) {
    let [major, minor, patch] = [Number(match[1]), Number(match[2]), Number(match[3])]
    if (bump === 'major') { major++; minor = 0; patch = 0 }
    else if (bump === 'minor') { minor++; patch = 0 }
    else patch++
    return `${major}.${minor}.${patch}${pre === undefined ? '' : `-${pre}`}`
  }
  if (!SEMVER.test(bump)) throw new Error(`Invalid version or bump kind: ${bump}\n\n${USAGE}`)
  if (bump === current) throw new Error(`Version is already ${bump}`)
  return bump
}

function writeVersion(version) {
  const path = new URL('../package.json', import.meta.url)
  const text = readFileSync(path, 'utf8')
  const updated = text.replace(/^(  "version": ")[^"]*(",?)$/m, `$1${version}$2`)
  if (updated === text) throw new Error('Could not find the version field in package.json')
  writeFileSync(path, updated)
}

function commitAndTag(version) {
  const status = git(['status', '--porcelain'])
  const unrelated = status.split('\n').filter((line) => line.trim() && !line.startsWith('??') && line.slice(3) !== 'package.json')
  if (unrelated.length) throw new Error('Refusing to tag: working tree has changes other than package.json:\n' + unrelated.join('\n'))
  const tag = `v${version}`
  if (git(['tag', '-l', tag]).trim()) throw new Error(`Tag ${tag} already exists`)
  git(['add', 'package.json'])
  git(['commit', '-m', `chore(release): ${tag}`])
  git(['tag', '-a', tag, '-m', tag])
  console.log(`Committed package.json and created annotated tag ${tag}.`)
  console.log('Publish it with: git push origin main --follow-tags')
}

try {
  const { bump, pre, tag } = parseArgs(process.argv.slice(2))
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  const version = nextVersion(manifest.version, bump, pre)
  if (tag) {
    const status = git(['status', '--porcelain']).trim()
    if (status) throw new Error('Refusing to tag: commit the changelog and leave a clean worktree first.')
    const tagName = `v${version}`
    if (git(['tag', '-l', tagName]).trim()) throw new Error(`Tag ${tagName} already exists`)
  }
  writeVersion(version)
  console.log(`${manifest.version} -> ${version}`)
  if (tag) commitAndTag(version)
  else console.log('package.json updated (not committed).')
} catch (error) {
  console.error(String(error instanceof Error ? error.message : error))
  process.exitCode = 1
}
