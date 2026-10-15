/**
 * Theme-file import/export orchestration shared by the Client wiring and
 * tests: inspection (parse + contrast summary + collision), persistence of
 * the imported list, preview-after-accept, and download.
 */

import type { ThemeStudioRegistry } from './catalog.ts'
import { validateThemeContrast } from './contrast.ts'
import { downloadTextFile } from './download.ts'
import type { ThemeStudioRuntime } from './runtime.ts'
import {
  compileThemeFile, parseThemeFile, serializeThemeFile, themeFileForPreset, themeFileName,
  uniqueThemeId, type DshThemeFile, type ThemeFileError,
} from './theme-file.ts'

/** Aggregate contrast outcome shown on the import confirmation dialog. */
export interface ImportContrastSummary {
  readonly failed: number
  readonly unknown: number
}

/** Id carried by a raw stored entry; `undefined` for unreadable shapes. */
function storedId(entry: unknown): unknown {
  return typeof entry === 'object' && entry !== null
    ? (entry as Record<string, unknown>)['id']
    : undefined
}

/** Inspection of one file: parse, compile, collision, and contrast counts. */
export type ThemeFileInspection =
  | {
    readonly ok: true
    readonly file: DshThemeFile
    /** Verbatim object to store in settings. */
    readonly source: Record<string, unknown>
    /** `imported` when an imported theme already owns the id. */
    readonly collision: 'imported' | null
    readonly summary: ImportContrastSummary
  }
  | { readonly ok: false; readonly error: ThemeFileError }

/**
 * Read one theme file without touching settings or overlays. A builtin id
 * collision is impossible: file ids cannot use the `dsh-theme-studio.` prefix.
 * @param text - file contents.
 * @param registry - catalog consulted for collisions and diagnostics.
 * @param runtime - when given, an in-flight import write also collides.
 * @returns inspection result for the confirmation flow.
 */
export function inspectThemeFile(text: string, registry: ThemeStudioRegistry, runtime?: ThemeStudioRuntime): ThemeFileInspection {
  const parsed = parseThemeFile(text)
  if (!parsed.ok) return { ok: false, error: parsed.error }
  const preset = compileThemeFile(parsed.file)
  const report = validateThemeContrast(preset)
  const summary: ImportContrastSummary = {
    failed: report.checks.filter(check => check.status === 'failed').length,
    unknown: report.checks.filter(check => check.status === 'unknown').length,
  }
  return {
    ok: true,
    file: parsed.file,
    source: parsed.source,
    collision: importIdTaken(registry, parsed.file.id, runtime) ? 'imported' : null,
    summary,
  }
}

/** How one confirmed import lands in the durable list. */
export type ImportResolution = 'append' | 'replace' | 'rename'

/**
 * Whether an imported theme already owns `id`, counting an in-flight write
 * the catalog has not adopted yet. Rechecked at confirm time so a dialog
 * opened on a stale inspection cannot append a durable duplicate.
 * @param registry - catalog holding the accepted imported list.
 * @param id - theme id to check.
 * @param runtime - owner of the pending write, when available.
 * @returns true when the id is claimed.
 */
export function importIdTaken(
  registry: ThemeStudioRegistry,
  id: string,
  runtime?: ThemeStudioRuntime,
): boolean {
  if (registry.isImported(id)) return true
  return runtime?.requestedImportedSources()?.some(entry => storedId(entry) === id) === true
}

/**
 * Persist an imported theme file. `replace` overwrites the same-id entry in
 * place; `rename` stores the file under the first free `id-N` suffix. The
 * merge base is the pending request or the accepted raw array, so entries
 * the strict parser skipped survive the edit. An `append` whose id was
 * claimed after the inspection keeps both files under a fresh id.
 * @param runtime - owner of the settings write.
 * @param registry - catalog holding the current imported list.
 * @param source - the file object to store.
 * @param mode - collision resolution.
 * @returns the id the theme lands under.
 */
export function saveImportedTheme(
  runtime: ThemeStudioRuntime,
  registry: ThemeStudioRegistry,
  source: Record<string, unknown>,
  mode: ImportResolution,
): string {
  // Merge on the newest requested list when a write is still in flight;
  // otherwise the accepted raw array keeps entries the parser skipped.
  const stored = [...(
    runtime.editableImportedSources() ?? registry.importedEntries().map(entry => entry.source)
  )]
  let finalId = source['id'] as string
  let next: unknown[]
  if (mode === 'replace' && stored.some(entry => storedId(entry) === finalId)) {
    next = stored.map(entry => storedId(entry) === finalId ? source : entry)
  } else {
    // An 'append' confirmed on a stale collision keeps both files under a
    // fresh id instead of writing a durable duplicate.
    if (mode === 'rename' || stored.some(entry => storedId(entry) === finalId)) {
      const taken = new Set<string>([
        ...registry.list().map(preset => preset.id),
        ...stored.flatMap((entry): string[] => {
          const id = storedId(entry)
          return typeof id === 'string' ? [id] : []
        }),
      ])
      finalId = uniqueThemeId(finalId, taken)
      source = { ...source, id: finalId }
    }
    next = [...stored, source]
  }
  runtime.saveImportedThemes(next)
  return finalId
}

/**
 * Persist the imported list without one theme.
 * @param runtime - owner of the settings write.
 * @param registry - catalog holding the current imported list.
 * @param id - imported theme id to drop.
 */
export function removeImportedTheme(
  runtime: ThemeStudioRuntime,
  registry: ThemeStudioRegistry,
  id: string,
): void {
  const stored = runtime.editableImportedSources() ?? registry.importedEntries().map(entry => entry.source)
  runtime.saveImportedThemes(stored.filter(entry => storedId(entry) !== id))
}

/**
 * Preview a theme after its durable write lands in the catalog.
 * Wait for settlement and match the requested source, including replacements
 * whose id already exists. The listener self-removes on success or failure.
 * @param registry - catalog holding the accepted imported sources.
 * @param runtime - owner of the preview layer.
 * @param id - the id the import landed under.
 */
export function previewWhenImported(
  registry: ThemeStudioRegistry,
  runtime: ThemeStudioRuntime,
  id: string,
): void {
  const requested = runtime.requestedImportedSources()?.find(entry => storedId(entry) === id)
  const signature = requested === undefined ? undefined : JSON.stringify(requested)
  let off: (() => void) | undefined
  let stopped = false
  const stop = (): void => {
    stopped = true
    off?.()
    off = undefined
  }
  const check = (): void => {
    if (stopped || runtime.requestedImportedSources() !== undefined) return
    const snapshot = runtime.getSnapshot()
    if (snapshot.settingsStatus !== 'ready' && !snapshot.saveError) return
    stop()
    if (snapshot.settingsStatus !== 'ready' || snapshot.saveError || registry.get(id) === undefined) return
    if (signature !== undefined && JSON.stringify(registry.sourceOf(id)) !== signature) return
    try {
      runtime.previewTheme(id)
    } catch { /* disposed runtime */ }
  }
  off = runtime.subscribe(check)
  check()
}

/**
 * Download one theme as a `dsh-theme.json` file. Imported themes round-trip
 * their stored source; builtin presets export their palette under a `user.` id.
 * @param registry - catalog consulted for the theme.
 * @param id - theme id to export.
 * @returns false when the id is unknown.
 */
export function exportThemeById(registry: ThemeStudioRegistry, id: string): boolean {
  const preset = registry.get(id)
  if (preset === undefined) return false
  const source = registry.sourceOf(id) ?? themeFileForPreset(preset)
  downloadTextFile(themeFileName(String(source['id'] ?? id)), serializeThemeFile(source))
  return true
}
