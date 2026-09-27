/** Official Plugins-page entry: this package's card, badge, and component row. */
import type { ThemeStudioPluginsKey } from './locales.ts'

/** npm name of this package, shown as the component row's title and on the detail page. */
export const THEME_STUDIO_PACKAGE = '@dsh-electron/dsh-theme-studio'

/** `plugins.item` registration id; also the patched Loader row id (`apps/electron/runtime/host.patch.yml`). */
export const THEME_STUDIO_ITEM_ID = 'theme-studio'

/** Official card order. Shipped official settings pages occupy 10, 20, 30, and 40. */
export const THEME_STUDIO_ITEM_ORDER = 130

/** `plugins.detail.badge` registration id. */
export const THEME_STUDIO_BADGE_ID = 'theme-studio-badge'

/** Badge order among a detail page's contributed tags. */
export const THEME_STUDIO_BADGE_ORDER = 20

/** `plugins.detail.section` registration id. */
export const THEME_STUDIO_SECTION_ID = 'theme-studio-components'

/** Section order among a detail page's contributed sections. */
export const THEME_STUDIO_SECTION_ORDER = 100

/** One row of the package's own component list. */
export interface ThemeStudioComponent {
  /** Short id shown as the row's code line; the Loader row id. */
  readonly id: string
  /** Row title; the npm package name, as an installed bundle names its rows. */
  readonly moduleName: string
  /** Locale key for the sentence under the title. */
  readonly descriptionKey: ThemeStudioPluginsKey
}

/** The package's component rows: itself, the way an installed bundle lists its rows. */
export const THEME_STUDIO_COMPONENTS: readonly ThemeStudioComponent[] = [
  {
    id: THEME_STUDIO_ITEM_ID,
    moduleName: THEME_STUDIO_PACKAGE,
    descriptionKey: 'description',
  },
]
