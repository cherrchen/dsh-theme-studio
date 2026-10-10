/** One exact version named by a single exact, caret, or tilde range. */

const NUMBER = '(?:0|[1-9]\\d*)'
const IDENTIFIER = '(?:0|[1-9]\\d*|\\d*[A-Za-z-][0-9A-Za-z-]*)'
export const EXACT_VERSION_PATTERN = `${NUMBER}\\.${NUMBER}\\.${NUMBER}(?:-${IDENTIFIER}(?:\\.${IDENTIFIER})*)?`
const EXACT = new RegExp(`^(${EXACT_VERSION_PATTERN})$`, 'u')
const MARKED = new RegExp(`^[\\^~](${EXACT_VERSION_PATTERN})$`, 'u')

/**
 * The version a single exact, caret, or tilde range names.
 * Compound ranges are refused: picking one side would be a guess.
 * @param range - the declared range.
 * @param label - where the range was read, for the error.
 * @returns the named version, including a prerelease when the range has one.
 */
export function exactPin(range, label) {
  if (typeof range !== 'string') throw new Error(`${label}: dependency range is not a string`)
  const match = EXACT.exec(range) ?? MARKED.exec(range)
  if (match === null) {
    throw new Error(`${label}: ${JSON.stringify(range)} is not a single exact, caret, or tilde version`)
  }
  return match[1]
}

/** @param version - a version string. @returns whether it is an exact release. */
export function isExactVersion(version) {
  return typeof version === 'string' && EXACT.test(version)
}
