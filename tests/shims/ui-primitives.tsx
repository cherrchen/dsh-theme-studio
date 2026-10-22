/**
 * Test stand-in for the ui-primitives exports the plugin consumes.
 * The published bundle carries undeclared host-only imports, so the real
 * package cannot load under vitest; per-branch adapter coverage lives in
 * tests/client/menu-icons.spec.tsx through module mocks.
 */
import { forwardRef, useEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from 'react'

/** MenuItem-like row the row passes to Menu. */
interface ShimMenuItem {
  id: string
  label: ReactNode
  icon?: ReactNode
  disabled?: boolean
  danger?: boolean
}

/** Separator and label entries the row interleaves between items. */
interface ShimMenuStructural {
  type: 'separator' | 'label'
  id: string
  text?: string
}

type ShimMenuEntry = ShimMenuItem | ShimMenuStructural

interface ShimMenuProps {
  open: boolean
  anchor?: ReactNode
  items?: readonly ShimMenuEntry[]
  footer?: readonly ShimMenuEntry[]
  selectedId?: string
  selectedIds?: readonly string[]
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

function isStructural(entry: ShimMenuEntry): entry is ShimMenuStructural {
  return (entry as ShimMenuStructural).type === 'separator' || (entry as ShimMenuStructural).type === 'label'
}

function MenuRow({ entry, selectedId, selectedIds, onSelect }: {
  entry: ShimMenuEntry
  selectedId?: string
  selectedIds?: readonly string[]
  onSelect?: (id: string) => void
}) {
  if (isStructural(entry)) {
    if (entry.type === 'separator') return <hr key={entry.id} role="separator" />
    return <div role="presentation" data-menu-label>{entry.text}</div>
  }
  const selected = entry.id === selectedId || selectedIds?.includes(entry.id) === true
  return (
    <button
      type="button"
      role="menuitem"
      disabled={entry.disabled === true}
      aria-selected={selected}
      onClick={() => onSelect?.(entry.id)}
    >
      {entry.icon}
      {entry.label}
      {selected ? <span aria-hidden="true" data-check /> : null}
    </button>
  )
}

/**
 * Menu contract double: renders the anchor, and the item list while open.
 * Mirrors the close paths the row relies on — pointerdown outside the
 * anchor/list subtree and Escape both call onClose.
 */
export function Menu({ open, anchor, items = [], footer = [], selectedId, selectedIds, onSelect, onClose }: ShimMenuProps) {
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
            <MenuRow key={entry.id} entry={entry} selectedId={selectedId} selectedIds={selectedIds} onSelect={onSelect} />
          ))}
          {footer.length > 0 ? (
            <div data-menu-footer>
              {footer.map(entry => (
                <MenuRow key={entry.id} entry={entry} onSelect={onSelect} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </span>
  )
}

/** Button contract double: a plain button honoring disabled and className. */
export function Button({ children, onClick, disabled, variant, size, className }: {
  children?: ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: string
  size?: string
  className?: string
}) {
  return (
    <button type="button" disabled={disabled === true} data-variant={variant} data-size={size} className={className} onClick={onClick}>
      {children}
    </button>
  )
}

/**
 * Modal contract double: renders children and footer inside a dialog while
 * open; Escape calls onClose like the real surface.
 */
export function Modal({ open, onClose, title, children, footer }: {
  open: boolean
  onClose?: () => void
  title?: ReactNode
  closeLabel?: string
  children?: ReactNode
  footer?: ReactNode
  contentClassName?: string
}) {
  useEffect(() => {
    if (!open || onClose === undefined) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown) }
  }, [open, onClose])
  if (!open) return null
  return (
    <div role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
      {typeof title === 'string' ? <h2>{title}</h2> : title}
      {children}
      {footer !== undefined && footer !== null ? <div data-modal-footer>{footer}</div> : null}
    </div>
  )
}

/**
 * MenuSurface contract double: a plain div forwarding ref and div props;
 * the real surface's portal backing has no test-visible behavior.
 */
export const MenuSurface = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function MenuSurface(props, ref) {
    return <div ref={ref} {...props} />
  },
)

/**
 * useAnchoredPosition contract double: jsdom cannot measure an anchor, so the
 * shim reports a stable origin position while open like the real hook would
 * after its first measured frame.
 */
export function useAnchoredPosition(options: {
  open: boolean
  anchorRef: RefObject<HTMLElement | null>
  panelRef: RefObject<HTMLElement | null>
  side?: string
  align?: string
  gap: number
  margin: number
}): CSSProperties | null {
  return options.open ? { top: 0, left: 0 } : null
}

/**
 * useDismissOnOutsidePointer contract double: same outside-pointerdown
 * close the real hook performs, counting the portaled panel as inside.
 */
export function useDismissOnOutsidePointer(
  root: RefObject<HTMLElement | null>,
  open: boolean,
  setOpen: (open: boolean) => void,
  portal?: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: Event) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (root.current?.contains(target) === true) return
      if (portal?.current?.contains(target) === true) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => { document.removeEventListener('pointerdown', onPointerDown) }
  }, [root, open, setOpen, portal])
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
