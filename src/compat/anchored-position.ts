/**
 * Anchored placement for body-portaled panels.
 *
 * `useAnchoredPosition` was exported by `@deepseek-ai/dsh-client-ui-primitives`
 * through DSH 0.2.2-rc.1; 0.2.2-rc.2 moved its menus to CSS anchor
 * positioning and dropped the export with no replacement. Hosts that still
 * publish it keep their implementation; newer hosts get a local copy of the
 * removed hook so the color picker's placement and viewport clamping do not
 * depend on the installed release. Detection is by export presence, never by
 * version string.
 */

import { useLayoutEffect, useState, type RefObject } from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'

/** Inputs for {@link useAnchoredPosition}. */
export interface AnchoredPositionOptions {
  /** Whether the panel is mounted and should track its anchor. */
  open: boolean
  /** Element whose viewport rect anchors the panel. */
  anchorRef: RefObject<HTMLElement | null>
  /** Body-portaled, fixed-position panel; its ancestors must not establish a containing block. */
  panelRef: RefObject<HTMLElement | null>
  /** Preferred anchor edge; right-side panels align their top edges. */
  side?: 'top' | 'bottom' | 'right'
  /** Horizontal alignment for panels above or below the anchor. */
  align?: 'start' | 'end'
  /** Distance from the preferred anchor edge, in CSS pixels. */
  gap: number
  /** Minimum viewport inset; frame clearance can increase the top inset. */
  margin: number
  /** Reserve desktop frame clearance in addition to the margin; false keeps only the viewport margin. Defaults to true. */
  frameClearance?: boolean
  /** Host-supplied client rect; null hides the panel until the anchor is available. */
  getAnchorRect?: () => DOMRect | null
  /** Re-measure a committed content change before paint. */
  layoutKey?: string | number
  /** Minimum panel width follows the anchor, bounded by the visible viewport. */
  minWidthFromAnchor?: boolean
}

/** Fixed coordinates for one placed panel, or null while closed or awaiting an anchor. */
export interface AnchoredPosition {
  /** Fixed left edge in CSS pixels. */
  left: number
  /** Fixed top edge in CSS pixels. */
  top: number
}

/** The exported placement hook: fixed coordinates, or null while closed or awaiting an anchor. */
export type AnchoredPositionHook = (options: AnchoredPositionOptions) => AnchoredPosition | null

/**
 * Resolve the top margin an overlay keeps from the viewport edge.
 * Mirrors the host helper the removed hook used: while the anchor's top edge
 * is inside the viewport, the margin never exceeds `anchor.bottom + gap`.
 * @param min - the overlay's own viewport margin in px, used as the floor.
 * @param anchor - the overlay's anchor rect in viewport coordinates.
 * @param gap - the distance the overlay keeps below `anchor`.
 * @returns the frame clearance plus 20px, capped by a visible `anchor`, but never below `min`.
 */
function overlayTopMargin(min: number, anchor?: { readonly top: number; readonly bottom: number }, gap = 0): number {
  const root = document.documentElement
  const clearance = Number.parseFloat(getComputedStyle(root).getPropertyValue('--dsh-frame-top-clearance'))
  if (Number.isNaN(clearance)) return min
  const cap = anchor !== undefined && anchor.top >= 0 ? anchor.bottom + gap : Number.POSITIVE_INFINITY
  return Math.max(min, Math.min((root.hasAttribute('data-fullscreen') ? 0 : clearance) + 20, cap))
}

/**
 * Local copy of the hook 0.2.2-rc.2 removed. Keep a fixed panel aligned and
 * constrained to the visible viewport; panel CSS can consume
 * `--dsh-anchored-max-width` and `--dsh-anchored-max-height`, and the hook
 * restores those inline variables when placement stops.
 * @param options - Open state, element refs, placement, and optional host rect or content change key.
 * @returns fixed left/top coordinates, or null while closed or awaiting an anchor.
 */
