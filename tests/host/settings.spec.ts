import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { apply, Config, THEME_STUDIO_SETTINGS_NAMESPACE, ThemeStudioSettingsSchema } from '../../src/index.ts'

describe('Theme Studio host settings', () => {
  it('accepts a persisted theme id and the Default null value', () => {
    expect(ThemeStudioSettingsSchema({ activeThemeId: null })).toEqual({ activeThemeId: null })
    expect(ThemeStudioSettingsSchema({ activeThemeId: 'dsh-theme-studio.nordic' }))
      .toEqual({ activeThemeId: 'dsh-theme-studio.nordic' })
  })

  it('rejects a non-string, non-null activeThemeId', () => {
    expect(() => ThemeStudioSettingsSchema({ activeThemeId: 1 })).toThrow()
  })

  it('registers the namespace with a host that returns the legacy namespace scope', async () => {
    const ctx = new Context()
    // The legacy API answers with the owner's namespace scope, a plain object
    // that is not a disposer. Cordis rejects such an object when a plugin apply
    // returns it, so the adapter must drop it; the provider keeps the
    // registration alive on the calling fiber. The installed provider's own
    // lifetime behavior is covered in settings-provider.spec.ts.
    const scope = { get: () => undefined, watch: () => () => {}, update: () => Promise.resolve(), replace: () => Promise.resolve() }
    const register = vi.fn(() => scope)
    ctx.provide('settings', { register } as never)
    const fiber = ctx.plugin({ apply })
    await fiber.await()
    expect(register).toHaveBeenCalledWith(THEME_STUDIO_SETTINGS_NAMESPACE, ThemeStudioSettingsSchema)
    await fiber.dispose()
  })

  it('suppresses the generated form when settings only exposes configure', async () => {
    const ctx = new Context()
    const dispose = vi.fn()
    const configure = vi.fn(() => dispose)
    ctx.provide('settings', { configure } as never)
    const fiber = ctx.plugin({ apply, Config })
    await fiber.await()
    expect(configure).toHaveBeenCalledOnce()
    expect(configure.mock.calls[0]?.[0]).toEqual({ auto: false })
    const owner = configure.mock.calls[0]?.[1]
    expect(owner === fiber || owner === Object.getPrototypeOf(fiber)).toBe(true)
    await fiber.dispose()
    expect(dispose).toHaveBeenCalledOnce()
  })

  it('prefers register when both settings methods exist', async () => {
    const ctx = new Context()
    const register = vi.fn(() => () => {})
    const configure = vi.fn(() => () => {})
    ctx.provide('settings', { register, configure } as never)
    const fiber = ctx.plugin({ apply })
    await fiber.await()
    expect(register).toHaveBeenCalledWith(THEME_STUDIO_SETTINGS_NAMESPACE, ThemeStudioSettingsSchema)
    expect(configure).not.toHaveBeenCalled()
    await fiber.dispose()
  })

  it('is a no-op without a settings service', async () => {
    const ctx = new Context()
    const fiber = ctx.plugin({ apply })
    await fiber.await()
    await fiber.dispose()
  })
})
