/**
 * ui-primitives adaptation: the chevron the selector trigger carries is
 * published as `IconChevronDownOutline14` on DSH 0.1.5–0.1.6 and renamed
 * `IconChevronDownOutlineRegular` from 0.1.7-alpha.1 on. Older supported
 * hosts resolve the package but leave the newer name `undefined`, so this
 * module detects the available export structurally and falls back to an
 * inline replica of the same artwork.
 */

import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import type { ComponentType } from 'react'

/** Icon props shared by the published chevrons and the local replica. */
export type ChevronIcon = ComponentType<{ size?: number | undefined; className?: string | undefined }>

/** The exports this plugin consumes, optional where older hosts do not publish them. */
interface MenuIconImports {
  readonly IconChevronDownOutlineRegular?: ChevronIcon
  readonly IconChevronDownOutline14?: ChevronIcon
}

const detected = detect({ ...primitives })

/**
 * Selector chevron: the host's published artwork (`IconChevronDownOutlineRegular`,
 * then the 0.1.5-era `IconChevronDownOutline14`), otherwise an inline replica.
 */
export const ChevronDownIcon: ChevronIcon =
  detected.IconChevronDownOutlineRegular ?? detected.IconChevronDownOutline14 ?? LocalChevronDownIcon

/**
 * Read the optional exports out of whatever namespace the host's module
 * table resolved: 0.1.5/0.1.6 bundles publish neither name, so the input
 * is a bag of unknown values rather than a partially-typed namespace.
 */
function detect(imports: Record<string, unknown>): MenuIconImports {
  const { IconChevronDownOutlineRegular, IconChevronDownOutline14 } = imports
  return {
    ...(typeof IconChevronDownOutlineRegular === 'function'
      ? { IconChevronDownOutlineRegular: IconChevronDownOutlineRegular as ChevronIcon } : {}),
    ...(typeof IconChevronDownOutline14 === 'function'
      ? { IconChevronDownOutline14: IconChevronDownOutline14 as ChevronIcon } : {}),
  }
}

/** Inline replica of IconChevronDownOutlineRegular (16 viewBox, 1px currentColor stroke). */
function LocalChevronDownIcon({ size = 14, className }: { size?: number | undefined; className?: string | undefined }) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      strokeWidth={1}
    >
      <path
        d="M4 6L7.29289 9.29289C7.68342 9.68342 8.31658 9.68342 8.70711 9.29289L12 6"
        stroke="currentColor"
      />
    </svg>
  )
}
