/**
 * One scheme of one token's color field. Two input modes share the row:
 * `literal` for plain colors (hex/rgb/named) with a swatch palette popover,
 * `expression` for `var()`/`color-mix()` text plus a small color-mix builder.
 * The leading square always previews the value resolved against the draft's
 * same-scheme token map (never the page theme, so candidate colors stay
 * honest); unresolvable values show a hatched placeholder.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
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
  /** Field-registration ref for error jump/focus; attaches to the text input. */
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
  const [override, setOverride] = useState<ColorInputMode | null>(null)
  const mode = override ?? detected
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [buildOpen, setBuildOpen] = useState(false)
  const [mix, setMix] = useState({ color: '#000000', percent: 50, withColor: 'transparent' })
  const root = useRef<HTMLDivElement>(null)
  const anchor = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const resolved = useMemo(() => resolveCssColor(value, tokens), [value, tokens])
  const opaqueHex = useMemo(() => resolvePreviewColor(value, tokens), [value, tokens])
  const position = useAnchoredPosition({
    open: paletteOpen,
    anchorRef: anchor,
    panelRef: panel,
    side: 'bottom',
    align: 'start',
    gap: 4,
    margin: 8,
  })
  useDismissOnOutsidePointer(root, paletteOpen, setPaletteOpen, panel)

  // Escape inside the portaled palette belongs to the palette, not the Modal.
  useEffect(() => {
    const el = panel.current
    if (!paletteOpen || el === null) return
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      setPaletteOpen(false)
      anchor.current?.focus()
    }
    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  }, [paletteOpen])

  const switchMode = (): void => {
    if (mode === 'literal') {
      setPaletteOpen(false)
      setOverride('expression')
      return
    }
    setBuildOpen(false)
    setOverride('literal')
    if (opaqueHex !== null) onChange(opaqueHex)
  }

  const toggleBuilder = (): void => {
    if (!buildOpen) {
      const parsed = parseColorMix(value)
      setMix(parsed ?? {
        color: opaqueHex ?? (isLiteralColor(value) ? value.trim() : '#000000'),
        percent: 50,
        withColor: 'transparent',
      })
    }
    setBuildOpen(open => !open)
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

  return (
    <div className={css.colorField} ref={root}>
      <div className={css.colorRow}>
        <Swatch resolved={resolved} t={t} />
        <Input
          ref={inputRef}
          className={css.colorInput ?? ''}
          value={value}
          aria-label={`${schemeLabel}: ${token}`}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          disabled={disabled}
          onChange={event => onChange(event.target.value)}
        />
        <Button
          variant="outline"
          size="sm"
          title={t('editor.color.mode.switch')}
          aria-label={`${t('editor.color.mode.switch')}: ${schemeLabel}: ${token}`}
          disabled={disabled}
          onClick={switchMode}
        >
          {t(mode === 'literal' ? 'editor.color.mode.literal' : 'editor.color.mode.expression')}
        </Button>
        {mode === 'literal' ? (
          <Button
            ref={anchor}
            variant="outline"
            size="sm"
            aria-label={`${t('editor.color.palette')}: ${schemeLabel}: ${token}`}
            aria-expanded={paletteOpen}
            disabled={disabled}
            onClick={() => { setPaletteOpen(open => !open) }}
          >
            {t('editor.color.palette')}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            aria-label={`${t('editor.color.build')}: ${schemeLabel}: ${token}`}
            aria-expanded={buildOpen}
            disabled={disabled}
            onClick={toggleBuilder}
          >
            {t('editor.color.build')}
          </Button>
        )}
      </div>
      {mode === 'expression' && buildOpen ? (
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
      ) : null}
      {paletteOpen ? createPortal(
        <MenuSurface
          ref={panel}
          className={css.palettePop}
          style={position === null ? { position: 'fixed', visibility: 'hidden' } : { position: 'fixed', ...position }}
          role="group"
          aria-label={t('editor.color.palette')}
        >
          <div className={css.palettePreview}>
            <Swatch resolved={resolved} t={t} />
            <span className={css.paletteValue} title={value}>{value}</span>
          </div>
          <input
            type="color"
            className={css.palettePicker}
            value={opaqueHex ?? '#000000'}
            aria-label={t('editor.color.palette')}
            disabled={disabled}
            onChange={event => onChange(event.target.value)}
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
                  setPaletteOpen(false)
                }}
              >
                <span className={css.swatchFill} style={{ background: resolveCssColor(swatch, tokens) ?? undefined }} />
              </button>
            ))}
          </div>
        </MenuSurface>,
        document.body,
      ) : null}
    </div>
  )
}
