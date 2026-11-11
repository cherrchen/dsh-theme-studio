// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { useRef } from 'react'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

async function loadAdapter(exports: Record<string, unknown>) {
  vi.resetModules()
  // Absent names must be present-but-undefined: vitest mocks throw on missing
  // exports, while the 0.2.2-rc.2 bundle simply no longer publishes the hook.
  vi.doMock('@deepseek-ai/dsh-client-ui-primitives', () => ({
    useAnchoredPosition: undefined,
    ...exports,
  }))
  return import('../../src/compat/anchored-position.ts')
}

function Harness({ adapter, open }: {
  adapter: typeof import('../../src/compat/anchored-position.ts')
  open: boolean
}) {
  const anchorRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const position = adapter.useAnchoredPosition({ open, anchorRef, panelRef, side: 'bottom', gap: 4, margin: 8 })
  return (
    <div>
      <div ref={anchorRef} data-testid="anchor" />
      <div
        ref={panelRef}
        data-testid="panel"
        data-left={position?.left === undefined ? undefined : String(position.left)}
        data-top={position?.top === undefined ? undefined : String(position.top)}
      />
    </div>
  )
}

function stubGeometry() {
  const rect = {
    x: 100, y: 40, top: 40, bottom: 70, left: 100, right: 260, width: 160, height: 30,
    toJSON: () => ({}),
  } as DOMRect
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(rect)
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => 200 })
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 100 })
  return rect
}

describe('anchored-position compat adapter', () => {
  it('binds the host placement hook where the package still publishes it', async () => {
    const host = vi.fn(() => ({ left: 1, top: 2 }))
    const adapter = await loadAdapter({ useAnchoredPosition: host })
    expect(adapter.useAnchoredPosition).toBe(host)
  })

  it('places the panel below the anchor with the local copy on 0.2.2-rc.2 and later', async () => {
    stubGeometry()
    const adapter = await loadAdapter({})
    const view = render(<Harness adapter={adapter} open />)
    const panel = view.getByTestId('panel')
    expect(panel.getAttribute('data-left')).toBe('100')
    expect(panel.getAttribute('data-top')).toBe('74')
    expect(panel.style.getPropertyValue('--dsh-anchored-max-width')).toBe('1008px')
    expect(panel.style.getPropertyValue('--dsh-anchored-max-height')).toBe('752px')

    view.rerender(<Harness adapter={adapter} open={false} />)
    expect(panel.getAttribute('data-left')).toBeNull()
    expect(panel.getAttribute('data-top')).toBeNull()
    expect(panel.style.getPropertyValue('--dsh-anchored-max-width')).toBe('')
    expect(panel.style.getPropertyValue('--dsh-anchored-max-height')).toBe('')
  })

  it('clamps a host-supplied anchor rect inside the viewport margins', async () => {
    stubGeometry()
    const adapter = await loadAdapter({})
    function Supplied() {
      const anchorRef = useRef<HTMLDivElement>(null)
      const panelRef = useRef<HTMLDivElement>(null)
      const position = adapter.useAnchoredPosition({
        open: true,
        anchorRef,
        panelRef,
        side: 'bottom',
        gap: 4,
        margin: 8,
        getAnchorRect: () => ({
          x: 1000, y: 700, top: 700, bottom: 760, left: 1000, right: 1100, width: 100, height: 60,
          toJSON: () => ({}),
        }) as DOMRect,
      })
      return (
        <div>
          <div ref={anchorRef} />
          <div ref={panelRef} data-testid="panel" data-left={position?.left} data-top={position?.top} />
        </div>
      )
    }
    const view = render(<Supplied />)
    const panel = view.getByTestId('panel')
    // 1024-wide, 768-high jsdom viewport: keep a 200x100 panel inside the 8px margins.
    expect(panel.getAttribute('data-left')).toBe('816')
    expect(panel.getAttribute('data-top')).toBe('660')
  })
})
