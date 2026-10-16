/**
 * Theme Studio plugin, browser half: overlay runtime and the General Themes
 * settings row. Presentation stays with `ctx.theme`.
 */
import type { BoundActions } from '@deepseek-ai/dsh-client-ui-slots'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '../compat/plugin-manager-slot.ts'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-theme/client'
import {
  THEME_CREATOR_SKILL_NAME, THEME_STUDIO_PACKAGE_NAME, THEME_STUDIO_SETTINGS_NAMESPACE, type ThemeStudioSettings,
} from '../constants.ts'
import type { ConfigFormsCarrier, SettingsScopeCarrier, ThemeSettingsHost } from '../compat/settings-client.ts'
import { ThemeStudioRegistry } from './catalog.ts'
import type { ThemeStudioService } from './types.ts'
import { en, NS, zh, type ThemeStudioKey } from './locales.ts'
import { DEFAULT_PREVIEW } from './presets.ts'
import { ThemeStudioRuntime } from './runtime.ts'
import { createThemeStudioRowStore, type ThemeStudioCard } from './store.ts'
import {
  exportThemeById, importIdTaken, inspectThemeFile, previewWhenImported, removeImportedTheme, saveImportedTheme,
} from './theme-import.ts'
import { ThemeStudioRow, type ThemeStudioRowInjected } from './ThemeStudioRow.tsx'
import { CreatorConfigSection, type CreatorConfigInjected } from './CreatorConfigSection.tsx'


export { ThemeStudioRuntime } from './runtime.ts'
export type { ImportedThemeSink, ThemeStudioSnapshot, ThemeOverrideSurface } from './runtime.ts'
export { presetToOverrides, PresetAdapterError } from './adapter.ts'
export { BuiltinPresetRegistry, ThemeStudioRegistry } from './catalog.ts'
export { BUILTIN_PRESETS, DEFAULT_PREVIEW } from './presets.ts'
export { createThemeStudioRowStore } from './store.ts'
export type { ThemeStudioCard, ThemeStudioRowState } from './store.ts'
export type { BuiltinThemePreset, ThemeCatalog, ThemeStudioCatalog, ThemeStudioService, ThemePreview } from './types.ts'
export { contrastRatio, validateThemeContrast, DEFAULT_CONTRAST_PAIRS } from './contrast.ts'
export type { ThemeContrastPair, ThemeContrastCheck, ThemeContrastReport } from './contrast.ts'
export { checkColorSyntax } from './contrast-colors.ts'
export {
  compileThemeFile, parseThemeFile, parseStoredThemeFiles, serializeThemeFile, themeFileForPreset,
  themeFileName, uniqueThemeId, validateThemeFileData,
  THEME_FILE_EXTENSION, THEME_FILE_MAX_LENGTH, THEME_FILE_VERSION, USER_THEME_ID_PREFIX,
} from './theme-file.ts'
export type { DshThemeFile, StoredThemeEntry, StoredThemeParse, ThemeFileError, ThemeFileErrorCode, ThemeFileParse } from './theme-file.ts'
export {
  exportThemeById, importIdTaken, inspectThemeFile, previewWhenImported, removeImportedTheme, saveImportedTheme,
} from './theme-import.ts'
export type { ImportContrastSummary, ImportResolution, ThemeFileInspection } from './theme-import.ts'
export { creatorAgentModeOf, CREATOR_AGENT_MODE_FIELD, THEME_CREATOR_SKILL_NAME } from '../constants.ts'
export type { CreatorAgentMode } from '../constants.ts'
export type { ChromePalette } from './chrome-tokens.ts'
export { CHROME_PALETTE_KEYS, CHROME_TOKEN_NAMES } from './chrome-tokens.ts'
export { NS as SETTINGS_NS } from './locales.ts'
export type { ThemeStudioKey } from './locales.ts'
export { ACTIVE_SOURCE, IMPORTED_THEMES_FIELD, PREVIEW_SOURCE, THEME_STUDIO_SETTINGS_NAMESPACE } from '../constants.ts'
export type { ThemeStudioSettings } from '../constants.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Readonly builtin discovery. Inject `themeStudio` before accessing. */
    themeStudio: ThemeStudioService
  }
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The Themes settings row's copy. */
    'settings.theme-studio': ThemeStudioKey
  }
}

/**
 * Required services besides the settings transport. `settingsScope` and
 * `configForms` are not present on the same host, so each is waited for
 * inside `apply` instead of listed here.
 */
export const inject = ['theme', 'slots', 'locale', 'connection', 'remote']

/** The slice of `ctx.uiWorkspace` the create-theme action needs. */
interface UiWorkspaceStarter {
  /**
   * The two-parameter signature — `(workspaceId?, options?)` — only exists
   * from DSH 0.2.1-alpha.1; `Function.length` is the capability probe.
   */
  startSession(workspaceId?: unknown, options?: { prompt?: string; agentPreset?: string }): void
}

/**
 * Resolve the "open a Cordis session with the skill gesture prefilled" action.
 * Evaluated lazily at click time so a ui-workspace service that arrives after
 * this plugin still counts; `undefined` means the action degrades to a hint.
 * @param ctx - client context carrying the optional uiWorkspace service.
 * @returns the launcher, or `undefined` when the capability is absent.
 */
function themeCreationStart(ctx: ClientContext): (() => void) | undefined {
  const service = ctx.get('uiWorkspace') as UiWorkspaceStarter | undefined
  if (service === undefined || typeof service.startSession !== 'function' || service.startSession.length < 2) {
    return undefined
  }
  return () => {
    service.startSession(undefined, {
      agentPreset: 'cordis',
      prompt: `/${THEME_CREATOR_SKILL_NAME} `,
    })
  }
}

