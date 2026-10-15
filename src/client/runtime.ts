/** Theme Studio overlay runtime: active/preview layers and settings adoption. */

import type { ThemeSettingsHost } from '../compat/settings-client.ts'
import type { ThemeTokenOverrides } from '@deepseek-ai/dsh-client-ui-theme/client'
import {
  ACTIVE_SOURCE, ACTIVE_THEME_ID_FIELD, CREATOR_AGENT_MODE_FIELD, IMPORTED_THEMES_FIELD,
  PREVIEW_SOURCE, THEME_STUDIO_SETTINGS_NAMESPACE, creatorAgentModeOf,
  type CreatorAgentMode, type ThemeStudioSettings,
} from '../constants.ts'
import { presetToOverrides } from './adapter.ts'
import { withoutOfficialFontTokens } from './font-boundary.ts'
import { parseStoredThemeFiles, type StoredThemeEntry } from './theme-file.ts'
import type { BuiltinThemePreset, ThemeCatalog } from './types.ts'

export {
  ACTIVE_SOURCE, ACTIVE_THEME_ID_FIELD, IMPORTED_THEMES_FIELD, PREVIEW_SOURCE,
  THEME_STUDIO_SETTINGS_NAMESPACE,
}

/** Structural ThemeRuntime face consumed by this plugin. */
export interface ThemeOverrideSurface {
  /**
   * Stack or replace one overlay layer.
   * @param source - layer identity.
   * @param tokens - per-token light/dark values.
   * @returns disposer for the layer created by this call.
   */
  overrideTokens(source: string, tokens: ThemeTokenOverrides): () => void
}

/** Published Theme Studio state for the Settings UI. */
export interface ThemeStudioSnapshot {
  /** Persisted overlay id, or `null` for Default. */
  activeThemeId: string | null
  /** Preview overlay id, or `null` when previewing Default or not previewing. */
  previewThemeId: string | null
  /** Whether a transient preview is installed. */
  previewing: boolean
  /** Settings-scope readiness. */
  settingsStatus: 'loading' | 'ready' | 'unavailable'
  /** The latest save was rejected and the visible theme was restored from the accepted snapshot. */
  saveError: boolean
  /** Stored theme-file entries skipped as unreadable in the latest adoption. */
  droppedImports: number
  /** Theme Creator skill visibility adopted from the durable section. */
  creatorMode: CreatorAgentMode
  /** Monotonic change counter. */
  revision: number
}

/** Mutable imported-theme section the runtime feeds from durable settings. */
export interface ImportedThemeSink {
  /**
   * Replace the imported section; a no-op when unchanged.
   * @param entries - compiled presets paired with their stored sources.
   * @returns true when the visible set changed.
   */
  setImported(entries: readonly StoredThemeEntry[]): boolean
  /** Whether an id currently resolves to an imported theme. */
  isImported(id: string): boolean
}

/** Construction inputs. The runtime shares the public service's catalog. */
export interface ThemeStudioRuntimeOptions {
  /** Official ThemeRuntime or a test double. */
  theme: ThemeOverrideSurface
  /** Durable Theme Studio section; omitted when settings are unavailable. */
  host: ThemeSettingsHost<ThemeStudioSettings> | undefined
  /**
   * Theme lookup used by activate/preview. A catalog that also implements
   * {@link ImportedThemeSink} — `ThemeStudioRegistry` does — additionally
   * receives the durable imported list from each accepted snapshot. The sink
   * is derived from this object so the runtime and the public catalog can
   * never observe divergent imported sections.
   */
  catalog: ThemeCatalog
}

/** A catalog carrying the imported-section sink face. */
function isImportedThemeSink(catalog: ThemeCatalog): catalog is ThemeCatalog & ImportedThemeSink {
  const candidate = catalog as Partial<ImportedThemeSink>
  return typeof candidate.setImported === 'function' && typeof candidate.isImported === 'function'
}

function normalizeId(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string' || value.length === 0) return null
  return value
}

/**
 * Owns Theme Studio overlay layers. The Host settings snapshot is the durable
 * authority; visual state may update optimistically and then reconverge.
 */
