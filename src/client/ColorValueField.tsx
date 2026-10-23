/**
 * Compact color swatch/value trigger with a portaled RGB / color-mix editor.
 * Switching tabs never rewrites the draft; only editing a value does.
 * The leading square always previews the value resolved against the draft's
 * same-scheme token map (never the page theme, so candidate colors stay
 * honest); unresolvable values show a hatched placeholder.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, Input, useAnchoredPosition, useDismissOnOutsidePointer } from '@deepseek-ai/dsh-client-ui-primitives'
import { Checkbox, MenuSurface } from '../compat/ui-atoms.tsx'
import { parseColorMix, resolveCssColor, resolvePreviewColor } from './contrast-colors.ts'
import { type ThemeStudioKey } from './locales.ts'
import css from './ThemeStudioRow.module.css'

export type ColorInputMode = 'literal' | 'expression'

export interface ColorValueFieldProps {
  /** Draft value for this scheme. */
  value: string
  /** Same-scheme token map used to resolve `var()`/`color-mix()` previews. */
  tokens: Readonly<Record<string, string>>
  /** Literal colors offered in the palette popover. */
  swatches: readonly string[]
  schemeLabel: string
  token: string
  disabled: boolean
  invalid: boolean
  describedBy: string | undefined
  onChange: (next: string) => void
  /** Field-registration ref for error jump/focus; attaches to the compact trigger. */
  inputRef: (el: HTMLElement | null) => void
  t: (key: ThemeStudioKey) => string
}

function isLiteralColor(value: string): boolean {
  const v = value.trim()
  return /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(v)
    || /^rgba?\(.*\)$/i.test(v)
    || /^(?:transparent|black|white)$/i.test(v)
}

function Swatch({ resolved, t }: { resolved: string | null; t: (key: ThemeStudioKey) => string }) {
  return (
    <span
      className={css.colorSwatch}
      role="img"
      aria-label={t('editor.color.swatch')}
      title={resolved ?? t('editor.color.noPreview')}
    >
      {resolved === null
        ? <span className={css.swatchUnknown} />
        : <span className={css.swatchFill} style={{ background: resolved }} />}
    </span>
  )
}

