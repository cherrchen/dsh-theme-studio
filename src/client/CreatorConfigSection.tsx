/**
 * Theme Creator mode control, rendered on the plugin's own page in Plugins
 * through the `plugins.bundle.config` keyed slot. The slot exists from DSH
 * 0.1.6-alpha.2; hosts without it keep the stored or default mode.
 */
import type {} from '../compat/plugin-manager-slot.ts'
import { useState } from 'react'
import { Menu } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import { ChevronDownIcon } from '../compat/menu-icons.tsx'
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
  const [open, setOpen] = useState(false)
  const creatorMode = useStore(s => s.creatorMode)
  const settingsStatus = useStore(s => s.settingsStatus)
  if (view !== 'page') return null
  const disabled = settingsStatus !== 'ready'
  return (
    <div className={css.creatorField}>
      <div className={css.creatorTitle}>{t('creator.section')}</div>
      <Menu
        open={open && !disabled}
        onClose={() => { setOpen(false) }}
        items={MODES.map(mode => ({ id: mode, label: t(`creator.label.${mode}`) }))}
        selectedId={creatorMode}
        onSelect={(id) => {
          setCreatorMode(id as CreatorAgentMode)
          setOpen(false)
        }}
        align="start"
        portal
        anchor={(
          <button
            type="button"
            className={css.selector}
            disabled={disabled}
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => { setOpen(v => !v) }}
          >
            <span className={css.selectorName}>{t(`creator.label.${creatorMode}`)}</span>
            <ChevronDownIcon className={css.chevron} />
          </button>
        )}
      />
      <p className={css.creatorDesc}>{t(`creator.mode.${creatorMode}`)}</p>
    </div>
  )
}