export class ThemeStudioRuntime {
  private readonly theme: ThemeOverrideSurface
  private readonly host: ThemeSettingsHost<ThemeStudioSettings> | undefined
  private readonly catalog: ThemeCatalog
  private readonly imports: ImportedThemeSink | undefined
  private readonly listeners = new Set<() => void>()
  private readonly unsubscribeHost: (() => void) | undefined
  private activeDisposer: (() => void) | undefined
  private previewDisposer: (() => void) | undefined
  /** Own settings writes not yet settled. Adoption waits so an older echo cannot revert a newer choice. */
  private pendingWrites = 0
  /** Rejection flag of the newest write. An older settlement must not replace it. */
  private latestRejected = false
  /** One Host `set` is in flight. A newer choice waits and is sent after it settles. */
  private drainingWrites = false
  /** Latest value per field not yet sent. Older unsent values per field are replaced. */
  private writeBacklog = new Map<string, unknown>()
  /**
   * Newest imported-themes array this runtime asked the Host to store. Read-back
   * base for follow-up edits before the accepted snapshot echoes the write.
   * May carry preserved raw entries the strict parser skipped.
   */
  private importedRequested: readonly unknown[] | undefined
  /**
   * Newest accepted raw `importedThemes` array, verbatim including entries the
   * strict parser skipped. Edits merge on it so unreadable entries survive.
   */
  private importedAccepted: readonly unknown[] | undefined
  /** Last id adopted from a ready Host snapshot. Optimistic choices do not update it. */
  private acceptedThemeId: string | null = null
  /** Unknown raw value whose repair write already failed. A later different value may retry. */
  private repairBlockedRaw: unknown = undefined
  private disposed = false
  private activeThemeId: string | null = null
  private previewThemeId: string | null = null
  private previewing = false
  private settingsStatus: ThemeStudioSnapshot['settingsStatus']
  private saveError = false
  private droppedImports = 0
  private creatorMode: CreatorAgentMode = 'off'
  private revision = 0
  private snapshot: ThemeStudioSnapshot

  /**
   * @param options - theme overlay surface, optional settings scope, and the shared catalog.
   */
  constructor(options: ThemeStudioRuntimeOptions) {
    this.theme = options.theme
    this.host = options.host
    this.catalog = options.catalog
    this.imports = isImportedThemeSink(options.catalog) ? options.catalog : undefined
    this.settingsStatus = options.host === undefined ? 'unavailable' : 'loading'
    this.snapshot = this.buildSnapshot()
    if (this.host !== undefined) {
      this.unsubscribeHost = this.host.subscribe(() => { this.adopt() })
    }
    this.adopt()
  }

  /**
   * Read the current immutable snapshot.
   * @returns the current snapshot (stable until the next change).
   */
  getSnapshot(): ThemeStudioSnapshot {
    return this.snapshot
  }

  /**
   * Observe snapshot replacements.
   * @param listener - invoked after each snapshot change.
   * @returns the disposer removing this listener.
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  /**
   * Install a transient overlay. Does not write settings. `null` previews Default
   * by temporarily removing the active overlay.
   * @param id - builtin theme id, or `null` for Default.
   */
  previewTheme(id: string | null): void {
    this.assertOpen()
    if (id === null) {
      this.disposePreviewLayer()
      this.clearActiveLayer()
      this.previewThemeId = null
      this.previewing = true
      this.publish()
      return
    }
    const preset = this.requirePreset(id)
    if (this.previewing && this.previewThemeId === null) this.ensureActiveLayer()
    this.installPreview(preset)
    this.previewThemeId = id
    this.previewing = true
    this.publish()
  }

  /** Remove the preview overlay and restore the active overlay. */
  cancelPreview(): void {
    this.assertOpen()
    if (!this.previewing) return
    this.disposePreviewLayer()
    if (this.previewThemeId === null) this.ensureActiveLayer()
    this.previewThemeId = null
    this.previewing = false
    this.publish()
  }

  /**
   * Persist the current preview as the active overlay.
   * No-op when nothing is being previewed.
   */
  applyPreview(): void {
    this.assertOpen()
    if (!this.previewing) return
    const id = this.previewThemeId
    if (id === null) {
      this.restoreDefault()
      return
    }
    const preset = this.requirePreset(id)
    this.installActive(preset)
    this.disposePreviewLayer()
    this.activeThemeId = id
    this.previewThemeId = null
    this.previewing = false
    this.saveError = false
    this.publish()
    void this.persist(id)
  }

