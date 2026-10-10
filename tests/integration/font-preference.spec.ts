// @vitest-environment jsdom
/**
 * Official font preferences stay independent of Theme Studio color overlays.
 * The installed ThemeRuntime decides whether fonts are one content size or
 * text/code/terminal roles. Assertions follow that shape instead of a version.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { ThemeTokenOverrides } from '@deepseek-ai/dsh-client-ui-theme/client'
import type { ThemeStudioSettings } from '../../src/constants.ts'
import { presetToOverrides } from '../../src/client/adapter.ts'
import { BuiltinPresetRegistry } from '../../src/client/catalog.ts'
import { isOfficialFontToken } from '../../src/client/font-boundary.ts'
import { BUILTIN_PRESETS } from '../../src/client/presets.ts'
import { ThemeStudioRuntime } from '../../src/client/runtime.ts'
import { stubSettingsScope } from '../harness.ts'
import { ThemeRuntime } from './official-theme-runtime.ts'

const NORDIC = BUILTIN_PRESETS.find(preset => preset.id === 'dsh-theme-studio.nordic')!
const GRAPHITE = BUILTIN_PRESETS.find(preset => preset.id === 'dsh-theme-studio.graphite')!

interface AppearanceSettings {
  preference: 'light' | 'dark' | 'system'
  fontSize?: number
  codeFontSize?: number
  terminalFontSize?: number
  textFontFamily?: string
  codeFontFamily?: string
  terminalFontFamily?: string
}

interface ThemeSnapshot {
  preference: string
  fontSize?: number
  fontSizes?: { text: number; code: number; terminal: number }
  fontFamilies?: { text: string; code: string; terminal: string }
  active: { colorScheme: string; tokens: Record<string, string> }
}

interface OfficialTheme {
  getTheme(): ThemeSnapshot
  setTheme(id: string): void
  setFontSize(roleOrPx: string | number, px?: number): void
  setFontFamily?(role: string, value: string): void
  overrideTokens(source: string, tokens: ThemeTokenOverrides): () => void
}

const FONT_SIZE_VARS = {
  text: '--dsh-content-font-size',
  code: '--dsh-code-font-size',
  terminal: '--dsh-terminal-font-size',
} as const

const FONT_FAMILY_VARS = {
  text: '--dsh-font-family-text',
  code: '--dsh-font-family-code',
  terminal: '--dsh-font-family-terminal',
} as const

function appearanceHost() {
  const host = stubSettingsScope<AppearanceSettings>()
  let value: AppearanceSettings | undefined
  host.set.mockImplementation((field: string, next: unknown) => {
    value = { ...(value ?? { preference: 'light' }), [field]: next }
    host.publish({
      status: 'ready',
      value: { ...value },
      revision: (host.scope.getSnapshot().revision ?? 0) + 1,
      writable: true,
    })
    return Promise.resolve(true)
  })
  return {
    host,
    publish(next: AppearanceSettings) {
      value = { ...next }
      host.publish({
        status: 'ready',
        value: { ...value },
        revision: (host.scope.getSnapshot().revision ?? 0) + 1,
        writable: true,
      })
    },
  }
}

function studioHost(value: ThemeStudioSettings) {
  const host = stubSettingsScope<ThemeStudioSettings>()
  host.publish({ status: 'ready', value, revision: 1, writable: true })
  host.set.mockImplementation((_field: string, next: unknown) => {
    host.publish({
      status: 'ready',
      value: { activeThemeId: next as string | null },
      revision: (host.scope.getSnapshot().revision ?? 0) + 1,
      writable: true,
    })
    return Promise.resolve(true)
  })
  return host
}

function openTheme(scope: ReturnType<typeof appearanceHost>['host']['scope']): OfficialTheme {
  return new ThemeRuntime(new Context(), scope) as unknown as OfficialTheme
}

function fontSignature(theme: OfficialTheme): string {
  const snapshot = theme.getTheme()
  if (snapshot.fontSizes !== undefined && snapshot.fontFamilies !== undefined) {
    return JSON.stringify({ fontSizes: snapshot.fontSizes, fontFamilies: snapshot.fontFamilies })
  }
  return JSON.stringify({ fontSize: snapshot.fontSize })
}

function sectionFrom(snapshot: ThemeSnapshot): AppearanceSettings {
  const preference = snapshot.preference === 'dark' || snapshot.preference === 'system'
    ? snapshot.preference
    : 'light'
  if (snapshot.fontSizes !== undefined && snapshot.fontFamilies !== undefined) {
    return {
      preference,
      fontSize: snapshot.fontSizes.text,
      codeFontSize: snapshot.fontSizes.code,
      terminalFontSize: snapshot.fontSizes.terminal,
      textFontFamily: snapshot.fontFamilies.text,
      codeFontFamily: snapshot.fontFamilies.code,
      terminalFontFamily: snapshot.fontFamilies.terminal,
    }
  }
  return { preference, fontSize: snapshot.fontSize }
}

/** ThemePresenter order: font variables first, then composed color tokens. */
const appliedTokens: string[] = []

