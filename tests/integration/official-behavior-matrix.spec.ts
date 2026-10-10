// @vitest-environment jsdom
/**
 * Official ThemeRuntime behavior matrix.
 * Assertions read the composed token snapshot and the durable settings value.
 * jsdom projection of CSS variables is labeled as such; it is not a browser journey.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { ThemeStudioSettings } from '../../src/constants.ts'
import { presetToOverrides } from '../../src/client/adapter.ts'
import { BuiltinPresetRegistry } from '../../src/client/catalog.ts'
import { BUILTIN_PRESETS } from '../../src/client/presets.ts'
import { ThemeStudioRuntime } from '../../src/client/runtime.ts'
import { stubSettingsScope } from '../harness.ts'
import { ThemeRuntime } from './official-theme-runtime.ts'

const NORDIC = BUILTIN_PRESETS.find(preset => preset.id === 'dsh-theme-studio.nordic')!
const GRAPHITE = BUILTIN_PRESETS.find(preset => preset.id === 'dsh-theme-studio.graphite')!
const OLED = BUILTIN_PRESETS.find(preset => preset.id === 'dsh-theme-studio.oled')!

interface Appearance {
  preference: 'light' | 'dark' | 'system'
  fontSize: number
  codeFontSize: number
  terminalFontSize: number
  textFontFamily: string
  codeFontFamily: string
  terminalFontFamily: string
}

function appearance(preference: Appearance['preference']): Appearance {
  return {
    preference,
    fontSize: 14,
    codeFontSize: 11,
    terminalFontSize: 13,
    textFontFamily: '',
    codeFontFamily: '',
    terminalFontFamily: '',
  }
}

function appearanceHost(preference: Appearance['preference'] = 'light') {
  const host = stubSettingsScope<Appearance>()
  let value = appearance(preference)
  host.publish({ status: 'ready', value: { ...value }, revision: 1, writable: true })
  host.set.mockImplementation((field: string, next: unknown) => {
    value = { ...value, [field]: next }
    host.publish({
      status: 'ready',
      value: { ...value },
      revision: (host.scope.getSnapshot().revision ?? 0) + 1,
      writable: true,
    })
    return Promise.resolve(true)
  })
  return host
}

function studioHost(activeThemeId: string | null) {
  const host = stubSettingsScope<ThemeStudioSettings>()
  let value: ThemeStudioSettings = { activeThemeId }
  host.publish({ status: 'ready', value: { ...value }, revision: 1, writable: true })
  host.set.mockImplementation((_field: string, next: unknown) => {
    value = { activeThemeId: next as string | null }
    host.publish({
      status: 'ready',
      value: { ...value },
      revision: (host.scope.getSnapshot().revision ?? 0) + 1,
      writable: true,
    })
    return Promise.resolve(true)
  })
  return host
}

function installMedia(matches: boolean) {
  const listeners = new Set<() => void>()
  const media = {
    matches,
    addEventListener(_type: string, listener: () => void) { listeners.add(listener) },
    removeEventListener(_type: string, listener: () => void) { listeners.delete(listener) },
  }
  vi.stubGlobal('matchMedia', () => media)
  return {
    setMatches(next: boolean) {
      media.matches = next
      for (const listener of listeners) listener()
    },
  }
}

function open(preference: Appearance['preference'] = 'light', activeThemeId: string | null = null) {
  const appearanceScope = appearanceHost(preference)
  const studio = studioHost(activeThemeId)
  const theme = new ThemeRuntime(new Context(), appearanceScope.scope)
  const runtime = new ThemeStudioRuntime({
    theme,
    host: studio.scope,
    catalog: new BuiltinPresetRegistry(),
  })
  return { appearanceScope, studio, theme, runtime }
}

async function settled() {
  await new Promise(resolve => setTimeout(resolve, 0))
}

function brand(preset: typeof NORDIC, scheme: 'light' | 'dark') {
  return presetToOverrides(preset)['--dsw-alias-brand-primary']![scheme]
}

function painted(theme: InstanceType<typeof ThemeRuntime>) {
  return theme.getTheme().active.tokens['--dsw-alias-brand-primary']
}

describe('official ThemeRuntime behavior matrix', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.removeAttribute('style')
  })

  it('activates a theme from Default and stores it', async () => {
    const { runtime, theme, studio } = open()
    expect(painted(theme)).not.toBe(brand(NORDIC, 'light'))
    runtime.activateTheme(NORDIC.id)
    expect(painted(theme)).toBe(brand(NORDIC, 'light'))
    expect(runtime.getSnapshot()).toMatchObject({ activeThemeId: NORDIC.id, previewing: false })
    await settled()
    expect(studio.scope.getSnapshot().value?.activeThemeId).toBe(NORDIC.id)
  })

  it('replaces the active theme', async () => {
    const { runtime, theme, studio } = open('light', NORDIC.id)
    runtime.activateTheme(GRAPHITE.id)
    expect(painted(theme)).toBe(brand(GRAPHITE, 'light'))
    await settled()
    expect(studio.scope.getSnapshot().value?.activeThemeId).toBe(GRAPHITE.id)
  })

  it('previews another theme and cancel restores the active layer without writing', async () => {
    const { runtime, theme, studio } = open('light', NORDIC.id)
    studio.set.mockClear()
    runtime.previewTheme(GRAPHITE.id)
    expect(painted(theme)).toBe(brand(GRAPHITE, 'light'))
    expect(runtime.getSnapshot()).toMatchObject({ activeThemeId: NORDIC.id, previewThemeId: GRAPHITE.id, previewing: true })
    runtime.cancelPreview()
    expect(painted(theme)).toBe(brand(NORDIC, 'light'))
    expect(runtime.getSnapshot().previewing).toBe(false)
    await settled()
    expect(studio.set).not.toHaveBeenCalled()
    expect(studio.scope.getSnapshot().value?.activeThemeId).toBe(NORDIC.id)
  })

  it('applies a preview and drops the preview layer', async () => {
    const { runtime, theme, studio } = open('light', NORDIC.id)
    runtime.previewTheme(GRAPHITE.id)
    runtime.applyPreview()
    expect(painted(theme)).toBe(brand(GRAPHITE, 'light'))
    expect(runtime.getSnapshot()).toMatchObject({ activeThemeId: GRAPHITE.id, previewing: false, previewThemeId: null })
    await settled()
    expect(studio.scope.getSnapshot().value?.activeThemeId).toBe(GRAPHITE.id)
  })

  it('previews Default and cancel restores the active theme', async () => {
    const { runtime, theme, studio } = open('light', NORDIC.id)
    studio.set.mockClear()
    runtime.previewTheme(null)
    expect(painted(theme)).not.toBe(brand(NORDIC, 'light'))
    expect(runtime.getSnapshot()).toMatchObject({ activeThemeId: NORDIC.id, previewing: true, previewThemeId: null })
    runtime.cancelPreview()
    expect(painted(theme)).toBe(brand(NORDIC, 'light'))
    await settled()
    expect(studio.set).not.toHaveBeenCalled()
  })

  it('restores Default without changing official Appearance', async () => {
    const { runtime, theme, studio, appearanceScope } = open('dark', NORDIC.id)
    const preferenceWrites = appearanceScope.set.mock.calls.length
    runtime.restoreDefault()
    expect(painted(theme)).not.toBe(brand(NORDIC, 'dark'))
    expect(theme.getTheme().preference).toBe('dark')
    await settled()
    expect(studio.scope.getSnapshot().value?.activeThemeId).toBeNull()
    expect(appearanceScope.set.mock.calls.length).toBe(preferenceWrites)
  })

  it('follows Light, Dark, and Light without dropping the theme id', () => {
    const { runtime, theme, studio } = open('light', NORDIC.id)
    expect(theme.getTheme().active.colorScheme).toBe('light')
    expect(painted(theme)).toBe(brand(NORDIC, 'light'))
    theme.setTheme('dark')
    expect(theme.getTheme().active.colorScheme).toBe('dark')
    expect(painted(theme)).toBe(brand(NORDIC, 'dark'))
    theme.setTheme('light')
    expect(painted(theme)).toBe(brand(NORDIC, 'light'))
    expect(runtime.getSnapshot().activeThemeId).toBe(NORDIC.id)
    expect(studio.set).not.toHaveBeenCalled()
  })

  it('switches Light or Dark to System without writing the theme id', () => {
    installMedia(false)
    const { runtime, theme, studio, appearanceScope } = open('dark', NORDIC.id)
    theme.setTheme('system')
    expect(theme.getTheme().preference).toBe('system')
    expect(theme.getTheme().active.colorScheme).toBe('light')
    expect(painted(theme)).toBe(brand(NORDIC, 'light'))
    expect(runtime.getSnapshot().activeThemeId).toBe(NORDIC.id)
    expect(appearanceScope.set).toHaveBeenCalledWith('preference', 'system')
    expect(studio.set).not.toHaveBeenCalled()
  })

  it('recomputes the system scheme when the preference changes', () => {
    const media = installMedia(false)
    const { runtime, theme, studio } = open('system', NORDIC.id)
    expect(theme.getTheme().active.colorScheme).toBe('light')
    media.setMatches(true)
    expect(theme.getTheme().preference).toBe('system')
    expect(theme.getTheme().active.colorScheme).toBe('dark')
    expect(painted(theme)).toBe(brand(NORDIC, 'dark'))
    expect(runtime.getSnapshot().activeThemeId).toBe(NORDIC.id)
    expect(studio.set).not.toHaveBeenCalled()
  })

  it('removes Theme Studio overlays on dispose', () => {
    const { runtime, theme } = open('light', NORDIC.id)
    runtime.previewTheme(GRAPHITE.id)
    runtime.dispose()
    expect(painted(theme)).not.toBe(brand(NORDIC, 'light'))
    expect(painted(theme)).not.toBe(brand(GRAPHITE, 'light'))
  })

  it('reloads one active overlay and does not keep the previous preview', () => {
    const { runtime, theme, studio } = open('light', NORDIC.id)
    runtime.previewTheme(GRAPHITE.id)
    runtime.dispose()
    const reloaded = new ThemeStudioRuntime({
      theme,
      host: studio.scope,
      catalog: new BuiltinPresetRegistry(),
    })
    expect(reloaded.getSnapshot()).toMatchObject({ activeThemeId: NORDIC.id, previewing: false })
    expect(painted(theme)).toBe(brand(NORDIC, 'light'))
    reloaded.dispose()
    expect(painted(theme)).not.toBe(brand(NORDIC, 'light'))
  })

  it('keeps the overlay while settings are unavailable and restores the same theme', () => {
    const { runtime, theme, studio } = open('light', NORDIC.id)
    studio.publish({ status: 'unavailable', value: undefined, revision: 2, writable: false })
    expect(runtime.getSnapshot().settingsStatus).toBe('unavailable')
    expect(painted(theme)).toBe(brand(NORDIC, 'light'))
    studio.publish({ status: 'ready', value: { activeThemeId: NORDIC.id }, revision: 3, writable: true })
    expect(runtime.getSnapshot().settingsStatus).toBe('ready')
    expect(painted(theme)).toBe(brand(NORDIC, 'light'))
    expect(runtime.getSnapshot().activeThemeId).toBe(NORDIC.id)
  })

  it('reverts an optimistic theme when the durable snapshot does not accept it', async () => {
    const { runtime, theme, studio } = open('light', GRAPHITE.id)
    studio.set.mockImplementation(() => Promise.resolve(true))
    runtime.activateTheme(NORDIC.id)
    expect(painted(theme)).toBe(brand(NORDIC, 'light'))
    await settled()
    expect(runtime.getSnapshot().saveError).toBe(true)
    expect(runtime.getSnapshot().activeThemeId).toBe(GRAPHITE.id)
    expect(painted(theme)).toBe(brand(GRAPHITE, 'light'))
    expect(studio.scope.getSnapshot().value?.activeThemeId).toBe(GRAPHITE.id)
  })

  it('keeps the newest theme when an older write settles first', async () => {
    const { runtime, theme, studio } = open('light', GRAPHITE.id)
    let durable: string | null = GRAPHITE.id
    const pending: Array<{ id: string | null, finish: (accepted: boolean) => void }> = []
    studio.set.mockImplementation((_field: string, next: unknown) => new Promise(resolve => {
      pending.push({
        id: next as string | null,
        finish(accepted) {
          if (accepted) durable = next as string | null
          studio.publish({
            status: 'ready',
            value: { activeThemeId: durable },
            revision: (studio.scope.getSnapshot().revision ?? 0) + 1,
            writable: true,
          })
          resolve(accepted)
        },
      })
    }))
    runtime.activateTheme(NORDIC.id)
    runtime.activateTheme(OLED.id)
    expect(painted(theme)).toBe(brand(OLED, 'light'))
    pending[0]!.finish(true)
    await settled()
    expect(runtime.getSnapshot().activeThemeId).toBe(OLED.id)
    expect(painted(theme)).toBe(brand(OLED, 'light'))
    pending[1]!.finish(true)
    await settled()
    expect(studio.scope.getSnapshot().value?.activeThemeId).toBe(OLED.id)
    expect(painted(theme)).toBe(brand(OLED, 'light'))
    expect(runtime.getSnapshot().saveError).toBe(false)
  })

  it('restores Default when the persisted id is unknown', async () => {
    const studio = studioHost('missing-theme')
    const appearanceScope = appearanceHost('light')
    const theme = new ThemeRuntime(new Context(), appearanceScope.scope)
    const runtime = new ThemeStudioRuntime({
      theme,
      host: studio.scope,
      catalog: new BuiltinPresetRegistry(),
    })
    expect(runtime.getSnapshot().activeThemeId).toBeNull()
    expect(painted(theme)).not.toBe(brand(NORDIC, 'light'))
    await settled()
    expect(studio.scope.getSnapshot().value?.activeThemeId).toBeNull()
  })

  it('projects official snapshot variables onto document.body and clears them with the overlay', () => {
    const { runtime, theme } = open('light', NORDIC.id)
    const applied: string[] = []
    const project = () => {
      for (const name of applied) document.body.style.removeProperty(name)
      applied.length = 0
      for (const [name, value] of Object.entries(theme.getTheme().active.tokens)) {
        document.body.style.setProperty(name, value)
        applied.push(name)
      }
    }
    project()
    expect(document.body.style.getPropertyValue('--dsw-alias-brand-primary')).toBe(brand(NORDIC, 'light'))
    const tag = document.createElement('style')
    tag.dataset.pluginCss = '@dsh-electron/dsh-theme-studio/ThemeStudioRow.module.css'
    document.head.appendChild(tag)
    runtime.dispose()
    project()
    expect(document.body.style.getPropertyValue('--dsw-alias-brand-primary')).not.toBe(brand(NORDIC, 'light'))
    expect(document.head.querySelector('style[data-plugin-css="@dsh-electron/dsh-theme-studio/ThemeStudioRow.module.css"]')).not.toBeNull()
  })
})
