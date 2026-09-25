/** Generate release notes from conventional commits: `node scripts/release-notes.mjs <tag>`. */

import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

function git(args) {
  const result = spawnSync('git', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed:\n${(result.stderr || result.stdout || '').trim()}`)
  return result.stdout
}

try {
  const tag = process.argv[2]
  if (!tag) throw new Error('Usage: node scripts/release-notes.mjs <tag>')
  const tags = git(['tag', '--sort=-creatordate']).trim().split('\n').filter((item) => item && item !== tag)
  const previous = tags[0]
  const range = previous ? `${previous}..${tag}` : tag
  const commits = git(['log', '--pretty=%H%x00%s', range]).trim().split('\n').filter(Boolean).map((line) => {
    const [hash, subject] = line.split('\0')
    return { hash, subject }
  })
  if (!commits.length) throw new Error(`No commits found in range ${range}`)
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  const repo = manifest.repository.url.replace(/^git\+/, '').replace(/\.git$/, '')
  const sections = [
    { types: ['feat'], title: 'Features' },
    { types: ['fix'], title: 'Bug Fixes' },
    { types: ['perf', 'refactor'], title: 'Improvements' },
    { types: ['docs'], title: 'Documentation' },
    { types: [], title: 'Other Changes' },
  ]
  const conventional = /^(\w+)(?:\(([^)]*)\))?(!)?: (.+)$/
  const lines = [`## ${tag}`]
  for (const section of sections) {
    const entries = commits.filter(({ subject }) => {
      const match = subject.match(conventional)
      return section.types.length ? section.types.includes(match?.[1]) : !match || !sections.some((item) => item.types.includes(match[1]))
    })
    if (!entries.length) continue
    lines.push('', `### ${section.title}`, '')
    for (const { hash, subject } of entries) {
      const match = subject.match(conventional)
      const label = match ? `${match[3] ? '⚠️ **Breaking:** ' : ''}${match[2] ? `**${match[2]}**: ` : ''}${match[4]}` : subject
      lines.push(`- ${label} ([\`${hash.slice(0, 7)}\`](${repo}/commit/${hash}))`)
    }
  }
  if (previous) lines.push('', `**Full Changelog**: ${repo}/compare/${previous}...${tag}`)
  process.stdout.write(lines.join('\n') + '\n')
} catch (error) {
  console.error(String(error instanceof Error ? error.message : error))
  process.exitCode = 1
}
