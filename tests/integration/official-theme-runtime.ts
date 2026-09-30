/** Load the actual installed upstream client bundle; only unused UI primitives are stubbed. */
import type { Context } from '@deepseek-ai/cordis'
import type { ThemeTokenOverrides } from '@deepseek-ai/dsh-client-ui-theme/client'
import { materializeClientBundle } from '../setup/module-loader.client.ts'

interface ThemeSettings { preference: 'light' | 'dark' | 'system' }
interface SettingsScope<T> {
  getSnapshot(): { value: T | undefined }
  subscribe(listener: () => void): () => void
  set(field: string, value: unknown): Promise<unknown>
}
interface InstalledThemeRuntime {
  getTheme(): { preference: string; active: { colorScheme: string; tokens: Record<string, string> } }
  setTheme(id: string): void
  overrideTokens(source: string, tokens: ThemeTokenOverrides): () => void
}

export const ThemeRuntime = materializeClientBundle('@deepseek-ai/dsh-client-ui-theme', {
  '@deepseek-ai/dsh-client-ui-primitives': {},
}).ThemeRuntime as new (ctx: Context, host: SettingsScope<ThemeSettings>) => InstalledThemeRuntime
