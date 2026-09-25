/**
 * Theme Studio plugin, browser half: overlay runtime plus the General
 * Themes settings row. Presentation stays with `ctx.theme`.
 */
import type { BoundActions } from '@deepseek-ai/dsh-client-ui-slots'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-theme/client'
import {
  THEME_STUDIO_SETTINGS_NAMESPACE, type ThemeStudioSettings,
} from '../constants.ts'
import type { ConfigFormsCarrier, SettingsScopeCarrier, ThemeSettingsHost } from '../compat/settings-client.ts'
import { BuiltinPresetRegistry } from './catalog.ts'
import { en, NS, zh, type ThemeStudioKey } from './locales.ts'
import { DEFAULT_PREVIEW } from './presets.ts'
import { ThemeStudioRuntime } from './runtime.ts'
import { createThemeStudioRowStore, type ThemeStudioCard } from './store.ts'
import { ThemeStudioRow, type ThemeStudioRowInjected } from './ThemeStudioRow.tsx'

export { ThemeStudioRuntime } from './runtime.ts'
export type { ThemeStudioSnapshot, ThemeOverrideSurface } from './runtime.ts'
export { presetToOverrides, PresetAdapterError } from './adapter.ts'
export { BuiltinPresetRegistry } from './catalog.ts'
export { BUILTIN_PRESETS, DEFAULT_PREVIEW } from './presets.ts'
export { createThemeStudioRowStore } from './store.ts'
export type { ThemeStudioCard, ThemeStudioRowState } from './store.ts'
export type { BuiltinThemePreset, ThemeCatalog, ThemePreview } from './types.ts'
export { NS as SETTINGS_NS } from './locales.ts'
export type { ThemeStudioKey } from './locales.ts'
export { ACTIVE_SOURCE, PREVIEW_SOURCE, THEME_STUDIO_SETTINGS_NAMESPACE } from '../constants.ts'
export type { ThemeStudioSettings } from '../constants.ts'

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

function cardsOf(catalog: BuiltinPresetRegistry): ThemeStudioCard[] {
  return [
    {
      id: null,
      nameKey: 'default.name',
      descriptionKey: 'default.description',
      preview: DEFAULT_PREVIEW,
    },
    ...catalog.list().map(preset => ({
      id: preset.id,
      nameKey: nameKeyOf(preset.id),
      descriptionKey: descriptionKeyOf(preset.id),
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
 * @param ctx - client context that already carries theme, slots, and locale.
 */
function start(ctx: ClientContext, host: ThemeSettingsHost<ThemeStudioSettings> | undefined): void {
  const catalog = new BuiltinPresetRegistry()
  const runtime = new ThemeStudioRuntime({ theme: ctx.theme, host, catalog })
  ctx.effect(() => () => { runtime.dispose() }, 'theme-studio: runtime')
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'theme-studio: settings row dictionaries')

  const store = createThemeStudioRowStore(cardsOf(catalog))
  let bound: BoundActions<typeof store> | undefined
  const sync = (): void => {
    bound?.sync(runtime.getSnapshot())
  }
  ctx.effect(() => runtime.subscribe(sync), 'theme-studio: store projection')
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
      applyPreview: () => { runtime.applyPreview() },
    }
  }
  ctx.effect(() => ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'themes',
    order: 20,
    store,
    locale: NS,
    inject: injected,
  }, ThemeStudioRow)), 'theme-studio: themes row')
}

/**
 * Client plugin body. Whichever settings service the host provides starts the row.
 * @param ctx - client cordis context.
 */
export function apply(ctx: ClientContext): void {
  let started = false
  const startOnce = (
    child: ClientContext,
    host: ThemeSettingsHost<ThemeStudioSettings> | undefined,
  ): void => {
    if (started) return
    started = true
    start(child, host)
  }
  // Distinct callbacks: cordis keys a plugin runtime by function identity.
  // Read only the injected service. The context proxy throws on any other name.
  ctx.inject(['settingsScope'], (child) => {
    const host = (child as SettingsScopeCarrier).settingsScope?.bind<ThemeStudioSettings>({
      namespace: THEME_STUDIO_SETTINGS_NAMESPACE,
    })
    startOnce(child, host)
  })
  ctx.inject(['configForms'], (child) => {
    const host = (child as ConfigFormsCarrier).configForms?.get<ThemeStudioSettings>(
      THEME_STUDIO_SETTINGS_NAMESPACE,
    )
    startOnce(child, host)
  })
}
