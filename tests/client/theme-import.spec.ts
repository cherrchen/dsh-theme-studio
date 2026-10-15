import { describe, expect, it, vi } from 'vitest'
import { stubSettingsScope } from '../harness.ts'
import type { ThemeTokenOverrides } from '@deepseek-ai/dsh-client-ui-theme/client'
import type { ThemeStudioSettings } from '../../src/constants.ts'
import { ThemeStudioRegistry } from '../../src/client/catalog.ts'
import { PREVIEW_SOURCE, ThemeStudioRuntime } from '../../src/client/runtime.ts'
import { parseStoredThemeFiles } from '../../src/client/theme-file.ts'
import {
  importIdTaken, inspectThemeFile, previewWhenImported, removeImportedTheme, saveImportedTheme,
} from '../../src/client/theme-import.ts'

const LIGHT = {
  bgBase: '#f4f8fb', bgLayer1: '#ffffff', bgLayer2: '#eef3f7', bgOverlay: '#ffffff',
  borderL1: '#d7e0e8', borderL2: '#c3d0da', brand: '#2b6cb0',
  labelPrimary: '#1b2a3a', labelSecondary: '#51606f',
  error: '#b3282d', success: '#22793d', warn: '#975a16', sidebar: '#eef3f7',
}
const DARK = {
  bgBase: '#101820', bgLayer1: '#1a2430', bgLayer2: '#223040', bgOverlay: '#101820',
  borderL1: '#2c3c4e', borderL2: '#3a4d63', brand: '#63a4d8',
  labelPrimary: '#e6edf3', labelSecondary: '#9fb0bf',
  error: '#f0838a', success: '#6cc596', warn: '#e0b56a', sidebar: '#1a2430',
}

function sourceOf(id: string, name = id): Record<string, unknown> {
  return { version: 1, id, name, palette: { light: { ...LIGHT }, dark: { ...DARK } } }
}

function fakeTheme() {
  const layers = new Map<string, ThemeTokenOverrides>()
  return {
    layers,
    theme: {
      overrideTokens(source: string, tokens: ThemeTokenOverrides) {
        layers.set(source, tokens)
        return () => { if (layers.get(source) === tokens) layers.delete(source) }
      },
    },
  }
}

function durableHost(value: ThemeStudioSettings | undefined = { activeThemeId: null, importedThemes: [] }) {
  const host = stubSettingsScope<ThemeStudioSettings>()
  if (value !== undefined) host.publish({ status: 'ready', value, revision: 1, writable: true })
  host.set.mockImplementation((field: string, next: unknown) => {
    host.publish({
      status: 'ready',
      value: { ...host.scope.getSnapshot().value!, [field]: next },
      revision: (host.scope.getSnapshot().revision ?? 0) + 1,
      writable: true,
    })
    return Promise.resolve()
  })
  return host
}

function make(host = durableHost()) {
  const registry = new ThemeStudioRegistry()
  const overlay = fakeTheme()
  const runtime = new ThemeStudioRuntime({
    theme: overlay.theme,
    host: host.scope,
    catalog: registry,
    imports: registry,
  })
  return { registry, runtime, host, overlay }
}

describe('inspectThemeFile', () => {
  it('parses a valid file and reports collision and contrast summary', () => {
    const { registry } = make()
    const inspection = inspectThemeFile(JSON.stringify(sourceOf('user.ocean', 'Ocean')), registry)
    expect(inspection.ok).toBe(true)
    if (!inspection.ok) return
    expect(inspection.file.id).toBe('user.ocean')
    expect(inspection.collision).toBeNull()
    expect(inspection.summary).toEqual({ failed: 0, unknown: 0 })
  })

  it('flags a collision when an imported theme already owns the id', async () => {
    const { registry } = make(durableHost({
      activeThemeId: null,
      importedThemes: [sourceOf('user.ocean')],
    }))
    expect(registry.isImported('user.ocean')).toBe(true)
    const inspection = inspectThemeFile(JSON.stringify(sourceOf('user.ocean')), registry)
    expect(inspection.ok && inspection.collision === 'imported').toBe(true)
  })

  it('rejects invalid files with the parse error', () => {
    const { registry } = make()
    const inspection = inspectThemeFile('{', registry)
    expect(inspection.ok).toBe(false)
    if (inspection.ok) return
    expect(inspection.error.code).toBe('not-json')
  })

  it('flags a collision with an id an in-flight write carries', () => {
    const { registry, runtime, host } = make()
    host.set.mockImplementation(() => new Promise<void>(() => {}))
    saveImportedTheme(runtime, registry, sourceOf('user.ocean'), 'append')
    expect(registry.isImported('user.ocean')).toBe(false)
    const inspection = inspectThemeFile(JSON.stringify(sourceOf('user.ocean')), registry, runtime)
    expect(inspection.ok && inspection.collision === 'imported').toBe(true)
    runtime.dispose()
  })
})

