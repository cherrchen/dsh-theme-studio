/**
 * Adapt the Plugins page's Official-item slots across supported DSH releases.
 * `plugins.item` is declared from 0.1.6-alpha.2 on (the first release that
 * ships the standalone plugin-manager client); `plugins.detail.badge` and
 * `plugins.detail.section` from 0.1.7-alpha.1 on. Releases that declare none of
 * them leave every `inject` below pending, so each host renders only the
 * surface it owns: three contributions on 0.1.7-alpha.1+, the card alone on
 * 0.1.6-alpha.2, and the Themes settings row alone on older hosts. The
 * declaration is the probe; nothing here compares version numbers.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import {
  THEME_STUDIO_BADGE_ID, THEME_STUDIO_BADGE_ORDER,
  THEME_STUDIO_ITEM_ID, THEME_STUDIO_ITEM_ORDER,
  THEME_STUDIO_SECTION_ID, THEME_STUDIO_SECTION_ORDER,
} from '../client/plugin-page/roster.ts'

/** The two slot methods this adapter uses; the host decides which slots exist. */
interface PluginPageSlots {
  inject(name: string, callback: () => void | (() => void)): () => void
  register(options: Record<string, unknown>, component: unknown): () => void
}

/** What one Plugins-page contribution set supplies. */
export interface PluginPageContribution {
  /** Locale namespace the page reads the card title from. */
  locale: string
  /** Card title in the active locale. */
  label: () => string
  /** Official card component. */
  card: unknown
  /** Detail badge component. */
  badge: unknown
  /** Detail section component. */
  section: unknown
}

/**
 * Register the card, the badge, and the section on every Plugins-page slot the
 * host declares.
 * @param ctx - Client plugin fiber that carries `slots`.
 * @param contribution - locale namespace, title thunk, and the three components.
 */
export function registerPluginPageSlots(ctx: ClientContext, contribution: PluginPageContribution): void {
  const slots = ctx.slots as unknown as PluginPageSlots
  ctx.effect(() => slots.inject('plugins.item', () => slots.register({
    name: 'plugins.item',
    id: THEME_STUDIO_ITEM_ID,
    order: THEME_STUDIO_ITEM_ORDER,
    label: contribution.label,
    locale: contribution.locale,
  }, contribution.card)), 'theme-studio: plugin page card')
  ctx.effect(() => slots.inject('plugins.detail.badge', () => slots.register({
    name: 'plugins.detail.badge',
    id: THEME_STUDIO_BADGE_ID,
    order: THEME_STUDIO_BADGE_ORDER,
    locale: contribution.locale,
  }, contribution.badge)), 'theme-studio: plugin page badge')
  ctx.effect(() => slots.inject('plugins.detail.section', () => slots.register({
    name: 'plugins.detail.section',
    id: THEME_STUDIO_SECTION_ID,
    order: THEME_STUDIO_SECTION_ORDER,
    locale: contribution.locale,
  }, contribution.section)), 'theme-studio: plugin page section')
}
