/**
 * Plugins-page entry: the dictionaries and the three components the compat
 * adapter registers into the slots the Plugins page declares.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import { registerPluginPageSlots } from '../../compat/plugin-page.ts'
import { en, NS, zh } from './locales.ts'
import { ThemeStudioPluginBadge } from './ThemeStudioPluginBadge.tsx'
import { ThemeStudioPluginCard } from './ThemeStudioPluginCard.tsx'
import { ThemeStudioPluginSection } from './ThemeStudioPluginSection.tsx'

export { NS as PLUGINS_NS, en as pluginPageEn, zh as pluginPageZh } from './locales.ts'
export {
  THEME_STUDIO_BADGE_ID, THEME_STUDIO_COMPONENTS, THEME_STUDIO_ITEM_ID,
  THEME_STUDIO_ITEM_ORDER, THEME_STUDIO_PACKAGE, THEME_STUDIO_SECTION_ID,
} from './roster.ts'
export type { ThemeStudioPluginsKey } from './locales.ts'
export type { ThemeStudioComponent } from './roster.ts'
export type { ThemeStudioPluginPackageRef, ThemeStudioPluginRowRef, ThemeStudioPluginsSubject } from './types.ts'
export type { ThemeStudioPluginBadgeProps } from './ThemeStudioPluginBadge.tsx'
export type { ThemeStudioPluginCardProps } from './ThemeStudioPluginCard.tsx'
export type { ThemeStudioPluginSectionProps } from './ThemeStudioPluginSection.tsx'

/**
 * Register the Official card, the detail badge, and the detail section on one
 * client context.
 * @param ctx - Client plugin fiber that carries `slots` and `locale`.
 */
export function registerPluginPage(ctx: ClientContext): void {
  const t = ctx.locale.bind(NS)
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'theme-studio: plugin page dictionaries')
  registerPluginPageSlots(ctx, {
    locale: NS,
    label: () => t('title'),
    card: ThemeStudioPluginCard,
    badge: ThemeStudioPluginBadge,
    section: ThemeStudioPluginSection,
  })
}
