/** Official Plugins-page card: the card's one-liner only; the page draws the title and artwork. */
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'

/** Props the renderer binds for the Theme Studio Official card. */
export type ThemeStudioPluginCardProps =
  PropsLocale<'plugins.themeStudio'>
  & { readonly view: 'summary' | 'page' }

/**
 * Render the Official card one-liner. The detail page body stays empty: the
 * Themes picker is the Settings → General row this plugin already registers.
 * @param props - View requested by the Plugins page and locale copy.
 * @returns the description, or nothing for the page view.
 */
export function ThemeStudioPluginCard(props: ThemeStudioPluginCardProps) {
  if (props.view !== 'summary') return null
  return props.t('description')
}