describe('importIdTaken', () => {
  it('reports catalog ids and ids a pending write carries', () => {
    const { registry, runtime, host } = make(durableHost({
      activeThemeId: null,
      importedThemes: [sourceOf('user.ocean')],
    }))
    expect(importIdTaken(registry, 'user.ocean', runtime)).toBe(true)
    expect(importIdTaken(registry, 'user.moss', runtime)).toBe(false)
    host.set.mockImplementation(() => new Promise<void>(() => {}))
    saveImportedTheme(runtime, registry, sourceOf('user.moss'), 'append')
    expect(importIdTaken(registry, 'user.moss', runtime)).toBe(true)
    runtime.dispose()
  })
})

describe('saveImportedTheme / removeImportedTheme', () => {
  it('appends a new theme and lands it in the catalog once accepted', async () => {
    const { registry, runtime, host } = make()
    const id = saveImportedTheme(runtime, registry, sourceOf('user.ocean'), 'append')
    expect(id).toBe('user.ocean')
    await Promise.resolve()
    expect(registry.isImported('user.ocean')).toBe(true)
    expect(host.scope.getSnapshot().value?.importedThemes).toHaveLength(1)
  })

  it('replaces the same-id entry in place on replace mode', async () => {
    const { registry, runtime } = make(durableHost({
      activeThemeId: null,
      importedThemes: [sourceOf('user.ocean', 'Ocean v1'), sourceOf('user.moss')],
    }))
    const id = saveImportedTheme(runtime, registry, sourceOf('user.ocean', 'Ocean v2'), 'replace')
    expect(id).toBe('user.ocean')
    await Promise.resolve()
    const entries = registry.importedEntries()
    expect(entries.map(entry => entry.preset.id)).toEqual(['user.ocean', 'user.moss'])
    expect(entries[0]!.preset.name).toBe('Ocean v2')
  })

  it('renames to the first free id-N suffix on rename mode', async () => {
    const { registry, runtime } = make(durableHost({
      activeThemeId: null,
      importedThemes: [sourceOf('user.ocean'), sourceOf('user.ocean-2')],
    }))
    const id = saveImportedTheme(runtime, registry, sourceOf('user.ocean'), 'rename')
    expect(id).toBe('user.ocean-3')
    await Promise.resolve()
    expect(registry.importedEntries().map(entry => entry.preset.id))
      .toEqual(['user.ocean', 'user.ocean-2', 'user.ocean-3'])
  })

  it('keeps preserved unreadable entries when editing the durable list', async () => {
    const unreadable: unknown[] = [null, 'not-a-theme', { version: 99, id: 'user.future' }]
    const { registry, runtime, host } = make(durableHost({
      activeThemeId: null,
      importedThemes: [sourceOf('user.ocean'), ...unreadable],
    }))
    expect(runtime.getSnapshot().droppedImports).toBe(3)
    saveImportedTheme(runtime, registry, sourceOf('user.moss'), 'append')
    await vi.waitFor(() => {
      expect(host.scope.getSnapshot().value?.importedThemes).toHaveLength(5)
    })
    expect(host.scope.getSnapshot().value?.importedThemes).toEqual([
      sourceOf('user.ocean'), ...unreadable, sourceOf('user.moss'),
    ])
    removeImportedTheme(runtime, registry, 'user.ocean')
    await vi.waitFor(() => {
      expect(host.scope.getSnapshot().value?.importedThemes).toHaveLength(4)
    })
    expect(host.scope.getSnapshot().value?.importedThemes).toEqual([
      ...unreadable, sourceOf('user.moss'),
    ])
  })

  it('renames instead of duplicating when the id was claimed in flight', async () => {
    const { registry, runtime, host } = make()
    const calls: Array<{ value: unknown, release: () => void }> = []
    host.set.mockImplementation((field: string, next: unknown) => new Promise<void>(resolve => {
      calls.push({
        value: next,
        release: () => {
          host.publish({
            status: 'ready',
            value: { ...host.scope.getSnapshot().value!, [field]: next },
            revision: (host.scope.getSnapshot().revision ?? 0) + 1,
            writable: true,
          })
          resolve()
        },
      })
    }))
    saveImportedTheme(runtime, registry, sourceOf('user.ocean'), 'append')
    const second = saveImportedTheme(runtime, registry, sourceOf('user.ocean', 'Ocean 2'), 'append')
    expect(second).toBe('user.ocean-2')
    expect(runtime.requestedImportedSources()?.map(entry => (entry as Record<string, unknown>)['id']))
      .toEqual(['user.ocean', 'user.ocean-2'])
    calls[0]!.release()
    await vi.waitFor(() => { expect(calls).toHaveLength(2) })
    calls[1]!.release()
    await vi.waitFor(() => {
      expect(registry.importedEntries().map(entry => entry.preset.id)).toEqual(['user.ocean', 'user.ocean-2'])
    })
  })

  it('merges a follow-up import on the requested list while a write is in flight', async () => {
    const { registry, runtime, host } = make()
    const calls: Array<{ value: unknown, release: () => void }> = []
    host.set.mockImplementation((field: string, next: unknown) => new Promise<void>(resolve => {
      calls.push({
        value: next,
        release: () => {
          host.publish({
            status: 'ready',
            value: { ...host.scope.getSnapshot().value!, [field]: next },
            revision: (host.scope.getSnapshot().revision ?? 0) + 1,
            writable: true,
          })
          resolve()
        },
      })
    }))
    saveImportedTheme(runtime, registry, sourceOf('user.ocean'), 'append')
    saveImportedTheme(runtime, registry, sourceOf('user.moss'), 'append')
    // Only the first write is in flight; the second merges on the requested list.
    expect(calls).toHaveLength(1)
    calls[0]!.release()
    await vi.waitFor(() => { expect(calls).toHaveLength(2) })
    expect((calls[1]!.value as Record<string, unknown>[]).map(entry => entry['id']))
      .toEqual(['user.ocean', 'user.moss'])
    calls[1]!.release()
    await vi.waitFor(() => {
      expect(registry.importedEntries().map(entry => entry.preset.id)).toEqual(['user.ocean', 'user.moss'])
    })
  })

  it('persists and adopts both themes when a colliding id uses all 64 characters', async () => {
    const originalId = 'a'.repeat(64)
    const { runtime, registry, host } = make(durableHost({ activeThemeId: null, importedThemes: [sourceOf(originalId)] }))
    const renamed = saveImportedTheme(runtime, registry, sourceOf(originalId), 'rename')
    await Promise.resolve()
    expect(registry.importedEntries().map(entry => entry.preset.id)).toEqual([originalId, renamed])
    expect(runtime.getSnapshot().droppedImports).toBe(0)
    expect(host.scope.getSnapshot().value?.importedThemes).toHaveLength(2)
  })

  it('drops one imported theme from the durable list', async () => {
    const { registry, runtime } = make(durableHost({
      activeThemeId: null,
      importedThemes: [sourceOf('user.ocean'), sourceOf('user.moss')],
    }))
    removeImportedTheme(runtime, registry, 'user.ocean')
    await Promise.resolve()
    expect(registry.importedEntries().map(entry => entry.preset.id)).toEqual(['user.moss'])
  })
})