  /**
   * Persist a builtin theme as the active overlay.
   * @param id - builtin theme id.
   */
  activateTheme(id: string): void {
    this.assertOpen()
    const preset = this.requirePreset(id)
    this.disposePreviewLayer()
    this.previewThemeId = null
    this.previewing = false
    this.installActive(preset)
    this.activeThemeId = id
    this.saveError = false
    this.publish()
    void this.persist(id)
  }

  /** Clear Theme Studio overlays without changing official Appearance. */
  restoreDefault(): void {
    this.assertOpen()
    this.disposePreviewLayer()
    this.clearActiveLayer()
    this.activeThemeId = null
    this.previewThemeId = null
    this.previewing = false
    this.saveError = false
    this.publish()
    void this.persist(null)
  }

  /**
   * Persist the imported theme-file list. The Host accepted snapshot stays the
   * durable authority; the catalog only changes when the write is adopted.
   * @param sources - stored theme-file entries in menu order; entries the
   *   strict parser cannot read are kept verbatim.
   */
  saveImportedThemes(sources: readonly unknown[]): void {
    this.assertOpen()
    if (this.host === undefined || this.settingsStatus !== 'ready') return
    this.importedRequested = [...sources]
    this.queueWrite(IMPORTED_THEMES_FIELD, this.importedRequested)
  }

  /**
   * Persist the Theme Creator visibility mode. The accepted snapshot echoes
   * the choice back through `creatorMode`; nothing optimistic is shown.
   * @param mode - visibility for the Theme Creator skill.
   */
  setCreatorMode(mode: CreatorAgentMode): void {
    this.assertOpen()
    if (this.host === undefined || this.settingsStatus !== 'ready') return
    this.queueWrite(CREATOR_AGENT_MODE_FIELD, mode)
  }

  /**
   * Imported list as last requested, while a write is pending or until the
   * next accepted snapshot makes the registry authoritative again.
   * @returns the requested array, or `undefined` when nothing is in flight.
   */
  requestedImportedSources(): readonly unknown[] | undefined {
    return this.importedRequested
  }

  /**
   * Merge base for imported-list edits: the newest requested array while a
   * write is pending, otherwise the accepted raw field — including entries
   * the strict parser skipped, so editing cannot silently delete them.
   * @returns the editing base, or `undefined` until a ready snapshot is adopted.
   */
  editableImportedSources(): readonly unknown[] | undefined {
    return this.importedRequested ?? this.importedAccepted
  }

