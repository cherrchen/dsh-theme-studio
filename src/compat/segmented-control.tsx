/**
 * ui-primitives adaptation: `SegmentedControl` is published from
 * DSH 0.1.7-alpha.1. Older supported hosts (0.1.5–0.1.6) resolve the package
 * but leave the export `undefined`, so this module detects it structurally
 * and falls back to a local tablist honoring the same controlled contract:
 * tabs named `<id>-<value>`, panels named `<id>-<value>-panel`, roving
 * tabindex, arrow/Home/End walk across enabled options only.
 */

import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type ReactElement } from 'react'
import css from './segmented-control.module.css'

/** One segment of a segmented control. */
export interface SegmentedControlOption<Value extends string> {
  /** The value the owner receives when this segment is chosen. */
  readonly value: Value
  /** Localized segment text. */
  readonly label: string
  /** Whether the segment refuses selection. */
  readonly disabled?: boolean
  /** Localized hover text, typically why the segment is locked. */
  readonly title?: string
}

/** The controlled contract both the host export and the fallback honor. */
export interface SegmentedControlProps<Value extends string> {
  /** The owner's base id: each tab is `<id>-<value>`. */
  readonly id: string
  /** The selected option's value; the control is fully controlled. */
  readonly value: Value
  /** The segments in display order; at least two. */
  readonly options: readonly SegmentedControlOption<Value>[]
  /**
   * Called with the value a click or a walk key asks for, never with the
   * value already selected.
   */
  readonly onChange: (next: Value) => void
  /** Localized accessible name of the tablist. */
  readonly label: string
  /** Lock every segment while a write or a fetch is in flight. */
  readonly disabled?: boolean
  /** Extra class for layout placement. */
  readonly className?: string
}

/** Generic component shape the host publishes under the same name. */
export type SegmentedControlComponent =
  <Value extends string>(props: SegmentedControlProps<Value>) => ReactElement

function isWalkKey(key: string): boolean {
  return key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown'
    || key === 'Home' || key === 'End'
}

function walk<Value extends string>(
  options: readonly SegmentedControlOption<Value>[],
  from: number,
  key: string,
): SegmentedControlOption<Value> | undefined {
  const enabled = options.filter(option => option.disabled !== true)
  if (key === 'Home') return enabled[0]
  if (key === 'End') return enabled[enabled.length - 1]
  const step = key === 'ArrowRight' || key === 'ArrowDown' ? 1 : -1
  const count = options.length
  for (let offset = 1; offset < count; offset += 1) {
    const candidate = options[((from + step * offset) % count + count) % count]
    if (candidate !== undefined && candidate.disabled !== true) return candidate
  }
  return undefined
}

/**
 * Local replica used where the host bundle predates the export. Keeps the
 * ARIA and keyboard contract; styling is a token-driven approximation of the
 * published control's track, raised indicator, and equal-width segments.
 */
function LocalSegmentedControl<Value extends string>({
  id, value, options, onChange, label, disabled = false, className,
}: SegmentedControlProps<Value>) {
  const list = useRef<HTMLDivElement | null>(null)
  const selected = options.findIndex(option => option.value === value)
  useEffect(() => {
    const root = list.current
    if (root === null || !root.contains(document.activeElement)) return
    root.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus()
  }, [value])
  const onKeyDown = (event: KeyboardEvent): void => {
    if (!isWalkKey(event.key)) return
    event.preventDefault()
    const target = walk(options, selected, event.key)
    if (target !== undefined && target.value !== value) onChange(target.value)
  }
  const indicator = {
    '--ts-segment-count': String(options.length),
    '--ts-segment-index': String(selected),
  } as CSSProperties
  return (
    <div
      ref={list}
      role="tablist"
      aria-label={label}
      className={`${css.control}${className === undefined ? '' : ` ${className}`}`}
      style={indicator}
    >
      <span aria-hidden="true" className={css.indicator} />
      {options.map(option => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            id={`${id}-${option.value}`}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={`${id}-${option.value}-panel`}
            tabIndex={active ? 0 : -1}
            disabled={disabled || option.disabled === true}
            title={option.title}
            className={css.tab}
            onClick={() => { if (!active) onChange(option.value) }}
            onKeyDown={onKeyDown}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function detect(imports: Record<string, unknown>): SegmentedControlComponent | undefined {
  const candidate = imports['SegmentedControl']
  return typeof candidate === 'function' ? candidate as SegmentedControlComponent : undefined
}

/**
 * Segmented control: the host export where published (0.1.7-alpha.1+),
 * otherwise the local replica. Resolution is structural; no version string
 * is consulted.
 */
export const SegmentedControl: SegmentedControlComponent =
  detect({ ...primitives }) ?? LocalSegmentedControl
