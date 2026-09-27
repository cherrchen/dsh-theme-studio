/** Read-only component roster on the Theme Studio detail page. */
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { THEME_STUDIO_COMPONENTS, THEME_STUDIO_ITEM_ID } from './roster.ts'
import type { ThemeStudioPluginsSubject } from './types.ts'
import css from './ThemeStudioPluginSection.module.css'

/** Props the renderer binds for one Plugins detail section. */
export type ThemeStudioPluginSectionProps =
  PropsLocale<'plugins.themeStudio'>
  & { readonly subject: ThemeStudioPluginsSubject }

/**
 * List the package's component rows on the Theme Studio Official page; render
 * nothing for any other subject. Rows are read-only and carry no live state.
 * @param props - Detail subject and locale copy.
 * @returns the Components section, or null.
 */
export function ThemeStudioPluginSection(props: ThemeStudioPluginSectionProps) {
  const { subject, t } = props
  if (subject.kind !== 'item' || subject.id !== THEME_STUDIO_ITEM_ID) return null
  return (
    <section className={css.section} aria-label={t('components')} data-plugin-rows>
      <div className={css.sectionHead}>
        <h4 className={css.title}>{t('components')}</h4>
        <span className={css.count}>{t('countTotal', { count: THEME_STUDIO_COMPONENTS.length })}</span>
      </div>
      <ul className={css.list}>
        {THEME_STUDIO_COMPONENTS.map(component => (
          <li key={component.id} className={css.row} data-plugin-row={component.id}>
            <span className={css.rowTitle}>{component.moduleName}</span>
            <span className={css.rowDesc}>{t(component.descriptionKey)}</span>
            <code className={css.rowId}>{component.id}</code>
          </li>
        ))}
      </ul>
    </section>
  )
}
