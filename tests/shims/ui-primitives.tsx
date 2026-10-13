/**
 * Test stand-in for the ui-primitives exports the compat adapter reads.
 * The published bundle carries undeclared host-only imports, so the real
 * package cannot load under vitest; per-branch coverage lives in
 * tests/client/menu-surface.spec.tsx through module mocks.
 */
import type { ComponentPropsWithoutRef } from 'react'

/** MenuSurface look-alike: forwards div props like the native component. */
export function MenuSurface({ children, ...rest }: ComponentPropsWithoutRef<'div'>) {
  return <div {...rest}>{children}</div>
}

/** IconCheckOutlineRegular look-alike carrying the native size contract. */
export function IconCheckOutlineRegular({ className }: { className?: string }) {
  return <svg width={16} height={16} className={className} aria-hidden="true" />
}
