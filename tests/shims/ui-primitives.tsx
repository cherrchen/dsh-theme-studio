/**
 * Test stand-in for the ui-primitives exports the plugin consumes.
 * The published bundle carries undeclared host-only imports, so the real
 * package cannot load under vitest; per-branch adapter coverage lives in
 * tests/client/menu-icons.spec.tsx through module mocks.
 */
import { useEffect, useRef, type ReactNode } from 'react'

/** MenuItem-like entries the row passes to Menu. */
interface ShimMenuItem {
  id: string
  label: ReactNode
  icon?: ReactNode
}

interface ShimMenuProps {
  open: boolean
  anchor?: ReactNode
  items?: readonly ShimMenuItem[]
  selectedId?: string
  onSelect?: (id: string) => void
  onClose?: () => void
  align?: string
  side?: string
  portal?: boolean
  closeOnPointerLeave?: boolean
  autoFocus?: boolean
  selection?: string
  dense?: boolean
  compact?: boolean
  className?: string
}

/**
 * Menu contract double: renders the anchor, and the item list while open.
 * Mirrors the close paths the row relies on — pointerdown outside the
 * anchor/list subtree and Escape both call onClose.
 */
export function Menu({ open, anchor, items = [], selectedId, onSelect, onClose }: ShimMenuProps) {
  const rootRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!open || onClose === undefined) return
    const onPointerDown = (event: Event) => {
      const target = event.target
      if (target instanceof Node && rootRef.current?.contains(target) === true) return
      onClose()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])
  return (
    <span ref={rootRef}>
      {anchor}
      {open ? (
        <div role="menu">
          {items.map(entry => (
            <button
              key={entry.id}
              type="button"
              role="menuitem"
              aria-selected={entry.id === selectedId}
              onClick={() => onSelect?.(entry.id)}
            >
              {entry.icon}
              {entry.label}
              {entry.id === selectedId ? <span aria-hidden="true" data-check /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </span>
  )
}

/** IconChevronDownOutlineRegular look-alike carrying the native artwork. */
export function IconChevronDownOutlineRegular({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M4 6L7.29289 9.29289C7.68342 9.68342 8.31658 9.68342 8.70711 9.29289L12 6"
        stroke="currentColor"
      />
    </svg>
  )
}
