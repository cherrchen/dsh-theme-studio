/**
 * Theme Creator mode control, rendered on the plugin's own page in Plugins
 * through the `plugins.bundle.config` keyed slot. The slot exists from DSH
 * 0.1.6-alpha.2; hosts without it keep the stored or default mode.
 */
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import { useId } from 'react'
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type { CreatorAgentMode } from '../constants.ts'
import type { createThemeStudioRowStore } from './store.ts'
import css from './ThemeStudioRow.module.css'

/** Injected write for the Theme Creator visibility mode. */
export interface CreatorConfigInjected {
  /** Persist the Theme Creator visibility mode. */
  setCreatorMode: (mode: CreatorAgentMode) => void
}

/** Full component props: runtime share + store share + locale seat + injected face. */
export type CreatorConfigSectionProps =
  PropsRuntime<'plugins.bundle.config'> & PropsStore<ReturnType<typeof createThemeStudioRowStore>>
  & PropsLocale<'settings.theme-studio'> & CreatorConfigInjected

const MODES: readonly CreatorAgentMode[] = ['off', 'gesture', 'catalog']

/**
 * Render the creator-mode section on the bundle's Plugins page.
 * @param props - composed slot props.
 * @returns the section, or `null` for a non-page view.
 */
export function CreatorConfigSection({ view, t, useStore, setCreatorMode }: CreatorConfigSectionProps) {
  const selectId = useId()
  const creatorMode = useStore(s => s.creatorMode)
  const settingsStatus = useStore(s => s.settingsStatus)
  if (view !== 'page') return null
  return (
    <div>
      <p className={css.manageGroup}>
        <label htmlFor={selectId}>{t('creator.section')}</label>
      </p>
      <select
        id={selectId}
        value={creatorMode}
        disabled={settingsStatus !== 'ready'}
        onChange={(event) => { setCreatorMode(event.target.value as CreatorAgentMode) }}
      >
        {MODES.map(mode => (
          <option key={mode} value={mode}>{t(`creator.label.${mode}`)}</option>
        ))}
      </select>
      <p className={css.modalDesc}>{t(`creator.mode.${creatorMode}`)}</p>
    </div>
  )
}