function cardsOf(registry: ThemeStudioRegistry): ThemeStudioCard[] {
  return [
    {
      id: null,
      nameKey: 'default.name',
      descriptionKey: 'default.description',
      preview: DEFAULT_PREVIEW,
    },
    ...registry.list().map(preset => ({
      id: preset.id,
      nameKey: nameKeyOf(preset.id),
      descriptionKey: descriptionKeyOf(preset.id),
      ...(registry.isImported(preset.id)
        ? { imported: true as const, name: preset.name, description: preset.description }
        : {}),
      preview: preset.preview,
    })),
  ]
}

function nameKeyOf(id: string): string {
  const short = id.replace(/^dsh-theme-studio\./, '')
  return `${short}.name`
}

function descriptionKeyOf(id: string): string {
  const short = id.replace(/^dsh-theme-studio\./, '')
  return `${short}.description`
}

/**
 * Restore the durable overlay and register the Themes row on one context.
 * @param ctx - the settings-transport child context that owns this runtime.
 * @param probe - the apply-scope context used for optional-service lookups
 *   (`ctx.get` reads the global store; the child is a scoped proxy).
 */
function start(ctx: ClientContext, probe: ClientContext, host: ThemeSettingsHost<ThemeStudioSettings> | undefined, registry: ThemeStudioRegistry): void {
  const runtime = new ThemeStudioRuntime({ theme: ctx.theme, host, catalog: registry })
  ctx.effect(() => () => { runtime.dispose() }, 'theme-studio: runtime')
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'theme-studio: settings row dictionaries')

  let cardCache: { rev: number; cards: ThemeStudioCard[] } | undefined
  const currentCards = (): ThemeStudioCard[] => {
    if (cardCache === undefined || cardCache.rev !== registry.revision) {
      cardCache = { rev: registry.revision, cards: cardsOf(registry) }
    }
    return cardCache.cards
  }

  const store = createThemeStudioRowStore(currentCards())
  let bound: BoundActions<typeof store> | undefined
  const sync = (): void => {
    bound?.sync(runtime.getSnapshot())
    bound?.setCards(currentCards())
  }
  ctx.effect(() => runtime.subscribe(sync), 'theme-studio: store projection')
  ctx.effect(() => registry.subscribe(sync), 'theme-studio: imported themes projection')
  const injected = (actions: BoundActions<typeof store>): ThemeStudioRowInjected => {
    bound = actions
    sync()
    return {
      previewTheme: (id) => { runtime.previewTheme(id) },
      activateTheme: (id) => {
        if (id === null) runtime.restoreDefault()
        else runtime.activateTheme(id)
      },
      cancelPreview: () => { runtime.cancelPreview() },
      inspectThemeFile: (text) => inspectThemeFile(text, registry, runtime),
      importIdTaken: (id) => importIdTaken(registry, id, runtime),
      saveImportedTheme: (source, mode) => {
        const id = saveImportedTheme(runtime, registry, source, mode)
        previewWhenImported(registry, runtime, id)
        return id
      },
      removeImportedTheme: (id) => { removeImportedTheme(runtime, registry, id) },
      exportTheme: (id) => { exportThemeById(registry, id) },
      startThemeCreation: () => {
        const start = themeCreationStart(probe)
        if (start === undefined) return false
        try {
          start()
          return true
        }
        catch {
          return false
        }
      },
    }
  }
  ctx.effect(() => ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'themes',
    // Between official 'appearance' (10) and 'font-size' (11).
    order: 10.5,
    store,
    locale: NS,
    inject: injected,
  }, ThemeStudioRow)), 'theme-studio: themes row')
  // The Plugins page declares this keyed slot; hosts without it never mount
  // the section and keep the stored or default creatorAgentMode.
  ctx.effect(() => ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
    name: 'plugins.bundle.config',
    key: THEME_STUDIO_PACKAGE_NAME,
    store,
    locale: NS,
    inject: (actions: BoundActions<typeof store>): CreatorConfigInjected => {
      injected(actions)
      return { setCreatorMode: (mode) => { runtime.setCreatorMode(mode) } }
    },
  }, CreatorConfigSection)), 'theme-studio: plugins page creator mode')
}

/**
 * Client plugin body. Whichever settings service the host provides starts the row.
 * @param ctx - client cordis context.
 */
export function apply(ctx: ClientContext): void {
  const registry = new ThemeStudioRegistry()
  // provide() is owned by this plugin's fiber, not a settings-transport child.
  ctx.provide('themeStudio', Object.freeze({ catalog: registry }))

  let started = false
  const startOnce = (
    child: ClientContext,
    host: ThemeSettingsHost<ThemeStudioSettings> | undefined,
  ): boolean => {
    if (started) return false
    started = true
    start(child, ctx, host, registry)
    return true
  }
  const releaseWhenStopped = (owns: boolean): (() => void) => {
    return () => {
      if (owns) started = false
    }
  }
  // Distinct callbacks: cordis keys a plugin runtime by function identity.
  // Read only the injected service. The context proxy throws on any other name.
  // The returned hook clears the guard when that child stops, so a later
  // re-provide or a switch to the other transport can start the row again.
  ctx.inject(['settingsScope'], (child) => {
    const host = (child as SettingsScopeCarrier).settingsScope?.bind<ThemeStudioSettings>({
      namespace: THEME_STUDIO_SETTINGS_NAMESPACE,
    })
    return releaseWhenStopped(startOnce(child, host))
  })
  ctx.inject(['configForms'], (child) => {
    const host = (child as ConfigFormsCarrier).configForms?.get<ThemeStudioSettings>(
      THEME_STUDIO_SETTINGS_NAMESPACE,
    )
    return releaseWhenStopped(startOnce(child, host))
  })
}