export function ColorValueField({
  value, tokens, swatches, schemeLabel, token, disabled, invalid, describedBy, onChange, inputRef, t,
}: ColorValueFieldProps) {
  const detected: ColorInputMode = isLiteralColor(value) ? 'literal' : 'expression'
  const [mode, setMode] = useState<ColorInputMode>(detected)
  const [open, setOpen] = useState(false)
  const [mix, setMix] = useState({ color: '#000000', percent: 50, withColor: 'transparent' })
  const root = useRef<HTMLDivElement>(null)
  const anchor = useRef<HTMLButtonElement | null>(null)
  const panel = useRef<HTMLDivElement>(null)
  const id = useId()
  const visible = open && !disabled
  const resolved = useMemo(() => resolveCssColor(value, tokens), [value, tokens])
  const opaqueHex = useMemo(() => resolvePreviewColor(value, tokens), [value, tokens])
  const position = useAnchoredPosition({
    open: visible,
    anchorRef: anchor,
    panelRef: panel,
    side: 'bottom',
    gap: 4,
    margin: 8,
  })
  const placed = position !== null
  useDismissOnOutsidePointer(root, visible, setOpen, panel)

  const closePicker = (): void => {
    setOpen(false)
    anchor.current?.focus()
  }

  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  // The portaled editor owns its keyboard events, including Modal Escape/Tab.
  useEffect(() => {
    const element = panel.current
    if (!visible || !placed || element === null) return
    element.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus()
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        event.preventDefault()
        setOpen(false)
        anchor.current?.focus()
      } else if (event.key === 'Tab') {
        event.stopPropagation()
        const controls = [...element.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)')]
          .filter(control => control.tabIndex >= 0)
        const boundary = event.shiftKey ? controls[0] : controls.at(-1)
        if (document.activeElement === boundary) {
          event.preventDefault()
          setOpen(false)
          anchor.current?.focus()
        }
      }
    }
    const onFocus = (event: FocusEvent): void => {
      const target = event.target
      if (target instanceof Node && !element.contains(target) && !root.current?.contains(target)) setOpen(false)
    }
    element.addEventListener('keydown', onKey)
    document.addEventListener('focusin', onFocus)
    return () => {
      element.removeEventListener('keydown', onKey)
      document.removeEventListener('focusin', onFocus)
    }
  }, [visible, placed])

  const seedMix = (next: string): void => {
    setMix(parseColorMix(next) ?? {
      color: resolvePreviewColor(next, tokens) ?? (isLiteralColor(next) ? next.trim() : '#000000'),
      percent: 50,
      withColor: 'transparent',
    })
  }
  const applyMix = (): void => {
    const percent = Math.min(100, Math.max(0, mix.percent))
    const color = mix.color.trim() === '' ? '#000000' : mix.color.trim()
    const withColor = mix.withColor.trim() === '' ? 'transparent' : mix.withColor.trim()
    onChange(`color-mix(in srgb, ${color} ${percent}%, ${withColor})`)
  }
  const mixTransparent = mix.withColor.trim().toLowerCase() === 'transparent'
  const mixColorResolved = resolveCssColor(mix.color, tokens)
  const mixWithResolved = resolveCssColor(mix.withColor, tokens)
  const fieldLabel = `${schemeLabel}: ${token}`

  return (
    <div className={css.colorField} ref={root}>
      <button
        type="button"
        ref={element => { anchor.current = element; inputRef(element) }}
        className={css.colorTrigger}
        aria-label={fieldLabel}
        aria-haspopup="dialog"
        aria-expanded={visible}
        aria-controls={visible ? `${id}-picker` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        title={value}
        disabled={disabled}
        onClick={() => {
          if (!open) {
            setMode(detected)
            seedMix(value)
          }
          setOpen(current => !current)
        }}
      >
        <Swatch resolved={resolved} t={t} />
        <span className={css.colorDisplay}>{value || t('editor.color.empty')}</span>
        <span className={css.colorMode}>{detected === 'literal' ? 'RGB' : 'color-mix'}</span>
      </button>
      {visible ? createPortal(
        <MenuSurface
          ref={panel}
          id={`${id}-picker`}
          className={css.palettePop}
          style={position === null ? { position: 'fixed', visibility: 'hidden' } : { position: 'fixed', ...position }}
          role="dialog"
          aria-label={`${t('editor.color.edit')}: ${fieldLabel}`}
        >
          <div className={css.paletteHeader}>
            <span className={css.paletteToken} title={token}>{token}</span>
            <Button size="sm" aria-label={t('action.close')} onClick={closePicker}>×</Button>
          </div>
          <div className={css.colorTabs} role="tablist" aria-label={t('editor.color.mode.switch')}>
            {(['literal', 'expression'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                role="tab"
                id={`${id}-${tab}`}
                aria-selected={mode === tab}
                aria-controls={`${id}-content`}
                tabIndex={mode === tab ? 0 : -1}
                onClick={() => { setMode(tab) }}
                onKeyDown={event => {
                  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
                  event.preventDefault()
                  const next = event.key === 'Home' ? 'literal' : event.key === 'End' ? 'expression'
                    : mode === 'literal' ? 'expression' : 'literal'
                  setMode(next)
                  document.getElementById(`${id}-${next}`)?.focus()
                }}
              >
                {tab === 'literal' ? 'RGB' : 'color-mix'}
              </button>
            ))}
          </div>
          <div className={css.colorTabPanel} role="tabpanel" id={`${id}-content`} aria-labelledby={`${id}-${mode}`}>
            <label className={css.pickerValue}>
              <span className={css.mixLabel}>{t(mode === 'literal' ? 'editor.color.mode.literal' : 'editor.color.mode.expression')}</span>
              <Input
                value={value}
                aria-label={`${t('editor.color.value')}: ${fieldLabel}`}
                aria-invalid={invalid || undefined}
                aria-describedby={describedBy}
                onChange={event => {
                  onChange(event.target.value)
                  seedMix(event.target.value)
                }}
              />
            </label>
            {mode === 'literal' ? (
              <>
                <input
                  type="color"
                  className={css.palettePicker}
                  value={opaqueHex ?? '#000000'}
                  aria-label={t('editor.color.palette')}
                  disabled={disabled}
                  onChange={event => {
                    onChange(event.target.value)
                    seedMix(event.target.value)
                  }}
                />
                <div className={css.paletteGrid}>
                  {swatches.map(swatch => (
                    <button
                      key={swatch}
                      type="button"
                      className={css.paletteChip}
                      title={swatch}
                      aria-label={swatch}
                      disabled={disabled}
                      onClick={() => {
                        onChange(swatch)
                        closePicker()
                      }}
                    >
                      <span className={css.swatchFill} style={{ background: resolveCssColor(swatch, tokens) ?? undefined }} />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className={css.mixBuilder}>
                <label className={css.mixField}>
                  <span className={css.mixLabel}>{t('editor.mix.color')}</span>
                  <Swatch resolved={mixColorResolved} t={t} />
                  <Input
                    className={css.mixInput ?? ''}
                    value={mix.color}
                    aria-label={`${t('editor.mix.color')}: ${schemeLabel}: ${token}`}
                    disabled={disabled}
                    onChange={event => setMix(current => ({ ...current, color: event.target.value }))}
                  />
                </label>
                <label className={css.mixPercent}>
                  <span className={css.mixLabel}>{t('editor.mix.percent')}</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    className={css.mixPercentInput ?? ''}
                    value={mix.percent}
                    aria-label={`${t('editor.mix.percent')}: ${schemeLabel}: ${token}`}
                    disabled={disabled}
                    onChange={event => setMix(current => ({ ...current, percent: Number(event.target.value) }))}
                  />
                </label>
                <label className={css.mixField}>
                  <span className={css.mixLabel}>{t('editor.mix.with')}</span>
                  <Swatch resolved={mixWithResolved} t={t} />
                  <Input
                    className={css.mixInput ?? ''}
                    value={mix.withColor}
                    aria-label={`${t('editor.mix.with')}: ${schemeLabel}: ${token}`}
                    disabled={disabled}
                    onChange={event => setMix(current => ({ ...current, withColor: event.target.value }))}
                  />
                </label>
                <Checkbox
                  className={css.mixTransparent ?? ''}
                  checked={mixTransparent}
                  disabled={disabled}
                  label={t('editor.mix.transparent')}
                  onChange={(next) => {
                    setMix(current => ({ ...current, withColor: next ? 'transparent' : '#ffffff' }))
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  onClick={applyMix}
                >
                  {t('editor.mix.apply')}
                </Button>
              </div>
            )}
          </div>
        </MenuSurface>,
        document.body,
      ) : null}
    </div>
  )
}
