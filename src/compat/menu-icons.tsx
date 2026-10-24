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
  readonly IconSearchOutlineRegular?: ChevronIcon
  readonly IconSearchOutline16?: ChevronIcon
  readonly IconCloseOutlineRegular?: ChevronIcon
  readonly IconCloseOutline16?: ChevronIcon
  readonly IconRefreshOutlineRegular?: ChevronIcon
  readonly IconRefreshOutline16?: ChevronIcon
}

const detected = detect({ ...primitives })

/**
 * Selector chevron: the host's published artwork (`IconChevronDownOutlineRegular`,
 * then the 0.1.5-era `IconChevronDownOutline14`), otherwise an inline replica.
 */
export const ChevronDownIcon: ChevronIcon =
  detected.IconChevronDownOutlineRegular ?? detected.IconChevronDownOutline14 ?? LocalChevronDownIcon

/** Search icon for the editor token search field, same detection ladder. */
export const SearchIcon: ChevronIcon =
  detected.IconSearchOutlineRegular ?? detected.IconSearchOutline16 ?? LocalSearchIcon

/** Close icon for the picker's header button, same detection ladder. */
export const CloseIcon: ChevronIcon =
  detected.IconCloseOutlineRegular ?? detected.IconCloseOutline16 ?? LocalCloseIcon

/** Restore icon for reset-to-base buttons, same detection ladder. */
export const RefreshIcon: ChevronIcon =
  detected.IconRefreshOutlineRegular ?? detected.IconRefreshOutline16 ?? LocalRefreshIcon

function isIcon(value: unknown): value is ChevronIcon {
  return typeof value === 'function'
}

/**
 * Read the optional exports out of whatever namespace the host's module
 * table resolved: 0.1.5/0.1.6 bundles publish none of the Regular names, so
 * the input is a bag of unknown values rather than a partially-typed namespace.
 */
function detect(imports: Record<string, unknown>): MenuIconImports {
  const {
    IconChevronDownOutlineRegular, IconChevronDownOutline14,
    IconSearchOutlineRegular, IconSearchOutline16,
    IconCloseOutlineRegular, IconCloseOutline16,
    IconRefreshOutlineRegular, IconRefreshOutline16,
  } = imports
  return {
    ...(isIcon(IconChevronDownOutlineRegular) ? { IconChevronDownOutlineRegular } : {}),
    ...(isIcon(IconChevronDownOutline14) ? { IconChevronDownOutline14 } : {}),
    ...(isIcon(IconSearchOutlineRegular) ? { IconSearchOutlineRegular } : {}),
    ...(isIcon(IconSearchOutline16) ? { IconSearchOutline16 } : {}),
    ...(isIcon(IconCloseOutlineRegular) ? { IconCloseOutlineRegular } : {}),
    ...(isIcon(IconCloseOutline16) ? { IconCloseOutline16 } : {}),
    ...(isIcon(IconRefreshOutlineRegular) ? { IconRefreshOutlineRegular } : {}),
    ...(isIcon(IconRefreshOutline16) ? { IconRefreshOutline16 } : {}),
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

/** Inline replica of IconSearchOutlineRegular (16 viewBox, 1px currentColor stroke). */
function LocalSearchIcon({ size = 14, className }: { size?: number | undefined; className?: string | undefined }) {
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
      <path d="M6.58727 11.8586C9.55061 11.8586 11.9529 9.45637 11.9529 6.49304C11.9529 3.5297 9.55061 1.12744 6.58727 1.12744C3.62394 1.12744 1.22168 3.5297 1.22168 6.49304C1.22168 9.45637 3.62394 11.8586 6.58727 11.8586Z" stroke="currentColor" />
      <path d="M10.2991 10.3933L14.7783 14.8725" stroke="currentColor" />
    </svg>
  )
}

/** Inline replica of IconCloseOutlineRegular (16 viewBox, 1px currentColor stroke). */
function LocalCloseIcon({ size = 14, className }: { size?: number | undefined; className?: string | undefined }) {
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
      <path d="M2.5 2.5L13.5 13.5" stroke="currentColor" />
      <path d="M13.5 2.5L2.5 13.5" stroke="currentColor" />
    </svg>
  )
}

/** Inline restore artwork (counter-clockwise arrow, 16 viewBox, 1px currentColor stroke). */
function LocalRefreshIcon({ size = 14, className }: { size?: number | undefined; className?: string | undefined }) {
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
      <path d="M14.5001 8C14.5 9.28552 14.1188 10.5422 13.4045 11.611C12.6903 12.6799 11.6752 13.5129 10.4875 14.0049C9.29982 14.4968 7.99295 14.6255 6.73212 14.3747C5.4713 14.124 4.31314 13.505 3.4041 12.596C2.49514 11.687 1.87614 10.5288 1.62537 9.26798C1.37459 8.00716 1.50331 6.70028 1.99525 5.51261C2.48719 4.32494 3.32025 3.30981 4.3891 2.59557C5.45795 1.88134 6.71458 1.50008 8.0001 1.5C9.9001 1.5 11.7001 2.3 13.0001 3.6L14.5001 5.1" stroke="currentColor" />
      <path d="M14.4999 1.5V5.1H10.8999" stroke="currentColor" />
    </svg>
  )
}