describe('previewWhenImported', () => {
  it.each([false, true])('previews accepted replacement colors with active=%s', async (active) => {
    const host = durableHost({ activeThemeId: active ? 'user.ocean' : null, importedThemes: [sourceOf('user.ocean')] })
    const { runtime, registry, overlay } = make(host)
    const preview = vi.spyOn(runtime, 'previewTheme')
    const replacement = sourceOf('user.ocean', 'Ocean v2')
    replacement['palette'] = { light: { ...LIGHT, brand: '#ff0000' }, dark: { ...DARK } }
    let release!: () => void
    host.set.mockImplementation((field: string, value: unknown) => new Promise<void>(resolve => {
      release = () => {
        host.publish({ value: { ...host.scope.getSnapshot().value!, [field]: value } })
        resolve()
      }
    }))
    const id = saveImportedTheme(runtime, registry, replacement, 'replace')
    previewWhenImported(registry, runtime, id)
    expect(preview).not.toHaveBeenCalled()
    release()
    await Promise.resolve()
    expect(preview).toHaveBeenCalledOnce()
    expect(overlay.layers.get(PREVIEW_SOURCE)?.['--dsw-alias-brand-primary']?.light).toBe('#ff0000')
    expect(runtime.getSnapshot()).toMatchObject({ previewing: true, previewThemeId: id })
    runtime.dispose()
  })

  it('previews each accepted concurrent import once and leaves the newest preview on top', async () => {
    const { runtime, registry } = make()
    const preview = vi.spyOn(runtime, 'previewTheme')
    const first = saveImportedTheme(runtime, registry, sourceOf('user.ocean'), 'append')
    previewWhenImported(registry, runtime, first)
    const second = saveImportedTheme(runtime, registry, sourceOf('user.moss'), 'append')
    previewWhenImported(registry, runtime, second)
    await Promise.resolve()
    await Promise.resolve()
    expect(preview.mock.calls).toEqual([['user.ocean'], ['user.moss']])
    expect(runtime.getSnapshot()).toMatchObject({ previewing: true, previewThemeId: second })
    runtime.dispose()
  })

  it('does not preview the old source when a replacement is rejected', async () => {
    const { runtime, registry, host } = make(durableHost({ activeThemeId: null, importedThemes: [sourceOf('user.ocean')] }))
    const preview = vi.spyOn(runtime, 'previewTheme')
    host.set.mockImplementation(() => Promise.resolve())
    saveImportedTheme(runtime, registry, sourceOf('user.ocean', 'Ocean v2'), 'replace')
    previewWhenImported(registry, runtime, 'user.ocean')
    await Promise.resolve()
    expect(preview).not.toHaveBeenCalled()
    expect(runtime.getSnapshot().saveError).toBe(true)
    runtime.dispose()
  })

  it('ends preview listeners after repeated rejected replacements', async () => {
    const { runtime, registry, host } = make(durableHost({ activeThemeId: null, importedThemes: [sourceOf('user.ocean')] }))
    host.set.mockImplementation(() => Promise.resolve())
    const off = vi.fn()
    const subscribe = runtime.subscribe.bind(runtime)
    vi.spyOn(runtime, 'subscribe').mockImplementation(listener => {
      const unsubscribe = subscribe(listener)
      return () => { unsubscribe(); off() }
    })
    for (let n = 0; n < 2; n += 1) {
      saveImportedTheme(runtime, registry, sourceOf('user.ocean', 'Ocean v2'), 'replace')
      previewWhenImported(registry, runtime, 'user.ocean')
      await Promise.resolve()
    }
    expect(off).toHaveBeenCalledTimes(2)
    runtime.dispose()
  })

  it('previews an accepted append even when an unrelated registry revision arrives first', async () => {
    const { runtime, registry } = make()
    const preview = vi.spyOn(runtime, 'previewTheme')
    saveImportedTheme(runtime, registry, sourceOf('user.ocean'), 'append')
    previewWhenImported(registry, runtime, 'user.ocean')
    registry.setImported(parseStoredThemeFiles([sourceOf('user.moss')]).entries)
    expect(preview).not.toHaveBeenCalled()
    await Promise.resolve()
    expect(preview).toHaveBeenCalledWith('user.ocean')
    runtime.dispose()
  })
})
