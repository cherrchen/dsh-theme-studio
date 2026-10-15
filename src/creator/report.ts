/**
 * Pure report builder behind the `lib/validate-theme.js` CLI. Kept separate
 * from argv/file wiring so the format is unit-testable.
 */

import { compileThemeFile, parseThemeFile, type ThemeFileError } from '../client/theme-file.ts'
import { validateThemeContrast, type ThemeContrastCheck } from '../client/contrast.ts'

/** One non-passing contrast check in the report. */
export interface ContrastIssue {
  readonly id: string
  readonly scheme: 'light' | 'dark'
  readonly status: 'failed' | 'unknown'
  readonly ratio: number | null
  readonly minimum: number
  readonly reason?: string
}

/** Machine-readable report printed to stdout. */
export interface ValidateReport {
  /** True only when the file parses and every contrast check passes. */
  readonly ok: boolean
  readonly format: {
    readonly ok: boolean
    readonly error?: ThemeFileError
  }
  readonly contrast?: {
    readonly passed: boolean
    readonly total: number
    readonly failed: number
    readonly unknown: number
    /** Non-passing checks, in declaration order. */
    readonly issues: readonly ContrastIssue[]
  }
}

function issueOf(check: ThemeContrastCheck): ContrastIssue {
  return {
    id: check.id,
    scheme: check.scheme,
    status: check.status === 'failed' ? 'failed' : 'unknown',
    ratio: check.ratio,
    minimum: check.minimum,
    ...(check.reason === undefined ? {} : { reason: check.reason }),
  }
}

/**
 * Validate one theme file's text end to end: parse, compile, and run the
 * scoped contrast diagnostics. Never throws — read failures are reported by
 * the caller; every validation outcome is data.
 * @param text - raw file contents.
 * @returns the report the CLI prints.
 */
export function reportOf(text: string): ValidateReport {
  const parsed = parseThemeFile(text)
  if (!parsed.ok) {
    return { ok: false, format: { ok: false, error: parsed.error } }
  }
  const report = validateThemeContrast(compileThemeFile(parsed.file))
  const issues = report.checks.filter(check => check.status !== 'passed').map(issueOf)
  const failed = report.checks.filter(check => check.status === 'failed').length
  const unknown = report.checks.filter(check => check.status === 'unknown').length
  return {
    ok: report.passed,
    format: { ok: true },
    contrast: {
      passed: report.passed,
      total: report.checks.length,
      failed,
      unknown,
      issues,
    },
  }
}
