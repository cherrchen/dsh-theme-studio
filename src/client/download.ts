/** Browser download of a text file via a transient object URL. */

/**
 * Trigger a download for one text payload.
 * @param name - suggested file name.
 * @param text - file contents.
 */
export function downloadTextFile(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  URL.revokeObjectURL(url)
}
