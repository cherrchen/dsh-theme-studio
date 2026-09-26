/**
 * Regression: mount the host half on the *installed* settings provider (not a
 * stub) and hold it to the durable-namespace contract.
 *
 * The legacy provider API (`register`) answers with the owner's namespace
 * scope, a plain object. Cordis collects a plugin `apply` result only when it
 * is a function, a thenable, or an iterable of those, and rejects any other
 * object as `Invalid effect`; that failure tears the injection child down and
 * rolls the namespace registration back. Returning the scope therefore left
 * every host up to 0.1.7-alpha.2 with an unregistered namespace, an
 * `unavailable` client scope, and no persistence — silently, because the
 * plugin logged nothing.
 *
 * The file adapts to whichever provider shape is installed: the legacy API is
 * exercised on hosts that have it, and skipped on the later profile-Config API,
 * whose contract is covered by `settings.spec.ts` and the real-profile runs.
 */
import { Context } from '@deepseek-ai/cordis'
import SettingsProvider from '@deepseek-ai/dsh-settings'
import { describe, expect, it } from 'vitest'
import { apply, Config, THEME_STUDIO_SETTINGS_NAMESPACE } from '../../src/index.ts'

/** Structural view of the legacy provider, independent of the installed types. */
interface LegacyProviderFace {
  /** @returns one descriptor per registered namespace. */
  describe(): Array<Record<string, unknown> & { ns?: string; namespace?: string }>
  /** @param ns - namespace to read. @returns the resolved section. */
  get(ns: string): unknown
  /**
   * @param ns - namespace to patch.
   * @param patch - partial section.
   * @returns settlement of the write.
   */
  update(ns: string, patch: Record<string, unknown>): Promise<unknown>
}

/** Constructor face of the installed provider; members are not named here. */
type ProviderConstructor = new (ctx: Context) => { readonly writable: boolean }

const Provider = SettingsProvider as unknown as ProviderConstructor
const legacyApi = typeof (Provider.prototype as { register?: unknown }).register === 'function'

/** In-memory provider with the storage hooks every provider implementation needs. */
class MemorySettings extends Provider {
  /** Persisted sections by namespace. */
  doc: Record<string, unknown> = {}
  /** @returns this provider always accepts writes. */
  get writable(): boolean { return true }
  /** @returns the stored document. */
  load(): Promise<Record<string, unknown>> { return Promise.resolve(structuredClone(this.doc)) }
  /**
   * @param ns - namespace being written.
   * @param section - new section.
   */
  async persist(ns: string, section: Record<string, unknown>): Promise<void> {
    this.doc[ns] = structuredClone(section)
  }
}

const suite = legacyApi ? describe : describe.skip

suite('Theme Studio host settings on the installed provider', () => {
  it('keeps the namespace registered, writable, and scoped to the plugin fiber', async () => {
    const ctx = new Context()
    await ctx.plugin(MemorySettings).await()
    const provider = ctx.get('settings') as unknown as LegacyProviderFace & MemorySettings

    const fiber = ctx.plugin({ apply, Config })
    await fiber.await()

    const described = provider.describe().find(entry => (entry.ns ?? entry.namespace) === THEME_STUDIO_SETTINGS_NAMESPACE)
    expect(described, 'the plugin registers its namespace on the provider').toBeDefined()
    expect(JSON.stringify(described), 'the described schema carries the plugin field').toContain('activeThemeId')

    await provider.update(THEME_STUDIO_SETTINGS_NAMESPACE, { activeThemeId: 'dsh-theme-studio.nordic' })
    expect(provider.get(THEME_STUDIO_SETTINGS_NAMESPACE)).toEqual({ activeThemeId: 'dsh-theme-studio.nordic' })
    expect(provider.doc[THEME_STUDIO_SETTINGS_NAMESPACE]).toEqual({ activeThemeId: 'dsh-theme-studio.nordic' })
    await expect(provider.update(THEME_STUDIO_SETTINGS_NAMESPACE, { activeThemeId: 1 })).rejects.toThrow()

    await fiber.dispose()
    expect(provider.describe().map(entry => entry.ns ?? entry.namespace ?? ''))
      .not.toContain(THEME_STUDIO_SETTINGS_NAMESPACE)
  })
})
