/**
 * ui-primitives adaptation: `MenuSurface` and `IconCheckOutlineRegular` are
 * only published in DSH 0.2.0-rc.1/0.1.7-alpha.1 and later respectively.
 * Older supported hosts resolve the package but leave those names
 * `undefined`, so this module detects each export structurally and falls
 * back to a local equivalent painted with the same tokens.
 */

import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import type { ComponentPropsWithoutRef, ComponentType } from 'react'

/** Div props a surface component receives; the native MenuSurface also reads `compact`. */
export type ThemeListSurfaceProps = ComponentPropsWithoutRef<'div'> & { compact?: boolean }

/** The exports this plugin consumes, optional where older hosts do not publish them. */
interface MenuSurfaceImports {
  readonly MenuSurface?: ComponentType<ThemeListSurfaceProps>
  readonly IconCheckOutlineRegular?: ComponentType<{ className?: string | undefined }>
}

const detected = detect({ ...primitives })

/**
 * Menu list container: the native `MenuSurface` (translucent material +
 * macOS backing) where published, otherwise a div painting the same
 * surface tokens. Either accepts ordinary div props.
 */
export const MenuSurfaceLike: ComponentType<ThemeListSurfaceProps> =
  detected.MenuSurface ?? LocalMenuSurface

/**
 * Trailing selection check: the native `IconCheckOutlineRegular` artwork
 * where published, otherwise an inline replica of the same path.
 */
export const CheckIcon: ComponentType<{ className?: string | undefined }> =
  detected.IconCheckOutlineRegular ?? LocalCheckIcon

/**
 * Read the two optional exports out of whatever namespace the host's module
 * table resolved: 0.1.5/0.1.6 bundles publish neither name, so the input is
 * a bag of unknown values rather than a partially-typed namespace.
 */
function detect(imports: Record<string, unknown>): MenuSurfaceImports {
  const { MenuSurface, IconCheckOutlineRegular } = imports
  return {
    ...(typeof MenuSurface === 'function'
      ? { MenuSurface: MenuSurface as ComponentType<ThemeListSurfaceProps> } : {}),
    ...(typeof IconCheckOutlineRegular === 'function'
      ? { IconCheckOutlineRegular: IconCheckOutlineRegular as ComponentType<{ className?: string | undefined }> } : {}),
  }
}

/**
 * Menu-material container matching MenuSurface's visible layer: same
 * radius and translucent fill; the opaque macOS backing it adds is a
 * platform nicety older hosts do not miss. The radius and menu tokens
 * postdate the oldest supported hosts, so each `var()` names the literal
 * the token resolves to on newer releases.
 */
function LocalMenuSurface({ children, style, ...rest }: ThemeListSurfaceProps) {
  return (
    <div
      {...rest}
      style={{
        position: 'relative',
        borderRadius: 'var(--dsw-radius-lg, 16px)',
        background: 'var(--dsw-menu-surface-fill, var(--dsw-alias-bg-layer-2))',
        backdropFilter: 'var(--dsw-menu-backdrop-filter, none)',
        WebkitBackdropFilter: 'var(--dsw-menu-backdrop-filter, none)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/** Inline replica of IconCheckOutlineRegular (16px, 1px currentColor stroke). */
function LocalCheckIcon({ className }: { className?: string | undefined }) {
  return (
    <svg
      width={16}
      height={16}
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      strokeWidth={1}
    >
      <path
        d="M2.25 8.5L5.49732 11.7473C5.90519 12.1552 6.57263 12.1344 6.95426 11.7018L13.75 4"
        stroke="currentColor"
      />
    </svg>
  )
}