function projectSnapshot(snapshot: ThemeSnapshot): void {
  const body = document.body
  if (snapshot.fontSizes !== undefined && snapshot.fontFamilies !== undefined) {
    for (const [role, name] of Object.entries(FONT_SIZE_VARS)) {
      body.style.setProperty(name, `${snapshot.fontSizes[role as keyof typeof snapshot.fontSizes]}px`)
    }
    for (const [role, name] of Object.entries(FONT_FAMILY_VARS)) {
      const list = snapshot.fontFamilies[role as keyof typeof snapshot.fontFamilies]
      if (list === '') body.style.removeProperty(name)
      else body.style.setProperty(name, list)
    }
  } else if (typeof snapshot.fontSize === 'number') {
    body.style.setProperty(FONT_SIZE_VARS.text, `${snapshot.fontSize}px`)
  }
  for (const name of appliedTokens) body.style.removeProperty(name)
  appliedTokens.length = 0
  for (const [name, value] of Object.entries(snapshot.active.tokens)) {
    body.style.setProperty(name, value)
    appliedTokens.push(name)
  }
}

function expectFontsOnDocument(snapshot: ThemeSnapshot): void {
  const body = document.body
  if (snapshot.fontSizes !== undefined && snapshot.fontFamilies !== undefined) {
    expect(body.style.getPropertyValue(FONT_SIZE_VARS.text)).toBe(`${snapshot.fontSizes.text}px`)
    expect(body.style.getPropertyValue(FONT_SIZE_VARS.code)).toBe(`${snapshot.fontSizes.code}px`)
    expect(body.style.getPropertyValue(FONT_SIZE_VARS.terminal)).toBe(`${snapshot.fontSizes.terminal}px`)
    expect(body.style.getPropertyValue(FONT_FAMILY_VARS.text)).toBe(snapshot.fontFamilies.text)
    expect(body.style.getPropertyValue(FONT_FAMILY_VARS.code)).toBe(snapshot.fontFamilies.code)
    expect(body.style.getPropertyValue(FONT_FAMILY_VARS.terminal)).toBe(snapshot.fontFamilies.terminal)
  } else {
    expect(body.style.getPropertyValue(FONT_SIZE_VARS.text)).toBe(`${snapshot.fontSize}px`)
  }
  const background = snapshot.active.tokens['--dsw-alias-bg-base']
  if (background === undefined) {
    expect(body.style.getPropertyValue('--dsw-alias-bg-base')).toBe('')
  } else {
    expect(body.style.getPropertyValue('--dsw-alias-bg-base')).toBe(background)
  }
  expect(Object.keys(snapshot.active.tokens).some(isOfficialFontToken)).toBe(false)
}

