/**
 * Themes preference row registered into the General section item slot:
 * title, description, and a language-row-style selector. The trigger pill
 * opens a Menu whose rows preview on hover; closing the menu restores the
 * applied theme; selecting an option applies it.
 */
import { useState } from 'react'
import { Menu } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { ChevronDownIcon } from '../compat/menu-icons.tsx'
import type { ThemePreview } from './types.ts'
import type { createThemeStudioRowStore } from './store.ts'
import { formatLocale, type ThemeStudioKey } from './locales.ts'
import css from './ThemeStudioRow.module.css'

/** Injected business face: overlay writes. Copy rides the locale seat. */
export interface ThemeStudioRowInjected {
  /** Start a transient preview; `null` previews Default. */
  previewTheme: (id: string | null) => void
  /** Persist a builtin theme, or Default when `id` is `null`. */
  activateTheme: (id: string | null) => void
  /** Drop the transient preview. */
  cancelPreview: () => void
}

/** Full component props: runtime share + store share + locale seat + injected face. */
export type ThemeStudioRowComponentProps =
  PropsRuntime<'settings.general.item'> & PropsStore<ReturnType<typeof createThemeStudioRowStore>>
  & PropsLocale<'settings.theme-studio'> & ThemeStudioRowInjected

export const NAME_KEYS: Record<string, ThemeStudioKey> = {
  'dsh-theme-studio.claude': 'claude.name',
  'dsh-theme-studio.codex': 'codex.name',
  'dsh-theme-studio.claude-cream': 'claude-cream.name',
  'dsh-theme-studio.graphite': 'graphite.name',
  'dsh-theme-studio.oled': 'oled.name',
  'dsh-theme-studio.nordic': 'nordic.name',
  'dsh-theme-studio.paper': 'paper.name',
  'dsh-theme-studio.warm': 'warm.name',
}

/** MenuItem ids are strings; the Default card carries a `null` theme id. */
const DEFAULT_ITEM_ID = 'default'

/**
 * Render the Themes row.
 * @param props - composed slot props.
 * @returns the row element tree.
 */
export function ThemeStudioRow({
  t, useStore, previewTheme, activateTheme, cancelPreview,
}: ThemeStudioRowComponentProps) {
  const cards = useStore(s => s.cards)
  const activeThemeId = useStore(s => s.activeThemeId)
  const previewThemeId = useStore(s => s.previewThemeId)
  const previewing = useStore(s => s.previewing)
  const settingsStatus = useStore(s => s.settingsStatus)
  const saveError = useStore(s => s.saveError)
  const previewName = previewLabel(t, previewing, previewThemeId)
  const [open, setOpen] = useState(false)
  const activeKey = (cards.find(card => card.id === activeThemeId)?.nameKey ?? 'default.name') as ThemeStudioKey

  return (
    <div className={css.row}>
      <div className={css.rowText}>
        <div className={css.title}>{t('title')}</div>
        <p className={css.description}>{t('description')}</p>
        {settingsStatus === 'loading' ? <p className={css.status}>{t('status.loading')}</p> : null}
        {settingsStatus === 'unavailable' ? <p className={css.status}>{t('status.unavailable')}</p> : null}
        {saveError ? <p className={css.alert} role="alert">{t('status.saveFailed')}</p> : null}
      </div>
      <Menu
        open={open}
        onClose={() => {
          cancelPreview()
          setOpen(false)
        }}
        items={cards.map(card => ({
          id: card.id ?? DEFAULT_ITEM_ID,
          icon: <Mosaic preview={card.preview.light} onMouseEnter={() => { previewTheme(card.id) }} />,
          label: (
            <span className={css.itemLabel} onMouseEnter={() => { previewTheme(card.id) }}>
              {t(card.nameKey as ThemeStudioKey)}
            </span>
          ),
        }))}
        selectedId={activeThemeId ?? DEFAULT_ITEM_ID}
        onSelect={(id) => {
          activateTheme(id === DEFAULT_ITEM_ID ? null : id)
          setOpen(false)
        }}
        align="end"
        portal
        closeOnPointerLeave
        anchor={(
          <button
            type="button"
            className={css.selector}
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => { setOpen(v => !v) }}
          >
            {t(activeKey)}
            <ChevronDownIcon className={css.chevron} />
          </button>
        )}
      />
      <div className={css.live} role="status" aria-live="polite">
        {previewing ? formatLocale(t('previewing'), { name: previewName }) : ''}
      </div>
    </div>
  )
}

function Mosaic({ preview, onMouseEnter }: { preview: ThemePreview; onMouseEnter: () => void }) {
  return (
    <div className={css.mosaic} aria-hidden="true" onMouseEnter={onMouseEnter}>
      <span style={{ background: preview.background }} />
      <span style={{ background: preview.surface }} />
      <span style={{ background: preview.foreground }} />
      <span style={{ background: preview.accent }} />
    </div>
  )
}

function previewLabel(
  t: (key: ThemeStudioKey) => string,
  previewing: boolean,
  previewThemeId: string | null,
): string {
  if (!previewing) return ''
  if (previewThemeId === null) return t('default.name')
  return t(NAME_KEYS[previewThemeId] ?? 'default.name')
}
