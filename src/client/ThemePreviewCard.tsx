/**
 * Static resolved-color preview inside the manual editor: two miniature
 * mock windows (light and dark) painted only with colors resolved from the
 * draft's same-scheme token map. Unresolvable values get the hatched
 * placeholder, so the card never lies about a candidate color. This is the
 * editor's own static preview; the live overlay is a separate feature.
 */
import { useMemo, type CSSProperties, type ReactNode } from 'react'
import { resolveCssColor } from './contrast-colors.ts'
import { editorTokenNames } from './theme-editor.ts'
import type { ThemeStudioKey } from './locales.ts'
import css from './ThemeStudioRow.module.css'

export interface ThemePreviewCardProps {
  /** Same-scheme token maps (compiled base + draft values). */
  tokens: { readonly light: Readonly<Record<string, string>>; readonly dark: Readonly<Record<string, string>> }
  t: (key: ThemeStudioKey) => string
}

const SURFACE = new Set(editorTokenNames())

type PaintKey = 'background' | 'color' | 'borderColor'

/** Resolved paint for a surface token, or null when missing/unresolvable. */
function paint(token: string, tokens: Readonly<Record<string, string>>): string | null {
  if (!SURFACE.has(token)) return null
  const value = tokens[token]
  return value === undefined ? null : resolveCssColor(value, tokens)
}

/** Region that paints with a resolved color or shows the hatched placeholder. */
function Region({ className, token, tokens, paintKey = 'background', children }: {
  className: string | undefined
  token: string
  tokens: Readonly<Record<string, string>>
  paintKey?: PaintKey
  children?: ReactNode
}) {
  const resolved = paint(token, tokens)
  return (
    <span
      className={`${className ?? ''} ${resolved === null ? css.previewUnknown ?? '' : ''}`.trim()}
      style={resolved === null ? {} : { [paintKey]: resolved } as CSSProperties}
      aria-hidden="true"
    >
      {children}
    </span>
  )
}

function MockWindow({ tokens, label }: {
  tokens: Readonly<Record<string, string>>
  label: string
}) {
  const windowBg = paint('--dsw-alias-bg-base', tokens)
  const titleColor = paint('--dsw-alias-label-primary', tokens)
  const cardBg = paint('--dsw-alias-bg-layer-1', tokens)
  const cardBorder = paint('--dsw-alias-border-l2', tokens)
  return (
    <div className={css.previewFigure}>
      <div
        className={`${css.previewWindow ?? ''} ${windowBg === null ? css.previewUnknown ?? '' : ''}`.trim()}
        role="img"
        aria-label={label}
        style={windowBg === null ? {} : { background: windowBg }}
      >
        <Region
          className={css.previewSidebar}
          token={SURFACE.has('--dsw-specific-sidebar-fill') ? '--dsw-specific-sidebar-fill' : '--dsw-alias-bg-layer-1'}
          tokens={tokens}
        />
        <div className={css.previewStage}>
          <div
            className={`${css.previewCard ?? ''} ${cardBg === null || cardBorder === null ? css.previewUnknown ?? '' : ''}`.trim()}
            style={{
              ...(cardBg === null ? {} : { background: cardBg }),
              ...(cardBorder === null ? {} : { borderColor: cardBorder }),
            }}
            aria-hidden="true"
          >
            <span className={css.previewTitleRow}>
              <span
                className={css.previewTitle}
                style={titleColor === null ? {} : { color: titleColor }}
              >
                Aa
              </span>
              {titleColor === null ? <span className={`${css.previewTitleSwatch ?? ''} ${css.previewUnknown ?? ''}`} /> : null}
            </span>
            <Region className={css.previewBar} token="--dsw-alias-label-secondary" tokens={tokens} />
            <Region
              className={css.previewButton}
              token="--dsw-alias-brand-primary"
              tokens={tokens}
            >
              <Region className={css.previewButtonLabel} token="--dsw-alias-label-primary-foreground" tokens={tokens} />
            </Region>
          </div>
          <div className={css.previewStates}>
            <Region className={css.previewDot} token="--dsw-alias-state-success-primary" tokens={tokens} />
            <Region className={css.previewDot} token="--dsw-alias-state-warn-primary" tokens={tokens} />
            <Region className={css.previewDot} token="--dsw-alias-state-error-primary" tokens={tokens} />
          </div>
          <Region className={css.previewCode} token="--dsw-alias-bg-layer-2" tokens={tokens}>
            <Region className={css.previewCodeSpan} token="--shiki-token-keyword" tokens={tokens} />
            <Region className={css.previewCodeSpan} token="--shiki-token-string" tokens={tokens} />
            <Region className={css.previewCodeSpan} token="--shiki-token-comment" tokens={tokens} />
          </Region>
        </div>
      </div>
      <span className={css.previewCaption}>{label}</span>
    </div>
  )
}

/** Two-scheme static preview of the draft, always visible atop the token pane. */
export function ThemePreviewCard({ tokens, t }: ThemePreviewCardProps) {
  const labels = useMemo(() => ({
    light: t('editor.preview.light'),
    dark: t('editor.preview.dark'),
  }), [t])
  return (
    <div className={css.previewStrip}>
      <MockWindow tokens={tokens.light} label={labels.light} />
      <MockWindow tokens={tokens.dark} label={labels.dark} />
    </div>
  )
}
