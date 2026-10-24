/**
 * ui-primitives adaptation: `MenuSurface` and `Checkbox` joined the package
 * with DSH 0.1.7, so hosts on 0.1.5/0.1.6 resolve the package but leave the
 * names `undefined`. Older Input components also lack ref forwarding.
 * Like `menu-icons.tsx`, this module detects these structures and preserves
 * the host controls, with local fallbacks for the missing DOM contracts.
 */

import { forwardRef, useEffect, useRef, type ComponentPropsWithoutRef, type HTMLAttributes, type ReactNode, type Ref } from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'

type InputProps = ComponentPropsWithoutRef<typeof primitives.Input>
type RefInputComponent = (props: InputProps & { ref?: Ref<HTMLInputElement> }) => ReactNode

/** Older Inputs do not forward refs; retain their DOM/styles and bind the native input. */
const LocalRefInput = forwardRef<HTMLInputElement, InputProps>(function LocalRefInput(props, ref) {
  return (
    <span style={{ display: 'contents' }} ref={element => {
      const input = element?.querySelector('input') ?? null
      if (typeof ref === 'function') ref(input)
      else if (ref !== null) ref.current = input
    }}>
      <primitives.Input {...props} />
    </span>
  )
})

const hostInput: unknown = primitives.Input
/** React's forwardRef marker is available without package/version probing. */
export const RefInput: RefInputComponent =
  typeof hostInput === 'object' && hostInput !== null
    && '$$typeof' in hostInput && hostInput.$$typeof === Symbol.for('react.forward_ref')
    ? hostInput as RefInputComponent
    : LocalRefInput

/** Props mirroring the upstream Checkbox contract. */
export interface CheckboxProps {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  disabled?: boolean | undefined
  title?: string | undefined
  className?: string | undefined
}

interface SurfaceComponent {
  (props: HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement> }): ReactNode
}

const LocalMenuSurface: SurfaceComponent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function LocalMenuSurface(props, ref) {
    return <div ref={ref} {...props} />
  },
)

function LocalCheckbox({ checked, onChange, label, disabled, title, className }: CheckboxProps) {
  return (
    <label className={className} title={title}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={event => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  )
}

/** One segment of {@link SegmentedControl}, mirroring the upstream option. */
export interface SegmentedControlOption<Value extends string> {
  readonly value: Value
  readonly label: string
  readonly disabled?: boolean
  readonly title?: string | undefined
}

/** Props mirroring the upstream SegmentedControl contract. */
export interface SegmentedControlProps<Value extends string> {
  readonly id: string
  readonly value: Value
  readonly options: readonly SegmentedControlOption<Value>[]
  readonly onChange: (next: Value) => void
  readonly label: string
  readonly disabled?: boolean | undefined
  readonly className?: string | undefined
}

type WalkKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown' | 'Home' | 'End'

function isWalkKey(key: string): key is WalkKey {
  return key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown'
    || key === 'Home' || key === 'End'
}

function walk<Value extends string>(
  options: readonly SegmentedControlOption<Value>[],
  from: number,
  key: WalkKey,
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
 * Replica of the published SegmentedControl for hosts before 0.1.7-alpha.1:
 * the same tablist DOM contract (`<id>-<value>` tabs, `<id>-<value>-panel`
 * panels, roving tabIndex, Arrow/Home/End walk keys) without the sliding
 * indicator, which is decorative.
 */
function LocalSegmentedControl<Value extends string>({
  id, value, options, onChange, label, disabled = false, className,
}: SegmentedControlProps<Value>) {
  const list = useRef<HTMLDivElement>(null)
  const selected = options.findIndex(option => option.value === value)

  useEffect(() => {
    const root = list.current
    if (root === null || !root.contains(document.activeElement)) return
    root.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]')?.focus()
  }, [value])

  return (
    <div ref={list} role="tablist" aria-label={label} className={className}>
      {options.map((option) => {
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
            disabled={disabled === true || option.disabled === true}
            title={option.title}
            onClick={() => { if (!active) onChange(option.value) }}
            onKeyDown={(event) => {
              if (!isWalkKey(event.key)) return
              event.preventDefault()
              const target = walk(options, selected, event.key)
              if (target !== undefined && target.value !== value) onChange(target.value)
            }}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/** The exports this plugin consumes, optional where older hosts do not publish them. */
interface UiAtomImports {
  readonly MenuSurface?: SurfaceComponent
  readonly Checkbox?: (props: CheckboxProps) => ReactNode
  readonly SegmentedControl?: <Value extends string>(props: SegmentedControlProps<Value>) => ReactNode
}

const detected = detect({ ...primitives })

/**
 * Portaled-panel surface: the host's `MenuSurface`, otherwise a plain div —
 * the published surface only adds styling hooks the owner class supplies.
 */
export const MenuSurface: SurfaceComponent = detected.MenuSurface ?? LocalMenuSurface

/**
 * Labeled checkbox: the host's `Checkbox`, otherwise a replica of its
 * label > input + span structure.
 */
export const Checkbox: (props: CheckboxProps) => ReactNode =
  detected.Checkbox ?? LocalCheckbox

/**
 * Mode tablist: the host's `SegmentedControl` (published since
 * 0.1.7-alpha.1), otherwise the local replica of its tab DOM contract.
 * Hosts on 0.1.7-alpha.1..rc.1 style the control's own `--dsw-radius-md`
 * without a literal fallback, so the corners are square there — cosmetic
 * only; the tablist semantics are identical on every host.
 */
export const SegmentedControl: <Value extends string>(props: SegmentedControlProps<Value>) => ReactNode =
  detected.SegmentedControl ?? LocalSegmentedControl

/**
 * Read the optional exports out of whatever namespace the host's module
 * table resolved: pre-0.1.7 bundles publish neither name, so the input is
 * a bag of unknown values rather than a partially-typed namespace.
 */
function detect(imports: Record<string, unknown>): UiAtomImports {
  const { MenuSurface, Checkbox, SegmentedControl } = imports
  return {
    ...(typeof MenuSurface === 'function' || (MenuSurface !== null && typeof MenuSurface === 'object')
      ? { MenuSurface: MenuSurface as SurfaceComponent } : {}),
    ...(typeof Checkbox === 'function' ? { Checkbox: Checkbox as (props: CheckboxProps) => ReactNode } : {}),
    ...(typeof SegmentedControl === 'function'
      ? { SegmentedControl: SegmentedControl as <Value extends string>(props: SegmentedControlProps<Value>) => ReactNode } : {}),
  }
}