  /** Drop overlays, listeners, and pending persist work. */
  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.pendingWrites = 0
    this.writeBacklog.clear()
    this.unsubscribeHost?.()
    this.disposePreviewLayer()
    this.clearActiveLayer()
    this.listeners.clear()
  }

  private adopt(): void {
    if (this.disposed) return
    if (this.host === undefined) {
      if (this.settingsStatus !== 'unavailable') {
        this.settingsStatus = 'unavailable'
        this.publish()
      }
      return
    }
    if (this.pendingWrites > 0) return
    let section: ReturnType<ThemeSettingsHost<ThemeStudioSettings>['getSnapshot']>
    try {
      section = this.host.getSnapshot()
    } catch {
      this.settingsStatus = 'unavailable'
      this.saveError = true
      this.revertToAccepted()
      this.publish()
      return
    }
    if (section.status !== 'ready') {
      if (this.settingsStatus !== section.status) {
        this.settingsStatus = section.status
        this.publish()
      }
      return
    }
    if (this.importedRequested !== undefined) {
      this.finishPersist()
      return
    }
    this.settingsStatus = 'ready'
    this.saveError = false
    this.syncImports(section.value)
    this.creatorMode = creatorAgentModeOf(section.value?.creatorAgentMode)
    this.applyDurable(section.value?.activeThemeId)
  }

  /**
   * Feed the durable `importedThemes` field into the catalog before resolving
   * `activeThemeId`, so imported ids never take the unknown-id repair path.
   * A changed imported section also reinstalls the active layer, drops a
   * preview whose theme vanished, and restacks a surviving preview on top —
   * overlay layers compose in install order, so a fresh active layer would
   * otherwise cover it.
   */
  private syncImports(value: ThemeStudioSettings | undefined): void {
    this.importedAccepted = Array.isArray(value?.importedThemes) ? value.importedThemes : undefined
    const { entries, dropped } = parseStoredThemeFiles(value?.importedThemes)
    const changed = this.imports?.setImported(entries) === true
    this.droppedImports = dropped
    if (!changed) return
    if (
      this.previewing && this.previewThemeId !== null
      && this.catalog.get(this.previewThemeId) === undefined
    ) {
      this.disposePreviewLayer()
      this.previewThemeId = null
      this.previewing = false
      this.ensureActiveLayer()
    }
    if (
      this.activeThemeId !== null
      && this.imports?.isImported(this.activeThemeId) === true
      && !(this.previewing && this.previewThemeId === null)
    ) {
      const preset = this.catalog.get(this.activeThemeId)
      if (preset !== undefined) this.installActive(preset)
    }
    // A reinstalled active layer lands on top of the overlay stack; lift the
    // surviving preview back above it and pick up its new tokens at once.
    if (this.previewing && this.previewThemeId !== null) {
      const preview = this.catalog.get(this.previewThemeId)
      if (preview !== undefined) this.installPreview(preview)
    }
  }

  private applyDurable(raw: unknown): void {
    const id = normalizeId(raw)
    if (typeof raw === 'string' && raw.length > 0 && this.catalog.get(raw) === undefined) {
      this.disposePreviewLayer()
      this.clearActiveLayer()
      this.activeThemeId = null
      this.acceptedThemeId = null
      this.previewThemeId = null
      this.previewing = false
      this.publish()
      this.repairUnknown(raw)
      return
    }
    this.repairBlockedRaw = undefined
    if (id === this.activeThemeId) {
      this.acceptedThemeId = id
      if (!this.previewing) {
        if (id === null) this.clearActiveLayer()
        else this.ensureActiveLayer()
      }
      if (
        this.snapshot.settingsStatus !== this.settingsStatus
        || this.snapshot.saveError !== this.saveError
        || this.snapshot.droppedImports !== this.droppedImports
        || this.snapshot.creatorMode !== this.creatorMode
        || this.snapshot.previewing !== this.previewing
        || this.snapshot.previewThemeId !== this.previewThemeId
      ) this.publish()
      return
    }
    this.disposePreviewLayer()
    this.previewThemeId = null
    this.previewing = false
    this.acceptedThemeId = id
    if (id === null) {
      this.clearActiveLayer()
      this.activeThemeId = null
      this.publish()
      return
    }
    const preset = this.catalog.get(id)
    if (preset === undefined) return
    this.installActive(preset)
    this.activeThemeId = id
    this.publish()
  }

  private repairUnknown(raw: unknown): void {
    if (this.disposed || this.host === undefined || this.repairBlockedRaw === raw) return
    this.repairBlockedRaw = raw
    this.queueWrite(ACTIVE_THEME_ID_FIELD, null)
  }

  private persist(id: string | null): void {
    this.queueWrite(ACTIVE_THEME_ID_FIELD, id)
  }

  private queueWrite(field: string, value: unknown): void {
    if (this.disposed || this.host === undefined) return
    this.pendingWrites += 1
    this.writeBacklog.set(field, value)
    if (this.drainingWrites) return
    this.drainingWrites = true
    void this.drainWrites()
  }

  /**
   * Send queued field writes one batch at a time. Overlapping writes must not
   * race: a newer success can settle first, then an older `set` updates the
   * Host snapshot last and `finishPersist` would treat that stale snapshot as
   * authority. Each field keeps only its newest queued value.
   */
  private async drainWrites(): Promise<void> {
    const host = this.host
    if (host === undefined) {
      this.drainingWrites = false
      return
    }
    try {
      while (this.writeBacklog.size > 0 && !this.disposed) {
        const batch = [...this.writeBacklog]
        this.writeBacklog.clear()
        const covered = this.pendingWrites
        let rejected = false
        for (const [field, value] of batch) {
          try {
            rejected = (await host.set(field, value)) === false || rejected
          } catch {
            rejected = true
          }
          if (this.disposed) return
        }
        if (this.writeBacklog.size === 0) this.latestRejected = rejected
        this.pendingWrites -= covered
        if (this.pendingWrites === 0 && this.writeBacklog.size === 0) this.finishPersist()
      }
    } finally {
      this.drainingWrites = false
      if (!this.disposed && this.writeBacklog.size > 0) {
        this.drainingWrites = true
        void this.drainWrites()
      }
    }
  }

  /**
   * Reconcile the optimistic choice with the Host snapshot after every own
   * write has settled. The accepted snapshot is the only durable authority.
   */
  private finishPersist(): void {
    if (this.disposed || this.host === undefined || this.pendingWrites > 0) return
    const rejected = this.latestRejected
    let section: ReturnType<ThemeSettingsHost<ThemeStudioSettings>['getSnapshot']>
    try {
      section = this.host.getSnapshot()
    } catch {
      this.settingsStatus = 'unavailable'
      this.failAndRevert()
      return
    }
    if (section.status !== 'ready') {
      this.settingsStatus = section.status
      if (rejected) this.failAndRevert()
      else if (this.snapshot.settingsStatus !== this.settingsStatus) this.publish()
      return
    }
    this.settingsStatus = 'ready'
    const importsMatch = this.importedRequested === undefined
      || JSON.stringify(section.value?.importedThemes ?? []) === JSON.stringify(this.importedRequested)
    this.importedRequested = undefined
    this.syncImports(section.value)
    this.creatorMode = creatorAgentModeOf(section.value?.creatorAgentMode)
    if (!rejected && importsMatch && this.durableMatches(section.value?.activeThemeId, this.activeThemeId)) {
      this.acceptedThemeId = this.activeThemeId
      if (normalizeId(section.value?.activeThemeId) === null) this.repairBlockedRaw = undefined
      this.saveError = false
      // Import completion must notify observers even if the active id stayed
      // unchanged. Auto-preview runs after the accepted layers are reconciled.
      this.publish()
      return
    }
    const revision = this.revision
    this.saveError = true
    this.applyDurable(section.value?.activeThemeId)
    // Repeated rejections still settle a distinct import attempt and must
    // notify auto-preview listeners even when the error/id stayed unchanged.
    if (this.revision === revision) this.publish()
  }

  private durableMatches(raw: unknown, local: string | null): boolean {
    if (typeof raw === 'string' && raw.length > 0 && this.catalog.get(raw) === undefined) return false
    return normalizeId(raw) === local
  }

  private failAndRevert(): void {
    this.saveError = true
    if (this.activeThemeId !== this.acceptedThemeId) this.revertToAccepted()
    this.publish()
  }

  private revertToAccepted(): void {
    this.disposePreviewLayer()
    this.previewThemeId = null
    this.previewing = false
    if (this.acceptedThemeId === null) {
      this.clearActiveLayer()
      this.activeThemeId = null
      return
    }
    const preset = this.catalog.get(this.acceptedThemeId)
    if (preset === undefined) {
      this.clearActiveLayer()
      this.activeThemeId = null
      return
    }
    this.installActive(preset)
    this.activeThemeId = this.acceptedThemeId
  }

  private requirePreset(id: string): BuiltinThemePreset {
    const preset = this.catalog.get(id)
    if (preset === undefined) throw new Error(`theme ${JSON.stringify(id)} is not in the catalog`)
    return preset
  }

  private installActive(preset: BuiltinThemePreset): void {
    this.clearActiveLayer()
    this.activeDisposer = this.theme.overrideTokens(ACTIVE_SOURCE, this.tokenOverrides(preset))
  }

  private installPreview(preset: BuiltinThemePreset): void {
    this.disposePreviewLayer()
    this.previewDisposer = this.theme.overrideTokens(PREVIEW_SOURCE, this.tokenOverrides(preset))
  }

  private tokenOverrides(preset: BuiltinThemePreset): ThemeTokenOverrides {
    return withoutOfficialFontTokens(presetToOverrides(preset))
  }

  private ensureActiveLayer(): void {
    if (this.activeThemeId === null || this.activeDisposer !== undefined) return
    const preset = this.catalog.get(this.activeThemeId)
    if (preset !== undefined) this.installActive(preset)
  }

  private clearActiveLayer(): void {
    this.activeDisposer?.()
    this.activeDisposer = undefined
  }

  private disposePreviewLayer(): void {
    this.previewDisposer?.()
    this.previewDisposer = undefined
  }

  private assertOpen(): void {
    if (this.disposed) throw new Error('ThemeStudioRuntime is disposed')
  }

  private buildSnapshot(): ThemeStudioSnapshot {
    return Object.freeze({
      activeThemeId: this.activeThemeId,
      previewThemeId: this.previewThemeId,
      previewing: this.previewing,
      settingsStatus: this.settingsStatus,
      saveError: this.saveError,
      droppedImports: this.droppedImports,
      creatorMode: this.creatorMode,
      revision: this.revision,
    })
  }

  private publish(): void {
    this.revision += 1
    this.snapshot = this.buildSnapshot()
    for (const listener of [...this.listeners]) listener()
  }
}
