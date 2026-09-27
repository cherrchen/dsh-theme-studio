/** The Plugins detail subject and its package/row facts, as the page passes them. */

/** One row of a bundle, as a detail contribution sees it. */
export interface ThemeStudioPluginRowRef {
  readonly rowId: string
  readonly moduleName: string
  readonly enabled: boolean
}

/** One bundle, as a detail contribution sees it. */
export interface ThemeStudioPluginPackageRef {
  readonly name: string
  readonly version?: string
  readonly installed: boolean
  readonly enabled: boolean
  readonly rows: readonly ThemeStudioPluginRowRef[]
}

/** What a Plugins detail page is about: a bundle, one of its rows, or an Official item id. */
export type ThemeStudioPluginsSubject =
  | { readonly kind: 'bundle'; readonly pkg: ThemeStudioPluginPackageRef }
  | { readonly kind: 'row'; readonly pkg: ThemeStudioPluginPackageRef; readonly row: ThemeStudioPluginRowRef }
  | { readonly kind: 'item'; readonly id: string }
