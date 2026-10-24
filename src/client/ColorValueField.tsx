/**
 * Compact color swatch/summary trigger with a portaled RGB / color-mix editor.
 * Switching tabs never rewrites the draft; only editing a value does.
 * The leading square always previews the value resolved against the draft's
 * same-scheme token map (never the page theme, so candidate colors stay
 * honest); unresolvable values show a hatched placeholder.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, Input, useAnchoredPosition, useDismissOnOutsidePointer } from '@deepseek-ai/dsh-client-ui-primitives'
import { Checkbox, MenuSurface, SegmentedControl } from '../compat/ui-atoms.tsx'
import { CloseIcon } from '../compat/menu-icons.tsx'
import { parseColorMix, resolveCssColor, resolvePreviewColor } from './contrast-colors.ts'
import { summarizeColorValue } from './color-summary.ts'
import { type ThemeStudioKey } from './locales.ts'
import css from './ThemeStudioRow.module.css'

export type ColorInputMode = 'literal' | 'expression'

export interface ColorValueFieldProps {
  /** Draft value for this scheme. */
  value: string
  /** Base theme's compiled value for this scheme, for the compare strip. */
  baseValue: string
  /** Same-scheme draft token map used to resolve `var()`/`color-mix()` previews. */
  tokens: Readonly<Record<string, string>>
  /** Complete same-scheme base token map used only for the base comparison. */
  baseTokens: Readonly<Record<string, string>>
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

function Swatch({ resolved, t, mini }: { resolved: string | null; t: (key: ThemeStudioKey) => string; mini?: boolean }) {
  return (
    <span
      className={`${css.colorSwatch ?? ''} ${mini === true ? css.colorSwatchMini ?? '' : ''}`.trim()}
      role={mini === true ? undefined : 'img'}
      aria-hidden={mini === true ? true : undefined}
      aria-label={mini === true ? undefined : t('editor.color.swatch')}
      title={resolved ?? t('editor.color.noPreview')}
    >
      {resolved === null
        ? <span className={css.swatchUnknown} />
        : <span className={css.swatchFill} style={{ background: resolved }} />}
    </span>
  )
}

/** Readable one-line rendering of a draft value inside the trigger. */
function ValueSummary({ value, tokens, t }: {
  value: string
  tokens: Readonly<Record<string, string>>
  t: (key: ThemeStudioKey) => string
}) {
  const summary = useMemo(() => summarizeColorValue(value, tokens), [value, tokens])
  if (value.trim() === '') return <span className={css.colorDisplay}>{t('editor.color.empty')}</span>
  switch (summary.kind) {
    case 'literal':
      return <span className={css.colorDisplay}>{summary.text}</span>
    case 'var':
      return <span className={css.colorDisplay}>→ {summary.target}</span>
    case 'mix':
      return (
        <span className={css.colorDisplay}>
          <Swatch resolved={summary.left.color} t={t} mini />
          <span>{summary.left.text}</span>
          <span className={css.summaryDim}>{summary.percent}%</span>
          <span className={css.summaryDim}>·</span>
          <Swatch resolved={summary.right.color} t={t} mini />
          <span>{summary.right.text}</span>
        </span>
      )
    default:
      return <span className={css.colorDisplay}>{summary.text}</span>
  }
}

/** Last name segment(s) for the picker header; the full name stays on title. */
function shortName(token: string): string {
  const segments = token.split('-').filter(segment => segment !== '')
  return segments.slice(-2).join('-')
}

