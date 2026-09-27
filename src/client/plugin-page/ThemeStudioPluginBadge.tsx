/** Version and package name beside the Theme Studio detail title. */
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { THEME_STUDIO_VERSION } from '../../constants.ts'
import { THEME_STUDIO_ITEM_ID, THEME_STUDIO_PACKAGE } from './roster.ts'
import type { ThemeStudioPluginsSubject } from './types.ts'
import css from './ThemeStudioPluginBadge.module.css'

/** Props the renderer binds for one Plugins detail badge. */
export type ThemeStudioPluginBadgeProps =
  PropsLocale<'plugins.themeStudio'>
  & { readonly subject: ThemeStudioPluginsSubject }

/**
 * Show the version and package name beside the Theme Studio title. Every other
 * subject renders nothing.
 * @param props - Detail subject and locale copy.
 * @returns the title-row tags, or null.
 */
export function ThemeStudioPluginBadge(props: ThemeStudioPluginBadgeProps) {
  const { subject, t } = props
  if (subject.kind !== 'item' || subject.id !== THEME_STUDIO_ITEM_ID) return null
  return (
    <>
      <span className={css.versionTag}>{t('versionTag', { version: THEME_STUDIO_VERSION })}</span>
      <code className={css.packageName}>{THEME_STUDIO_PACKAGE}</code>
    </>
  )
}
