/** Uses compiled pure modules; no browser loader or UI runtime is required. */
import { BUILTIN_PRESETS } from '../lib/types/client/presets.js'
import { validateThemeContrast } from '../lib/types/client/contrast.js'

const flags = new Set(process.argv.slice(2))
for (const flag of flags) {
  if (!['--json', '--strict'].includes(flag)) throw new Error(`unknown option: ${flag}`)
}
const reports = BUILTIN_PRESETS.map(preset => validateThemeContrast(preset))
if (flags.has('--json')) {
  console.log(JSON.stringify(reports, null, 2))
} else {
  for (const report of reports) {
    const failed = report.checks.filter(check => check.status === 'failed')
    const unknown = report.checks.filter(check => check.status === 'unknown')
    console.log(`${report.themeId}: ${report.passed ? 'PASS' : 'FAIL'} (${failed.length} below minimum, ${unknown.length} unknown, ${report.checks.length} checks)`)
    for (const check of [...failed, ...unknown]) {
      console.log(`  ${check.scheme} ${check.id}: ${check.ratio === null ? check.reason : `${check.ratio.toFixed(3)}:1 < ${check.minimum}:1`}`)
    }
  }
}
if (reports.some(report => report.checks.some(check => check.status === 'unknown'))
  || (flags.has('--strict') && reports.some(report => !report.passed))) process.exitCode = 1
