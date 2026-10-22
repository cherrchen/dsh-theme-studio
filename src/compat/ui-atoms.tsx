/**
 * ui-primitives adaptation: `MenuSurface` and `Checkbox` joined the package
 * with DSH 0.1.7, so hosts on 0.1.5/0.1.6 resolve the package but leave the
 * names `undefined`. Like `menu-icons.tsx`, this module detects the exports
 * structurally and falls back to inline replicas of the same DOM contracts.
 */

import { forwardRef, type HTMLAttributes, type ReactNode, type Ref } from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'

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

/** The exports this plugin consumes, optional where older hosts do not publish them. */
interface UiAtomImports {
  readonly MenuSurface?: SurfaceComponent
  readonly Checkbox?: (props: CheckboxProps) => ReactNode
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
 * Read the optional exports out of whatever namespace the host's module
 * table resolved: pre-0.1.7 bundles publish neither name, so the input is
 * a bag of unknown values rather than a partially-typed namespace.
 */
function detect(imports: Record<string, unknown>): UiAtomImports {
  const { MenuSurface, Checkbox } = imports
  return {
    ...(typeof MenuSurface === 'function' || (MenuSurface !== null && typeof MenuSurface === 'object')
      ? { MenuSurface: MenuSurface as SurfaceComponent } : {}),
    ...(typeof Checkbox === 'function' ? { Checkbox: Checkbox as (props: CheckboxProps) => ReactNode } : {}),
  }
}
