/**
 * Themes preference row registered into the General section item slot:
 * title, description, and a menu-style option list. Hovering or focusing
 * an option previews its theme; leaving the list restores the applied
 * theme; selecting an option applies it.
 */
import { useState } from 'react'
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { CheckIcon, MenuSurfaceLike } from '../compat/menu-surface.tsx'
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
  const [focusIndex, setFocusIndex] = useState(() => {
    const index = cards.findIndex(card => card.id === activeThemeId)
    return index < 0 ? 0 : index
  })

  return (
    <div className={css.group}>
      <div className={css.title}>{t('title')}</div>
      <p className={css.description}>{t('description')}</p>
      {settingsStatus === 'loading' ? <p className={css.status}>{t('status.loading')}</p> : null}
      {settingsStatus === 'unavailable' ? <p className={css.status}>{t('status.unavailable')}</p> : null}
      {saveError ? <p className={css.alert} role="alert">{t('status.saveFailed')}</p> : null}
      <MenuSurfaceLike
        className={css.list}
        role="listbox"
        aria-label={t('title')}
        onMouseLeave={() => { cancelPreview() }}
        onBlur={(event) => {
          const next = event.relatedTarget
          if (next instanceof Node && event.currentTarget.contains(next)) return
          cancelPreview()
        }}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
          event.preventDefault()
          const count = cards.length
          const delta = event.key === 'ArrowDown' ? 1 : -1
          const next = (focusIndex + delta + count) % count
          event.currentTarget.querySelectorAll<HTMLElement>('[role="option"]')[next]?.focus()
        }}
      >
        {cards.map((card, index) => {
          const name = t(card.nameKey as ThemeStudioKey)
          const selected = activeThemeId === card.id
          return (
            <div
              key={card.id ?? 'default'}
              role="option"
              aria-selected={selected}
              tabIndex={index === focusIndex ? 0 : -1}
              className={css.option}
              onMouseEnter={() => { previewTheme(card.id) }}
              onFocus={() => { setFocusIndex(index); previewTheme(card.id) }}
              onClick={() => { activateTheme(card.id) }}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
                activateTheme(card.id)
              }}
            >
              <Mosaic preview={card.preview.light} />
              <span className={css.optionLabel}>{name}</span>
              {selected ? <CheckIcon className={css.check} /> : null}
            </div>
          )
        })}
      </MenuSurfaceLike>
      <div className={css.live} role="status" aria-live="polite">
        {previewing ? formatLocale(t('previewing'), { name: previewName }) : ''}
      </div>
    </div>
  )
}

function Mosaic({ preview }: { preview: ThemePreview }) {
  return (
    <div className={css.mosaic} aria-hidden="true">
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