function localUseAnchoredPosition(options: AnchoredPositionOptions): AnchoredPosition | null {
  const { open, anchorRef, panelRef, side = 'bottom', align = 'start', gap, margin,
    getAnchorRect, layoutKey, minWidthFromAnchor = false, frameClearance = true } = options
  const [position, setPosition] = useState<AnchoredPosition | null>(null)
  useLayoutEffect(() => {
    if (!open) {
      setPosition(null)
      return
    }
    const anchor = anchorRef.current
    const panel = panelRef.current
    if (anchor === null || panel === null) return
    const win = anchor.ownerDocument.defaultView
    if (win === null) return
    const viewport = win.visualViewport
    // WebKit client rects use the visual origin; viewport-fixed CSS uses the layout origin.
    const visualOrigin = typeof win.CSS !== 'undefined' && win.CSS.supports('-webkit-backdrop-filter', 'none')
    const properties = ['--dsh-anchored-max-width', '--dsh-anchored-max-height', ...minWidthFromAnchor ? ['min-width'] : []]
    const previous = properties.map(name => [name, panel.style.getPropertyValue(name), panel.style.getPropertyPriority(name)] as const)
    let active = true
    let lastRect: Pick<DOMRect, 'x' | 'y' | 'width' | 'height'> | null = null
    const readRect = () => getAnchorRect === undefined ? anchor.getBoundingClientRect() : getAnchorRect()
    const place = (rect: DOMRect | null): void => {
      lastRect = rect === null ? null : { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
      let next: AnchoredPosition | null = null
      if (rect !== null) {
        const x = viewport?.offsetLeft ?? 0
        const y = viewport?.offsetTop ?? 0
        const width = viewport?.width ?? (anchor.ownerDocument.documentElement.clientWidth || win.innerWidth)
        const height = viewport?.height ?? (anchor.ownerDocument.documentElement.clientHeight || win.innerHeight)
        const topMargin = frameClearance ? overlayTopMargin(margin, rect, gap) : margin
        const maxWidth = Math.max(0, width - margin * 2)
        panel.style.setProperty('--dsh-anchored-max-width', `${maxWidth}px`)
        panel.style.setProperty('--dsh-anchored-max-height', `${Math.max(0, height - topMargin - margin)}px`)
        if (minWidthFromAnchor) panel.style.minWidth = `${Math.min(rect.width, maxWidth)}px`
        const panelWidth = panel.offsetWidth
        const panelHeight = panel.offsetHeight
        const offsetX = visualOrigin ? x : 0
        const offsetY = visualOrigin ? y : 0
        const left = offsetX + (side === 'right' ? rect.right + gap : align === 'end' ? rect.right - panelWidth : rect.left)
        const top = offsetY + (side === 'right' ? rect.top : side === 'top' ? rect.top - gap - panelHeight : rect.bottom + gap)
        next = {
          left: Math.max(x + margin, Math.min(left, x + width - margin - panelWidth)),
          top: Math.max(y + topMargin, Math.min(top, y + height - margin - panelHeight)),
        }
      }
      setPosition(current => current?.left === next?.left && current?.top === next?.top ? current : next)
    }
    const update = (): void => {
      if (!active) return
      place(readRect())
    }
    update()
    win.addEventListener('scroll', update, true)
    win.addEventListener('resize', update)
    viewport?.addEventListener('scroll', update)
    viewport?.addEventListener('resize', update)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(anchor)
    observer?.observe(panel)
    // Transforms and surrounding layout can move an anchor without resizing either element.
    let frame = 0
    const track = (): void => {
      if (!active) return
      const rect = readRect()
      if (rect?.x !== lastRect?.x || rect?.y !== lastRect?.y
        || rect?.width !== lastRect?.width || rect?.height !== lastRect?.height) place(rect)
      frame = win.requestAnimationFrame(track)
    }
    frame = win.requestAnimationFrame(track)
    return () => {
      active = false
      win.cancelAnimationFrame(frame)
      observer?.disconnect()
      win.removeEventListener('scroll', update, true)
      win.removeEventListener('resize', update)
      viewport?.removeEventListener('scroll', update)
      viewport?.removeEventListener('resize', update)
      for (const [name, value, priority] of previous) panel.style.setProperty(name, value, priority)
    }
  }, [open, anchorRef, panelRef, side, align, gap, margin, getAnchorRect, layoutKey, minWidthFromAnchor, frameClearance])
  return position
}

/** Read the host export without naming a member a newer bundle dropped. */
const host: unknown = primitives
const candidate = (host as Record<string, unknown>)['useAnchoredPosition']

/**
 * Host placement where the running primitives still publish it, and the local
 * copy where they do not (0.2.2-rc.2 and later). Older and newer hosts keep
 * the same contract for callers.
 */
export const useAnchoredPosition: AnchoredPositionHook =
  typeof candidate === 'function' ? candidate as AnchoredPositionHook : localUseAnchoredPosition