export function ColorValueField({
  value, baseValue, tokens, baseTokens, swatches, schemeLabel, token, disabled, invalid, describedBy, onChange, inputRef, t,
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
  const baseResolved = useMemo(() => resolveCssColor(baseValue, baseTokens), [baseValue, baseTokens])
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
  const percent = Math.min(100, Math.max(0, mix.percent))
  const mixed = `color-mix(in srgb, ${mix.color.trim() === '' ? '#000000' : mix.color.trim()} ${percent}%, ${mix.withColor.trim() === '' ? 'transparent' : mix.withColor.trim()})`
  const applyMix = (): void => {
    onChange(mixed)
  }
  const mixTransparent = mix.withColor.trim().toLowerCase() === 'transparent'
  const mixColorResolved = resolveCssColor(mix.color, tokens)
  const mixWithResolved = resolveCssColor(mix.withColor, tokens)
  const mixResultResolved = resolveCssColor(mixed, tokens)
  const fieldLabel = `${schemeLabel}: ${token}`
  const changed = value.trim() !== baseValue.trim()

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
        <ValueSummary value={value} tokens={tokens} t={t} />
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
            <span className={css.paletteToken} title={token}>{shortName(token)}</span>
            <span className={css.paletteScheme}>{schemeLabel}</span>
            <Button
              variant="ghost"
              size="sm"
              className={css.paletteClose ?? ''}
              aria-label={t('action.close')}
              onClick={closePicker}
            >
              <CloseIcon />
            </Button>
          </div>
          <div className={css.compareStrip}>
            <span className={css.compareCell}>
              <span className={css.compareLabel}>{t('editor.color.base')}</span>
              <span className={css.compareRow}>
                <Swatch resolved={baseResolved} t={t} />
                <span className={css.compareValue} title={baseValue}>{baseValue}</span>
              </span>
            </span>
            <span className={css.compareCell}>
              <span className={css.compareLabel}>{t('editor.color.current')}</span>
              <span className={css.compareRow}>
                <Swatch resolved={resolved} t={t} />
                <span className={css.compareValue} title={value}>{value}</span>
              </span>
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={!changed}
              onClick={() => { onChange(baseValue) }}
            >
              {t('editor.resetBase')}
            </Button>
          </div>
          <SegmentedControl
            id={`${id}-mode`}
            className={css.colorTabs ?? ''}
            label={t('editor.color.mode.switch')}
            value={mode}
            options={[
              { value: 'literal', label: 'RGB' },
              { value: 'expression', label: 'color-mix' },
            ]}
            onChange={setMode}
          />
          <div
            className={css.colorTabPanel}
            role="tabpanel"
            id={`${id}-mode-${mode}-panel`}
            aria-labelledby={`${id}-mode-${mode}`}
          >
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
                <div className={css.paletteArea}>
                  <p className={css.paletteCaption}>{t('editor.color.basePalette')}</p>
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
                </div>
              </>
            ) : (
              <div className={css.mixBuilder}>
                <label className={css.mixField}>
                  <span className={css.mixLabel}>{t('editor.mix.color')}</span>
                  <span className={css.mixControls}>
                    <Swatch resolved={mixColorResolved} t={t} />
                    <Input
                      className={css.mixInput ?? ''}
                      value={mix.color}
                      aria-label={`${t('editor.mix.color')}: ${schemeLabel}: ${token}`}
                      disabled={disabled}
                      onChange={event => setMix(current => ({ ...current, color: event.target.value }))}
                    />
                  </span>
                </label>
                <div className={css.mixField}>
                  <span className={css.mixLabel}>{t('editor.mix.percent')}</span>
                  <span className={css.mixControls}>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      className={css.mixRange}
                      value={percent}
                      aria-label={t('editor.mix.percentRange')}
                      disabled={disabled}
                      onChange={event => setMix(current => ({ ...current, percent: Number(event.target.value) }))}
                    />
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
                  </span>
                </div>
                <label className={css.mixField}>
                  <span className={css.mixLabel}>{t('editor.mix.with')}</span>
                  <span className={css.mixControls}>
                    <Swatch resolved={mixWithResolved} t={t} />
                    <Input
                      className={css.mixInput ?? ''}
                      value={mix.withColor}
                      aria-label={`${t('editor.mix.with')}: ${schemeLabel}: ${token}`}
                      disabled={disabled}
                      onChange={event => setMix(current => ({ ...current, withColor: event.target.value }))}
                    />
                  </span>
                </label>
                <div className={css.mixFooter}>
                  <Checkbox
                    className={css.mixTransparent ?? ''}
                    checked={mixTransparent}
                    disabled={disabled}
                    label={t('editor.mix.transparent')}
                    onChange={(next) => {
                      setMix(current => ({ ...current, withColor: next ? 'transparent' : '#ffffff' }))
                    }}
                  />
                  <Swatch resolved={mixResultResolved} t={t} />
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={disabled}
                    onClick={applyMix}
                  >
                    {t('editor.mix.apply')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </MenuSurface>,
        document.body,
      ) : null}
    </div>
  )
}
