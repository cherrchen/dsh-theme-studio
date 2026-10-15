/**
 * Standalone theme-file validator shipped as `lib/validate-theme.js`. The
 * Theme Creator skill teaches the model to run `node <this> <file>` inside a
 * workspace shell; the JSON report mirrors what the Import dialog enforces,
 * so a file that passes here also parses in the UI.
 */

import { readFileSync } from 'node:fs'
import { argv, exit, stdout } from 'node:process'
import { reportOf, type ValidateReport } from './creator/report.ts'

function emit(report: ValidateReport): void {
  stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

const file = argv[2]
if (file === undefined || argv.length > 3) {
  stdout.write('usage: node lib/validate-theme.js <theme.dsh-theme.json>\n')
  exit(2)
}

let text: string
try {
  text = readFileSync(file, 'utf8')
} catch (error) {
  emit({
    ok: false,
    format: {
      ok: false,
      error: {
        code: 'read-failed',
        detail: error instanceof Error ? error.message : String(error),
      },
    },
  })
  exit(1)
}

const report = reportOf(text)
emit(report)
exit(report.ok ? 0 : 1)