describe('official font preferences and Theme Studio overlays', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.removeAttribute('style')
    appliedTokens.length = 0
  })

  it('reads the boot font variables before settings adoption and keeps them under a color overlay', () => {
    document.body.style.setProperty('--dsh-content-font-size', '18px')
    document.body.style.setProperty('--dsh-code-font-size', '15px')
    document.body.style.setProperty('--dsh-terminal-font-size', '16px')
    document.body.style.setProperty('--dsh-font-family-text', 'Iowan Old Style')
    document.body.style.setProperty('--dsh-font-family-code', 'JetBrains Mono')
    document.body.style.setProperty('--dsh-font-family-terminal', 'MesloLGS NF')
    document.body.style.setProperty('--ds-font-family-code', 'JetBrains Mono')
    const appearance = appearanceHost()
    const theme = openTheme(appearance.host.scope)
    const booted = theme.getTheme()
    if (booted.fontSizes !== undefined) {
      expect(booted.fontSizes).toEqual({ text: 18, code: 15, terminal: 16 })
      expect(booted.fontFamilies?.text).toContain('Iowan Old Style')
      expect(booted.fontFamilies?.code).toContain('JetBrains Mono')
      expect(booted.fontFamilies?.terminal).toContain('MesloLGS NF')
    } else {
      expect(typeof booted.fontSize).toBe('number')
    }
    const signature = fontSignature(theme)
    appearance.publish(sectionFrom(booted))
    expect(fontSignature(theme)).toBe(signature)

    const studio = new ThemeStudioRuntime({
      theme,
      host: studioHost({ activeThemeId: NORDIC.id }).scope,
      catalog: new BuiltinPresetRegistry(),
    })
    expect(fontSignature(theme)).toBe(signature)
    expect(theme.getTheme().active.tokens['--dsw-alias-bg-base'])
      .toBe(presetToOverrides(NORDIC)['--dsw-alias-bg-base']!.light)
    document.body.style.setProperty('--ds-font-family-code', 'JetBrains Mono')
    projectSnapshot(theme.getTheme())
    expectFontsOnDocument(theme.getTheme())
    expect(document.body.style.getPropertyValue('--ds-font-family-code')).toBe('JetBrains Mono')
    studio.dispose()
    projectSnapshot(theme.getTheme())
    expect(fontSignature(theme)).toBe(signature)
    expect(theme.getTheme().active.tokens['--dsw-alias-bg-base']).toBeUndefined()
    expectFontsOnDocument(theme.getTheme())
  })

  it('keeps text, code, and terminal preferences across preview, scheme, restart, and uninstall', async () => {
    const media = { matches: true, addEventListener() {}, removeEventListener() {} }
    vi.stubGlobal('matchMedia', () => media)
    document.body.style.setProperty('--dsh-content-font-size', '16px')
    const appearance = appearanceHost()
    const theme = openTheme(appearance.host.scope)
    appearance.publish(sectionFrom(theme.getTheme()))
    const roles = theme.getTheme().fontSizes !== undefined && theme.getTheme().fontFamilies !== undefined
    expect(roles || typeof theme.getTheme().fontSize === 'number').toBe(true)
    const beforeFonts = fontSignature(theme)

    if (roles) {
      expect(typeof theme.setFontFamily).toBe('function')
      theme.setFontFamily!('text', 'Iowan Old Style')
      theme.setFontFamily!('code', 'JetBrains Mono')
      theme.setFontFamily!('terminal', 'MesloLGS NF')
      theme.setFontSize('text', 18)
      theme.setFontSize('code', 15)
      theme.setFontSize('terminal', 16)
    } else {
      expect(theme.setFontFamily).toBeUndefined()
      // 12–17 is the older official range; 10–22 is the later one. 16 sits in both.
      const current = theme.getTheme().fontSize
      theme.setFontSize(current === 16 ? 15 : 16)
    }
    await Promise.resolve()
    const chosen = fontSignature(theme)
    expect(chosen).not.toBe(beforeFonts)

    const persisted = studioHost({ activeThemeId: GRAPHITE.id })
    const studio = new ThemeStudioRuntime({
      theme,
      host: persisted.scope,
      catalog: new BuiltinPresetRegistry(),
    })
    expect(fontSignature(theme)).toBe(chosen)
    const schemeOf = (): 'light' | 'dark' => theme.getTheme().active.colorScheme === 'dark' ? 'dark' : 'light'
    studio.previewTheme(NORDIC.id)
    expect(theme.getTheme().active.tokens['--dsw-alias-brand-primary'])
      .toBe(presetToOverrides(NORDIC)['--dsw-alias-brand-primary']![schemeOf()])
    if (roles) theme.setFontFamily!('text', 'Palatino')
    else theme.setFontSize(theme.getTheme().fontSize === 14 ? 15 : 14)
    await Promise.resolve()
    const duringPreview = fontSignature(theme)
    expect(duringPreview).not.toBe(chosen)
    expect(studio.getSnapshot().previewThemeId).toBe(NORDIC.id)
    studio.cancelPreview()
    expect(fontSignature(theme)).toBe(duringPreview)
    expect(theme.getTheme().active.tokens['--dsw-alias-brand-primary'])
      .toBe(presetToOverrides(GRAPHITE)['--dsw-alias-brand-primary']![schemeOf()])

    studio.previewTheme(NORDIC.id)
    studio.applyPreview()
    await Promise.resolve()
    expect(studio.getSnapshot()).toMatchObject({ activeThemeId: NORDIC.id, previewing: false, saveError: false })
    expect(fontSignature(theme)).toBe(duringPreview)

    theme.setTheme('dark')
    await Promise.resolve()
    expect(theme.getTheme().preference).toBe('dark')
    expect(theme.getTheme().active.colorScheme).toBe('dark')
    expect(theme.getTheme().active.tokens['--dsw-alias-bg-base'])
      .toBe(presetToOverrides(NORDIC)['--dsw-alias-bg-base']!.dark)
    expect(studio.getSnapshot().activeThemeId).toBe(NORDIC.id)
    expect(fontSignature(theme)).toBe(duringPreview)

    theme.setTheme('system')
    await Promise.resolve()
    expect(theme.getTheme().preference).toBe('system')
    expect(studio.getSnapshot().activeThemeId).toBe(NORDIC.id)
    expect(fontSignature(theme)).toBe(duringPreview)

    studio.restoreDefault()
    await Promise.resolve()
    expect(studio.getSnapshot().activeThemeId).toBeNull()
    expect(theme.getTheme().preference).toBe('system')
    expect(theme.getTheme().active.tokens['--dsw-alias-bg-base']).toBeUndefined()
    expect(fontSignature(theme)).toBe(duringPreview)

    studio.activateTheme(NORDIC.id)
    await Promise.resolve()
    studio.dispose()
    expect(theme.getTheme().active.tokens['--dsw-alias-bg-base']).toBeUndefined()
    expect(fontSignature(theme)).toBe(duringPreview)

    const reloaded = new ThemeStudioRuntime({
      theme,
      host: persisted.scope,
      catalog: new BuiltinPresetRegistry(),
    })
    expect(reloaded.getSnapshot().activeThemeId).toBe(NORDIC.id)
    expect(fontSignature(theme)).toBe(duringPreview)

    const restarted = openTheme(appearance.host.scope)
    expect(fontSignature(restarted)).toBe(duringPreview)
    const restartedStudio = new ThemeStudioRuntime({
      theme: restarted,
      host: persisted.scope,
      catalog: new BuiltinPresetRegistry(),
    })
    expect(restartedStudio.getSnapshot().activeThemeId).toBe(NORDIC.id)
    expect(restarted.getTheme().active.tokens['--dsw-alias-bg-base'])
      .toBe(presetToOverrides(NORDIC)['--dsw-alias-bg-base']!.dark)
    document.body.style.setProperty('--ds-font-family-code', 'sentinel-code')
    projectSnapshot(restarted.getTheme())
    expectFontsOnDocument(restarted.getTheme())
    expect(document.body.style.getPropertyValue('--ds-font-family-code')).toBe('sentinel-code')
    restartedStudio.dispose()
    projectSnapshot(restarted.getTheme())
    expectFontsOnDocument(restarted.getTheme())
    expect(document.body.style.getPropertyValue('--ds-font-family-code')).toBe('sentinel-code')

    const studioFields = persisted.set.mock.calls.map(call => call[0])
    expect(studioFields.length).toBeGreaterThan(0)
    expect(studioFields.every(field => field === 'activeThemeId')).toBe(true)
    const appearanceFields = appearance.host.set.mock.calls.map(call => call[0])
    expect(appearanceFields).not.toContain('activeThemeId')
  })
})
