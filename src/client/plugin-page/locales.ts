/** `plugins.themeStudio` namespace dictionaries for the Plugins-page entry. */

export const NS = 'plugins.themeStudio'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  title: '主题工作室',
  description: '在设置里预览并保存配色，下次打开仍然生效。',
  components: '包含的组件',
  countTotal: '共 {count} 个',
  versionTag: 'v{version}',
} satisfies Record<string, string>

/** The plugins.themeStudio namespace key union. */
export type ThemeStudioPluginsKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  title: 'Theme Studio',
  description: 'Preview and save color themes in Settings. They stay in place the next time you open the app.',
  components: 'Components',
  countTotal: '{count} total',
  versionTag: 'v{version}',
} satisfies Record<ThemeStudioPluginsKey, string>

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Plugins-page copy for this package. */
    'plugins.themeStudio': ThemeStudioPluginsKey
  }
}
